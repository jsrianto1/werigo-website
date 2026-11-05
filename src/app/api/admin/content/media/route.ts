import { NextResponse } from "next/server";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { contentAdmin, sameOrigin, boundedBody } from "@/lib/cmsAccess";
import { isResponse, storageFailed } from "@/lib/adminApi";
import { cmsReady } from "@/lib/cms";
import { query } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const admin = await contentAdmin(); if (isResponse(admin)) return admin;
  if (!/^image\/(jpeg|png|webp|avif)$/.test(req.headers.get("content-type") || "")) return NextResponse.json({ ok: false, error: "invalid_image", message: "Upload a JPG, PNG, WebP or AVIF image." }, { status: 415 });
  try {
    if (!await cmsReady()) return NextResponse.json({ ok: false, error: "setup_required" }, { status: 503 });
    const input = await boundedBody(req, 5 * 1024 * 1024);
    let output;
    try {
      const source = sharp(input, { limitInputPixels: 20000000, animated: false });
      const meta = await source.metadata();
      if (!meta.format || !["jpeg", "png", "webp", "avif", "heif"].includes(meta.format) || (meta.pages ?? 1) > 1) throw new Error("Unsupported image");
      output = await source.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    } catch { return NextResponse.json({ ok: false, error: "invalid_image", message: "This file could not be read as a supported image. Use a still image up to 20 megapixels." }, { status: 422 }); }
    let filename = req.headers.get("x-file-name") || "Werigo image";
    try { filename = decodeURIComponent(filename); } catch { /* Keep the original label. */ }
    const name = filename.replace(/[\x00-\x1f\\/]/g, " ").slice(0,160);
    const result = await query("insert into werigo_cms_media(name,body,mime,width,height,sha256,created_by) values($1,$2,'image/webp',$3,$4,$5,$6) returning id", [name,output.data,output.info.width,output.info.height,createHash("sha256").update(output.data).digest("hex"),admin.email]);
    const id = result.rows[0].id;
    await logAudit({ actor: admin, action: "content.upload_image", entityType: "content_media", entityId: id, meta: { width: output.info.width, height: output.info.height }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, image: { src: `/api/media/${id}`, name } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof RangeError) return NextResponse.json({ ok: false, error: "too_large", message: "Choose an image smaller than 5 MB." }, { status: 413 });
    return storageFailed("cms_image", err);
  }
}
