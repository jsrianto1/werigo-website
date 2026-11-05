import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { contentAdmin, sameOrigin, boundedBody } from "@/lib/cmsAccess";
import { isResponse, storageFailed } from "@/lib/adminApi";
import { cmsReady, getContentDocument, cmsRevisions, writeContent, restoreContent, ContentConflict, ContentMissing } from "@/lib/cms";
import { contentKeys, parseContent } from "@/lib/cmsRules";
import { query } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const commandSchema = z.object({ key: z.enum(contentKeys), action: z.enum(["draft", "publish", "restore"]), version: z.number().int().min(0), payload: z.unknown().optional(), revisionId: z.string().uuid().optional() }).strict();
export async function GET() {
  const admin = await contentAdmin(); if (isResponse(admin)) return admin;
  try {
    const ready = await cmsReady();
    const documents = ready ? await Promise.all(contentKeys.map(async key => ({ ...await getContentDocument(key), revisions: await cmsRevisions(key) }))) : [];
    const images: { src: string; name: string }[] = [];
    for (const directory of ["media", "app", "brand"]) {
      const files = await readdir(path.join(process.cwd(), "public", directory), { recursive: true }).catch(() => [] as string[]);
      for (const f of files) {
        const src = `/${directory}/${f.replaceAll("\\", "/")}`;
        if (/^\/(media|app|brand)\/[a-zA-Z0-9_/-]+\.(webp|png|jpe?g|avif)$/.test(src)) images.push({ src, name: f });
      }
    }
    if (ready) {
      const uploaded = await query("select id,name from werigo_cms_media order by created_at desc limit 200");
      images.unshift(...uploaded.rows.map(row => ({ src: `/api/media/${row.id}`, name: String(row.name) })));
    }
    return NextResponse.json({ ok: true, ready, documents, images }, { headers: noStore });
  } catch (err) { return storageFailed("cms_read", err); }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const admin = await contentAdmin(); if (isResponse(admin)) return admin;
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 415 });
  try {
    const bytes = await boundedBody(req, 350000);
    let raw; try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }
    const command = commandSchema.parse(raw);
    if (!await cmsReady()) return NextResponse.json({ ok: false, error: "setup_required", message: "Ask a super admin to activate CMS storage." }, { status: 503 });
    if (command.action !== "restore") {
      const payload = parseContent(command.key, command.payload, command.action === "publish");
      if (command.key === "places") {
        const places = parseContent("places", payload);
        for (const place of places.items) {
          if (place.image && !place.image.startsWith("/api/media/") && !await stat(path.join(process.cwd(), "public", place.image)).then(f => f.isFile()).catch(() => false)) {
            return NextResponse.json({ ok: false, error: "validation", message: `Choose an existing image for ${place.name}.` }, { status: 422 });
          }
        }
      }
    }
    if (command.action === "restore" && !command.revisionId) return NextResponse.json({ ok: false, error: "validation", message: "Choose a revision to restore." }, { status: 422 });
    const document = command.action === "restore"
      ? await restoreContent(command.key, command.revisionId!, command.version, admin.email)
      : await writeContent(command.key, command.payload, command.version, command.action, admin.email);
    await logAudit({ actor: admin, action: `content.${command.action}`, entityType: "content", entityId: command.key, meta: { version: document.version }, ip: requestIp(req) });
    if (command.action === "publish") {
      revalidateTag("werigo-cms", { expire: 0 });
      for (const url of ["/", "/app/explore", "/app/cafes", "/app/stays", "/app/wellness", "/app/shop", "/page-sitemap.xml", "/image-sitemap.xml"]) revalidatePath(url);
    }
    return NextResponse.json({ ok: true, document, revisions: await cmsRevisions(command.key) }, { headers: noStore });
  } catch (err) {
    if (err instanceof RangeError) return NextResponse.json({ ok: false, error: "too_large", message: "Content is too large." }, { status: 413 });
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: "validation", message: err.issues[0]?.message, issues: err.issues.map(e => ({ path: e.path.join("."), message: e.message })) }, { status: 422 });
    if (err instanceof ContentConflict) return NextResponse.json({ ok: false, error: "conflict", message: "Another editor saved changes. Reload the current version before saving. Your unsaved text is still here." }, { status: 409 });
    if (err instanceof ContentMissing) return NextResponse.json({ ok: false, error: "missing", message: err.message || "The requested revision or image was not found." }, { status: 422 });
    return storageFailed("cms_write", err);
  }
}
