// Real CMS rules, routes and SQL against isolated PostgreSQL/WASM. Never loads an env file.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { registerHooks, createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";

const require = createRequire(import.meta.url);
const db = new PGlite();
const state = globalThis.__cmsTest = { admin: null, configured: true, fail: false, invalidations: [], audits: [] };
state.query = (sql, params = []) => {
  if (state.fail) throw new Error("Simulated unavailable storage");
  return sql.includes(";") && !params.length ? db.exec(sql).then(r => r.at(-1)) : db.query(sql, params);
};
state.transaction = fn => db.transaction(tx => fn({ query: (sql, params = []) => sql.includes(";") && !params.length ? tx.exec(sql).then(r => r.at(-1)) : tx.query(sql, params) }));
const virtual = source => "data:text/javascript," + encodeURIComponent(source);
const mocks = {
  "server-only": "export {};",
  "@/lib/db": "const s=globalThis.__cmsTest;export const isDatabaseConfigured=()=>s.configured;export const query=(...a)=>s.query(...a);export const withTransaction=(f)=>s.transaction(f);",
  "@/lib/adminAuth": "export const getAdmin=async()=>globalThis.__cmsTest.admin;",
  "@/lib/audit": "export const logAudit=async(e)=>{globalThis.__cmsTest.audits.push(e)};export const requestIp=()=>null;",
  "next/cache": "export const unstable_cache=(fn)=>fn;export const revalidateTag=(...a)=>globalThis.__cmsTest.invalidations.push(a);export const revalidatePath=(...a)=>globalThis.__cmsTest.invalidations.push(a);",
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: virtual(mocks[specifier]), shortCircuit: true };
    if (specifier === "next/server") return next(pathToFileURL(require.resolve("next/server.js")).href, context);
    if (specifier.startsWith("@/")) {
      let file = resolve("src", specifier.slice(2));
      if (!extname(file)) file += ".ts";
      return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && url.endsWith(".ts") && fileURLToPath(url).startsWith(resolve("src"))) {
      return { format: "module", source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    }
    if (url.startsWith("file:") && url.endsWith(".json") && fileURLToPath(url).startsWith(resolve("src"))) {
      return { format: "module", source: "export default " + readFileSync(fileURLToPath(url), "utf8"), shortCircuit: true };
    }
    return next(url, context);
  },
});
const { cmsDefaults } = await import("../src/data/cmsDefaults.ts");
const { parseContent, mediaPathSchema, safeHttps } = await import("../src/lib/cmsRules.ts");
const cms = await import("../src/lib/cms.ts");
const access = await import("../src/lib/cmsAccess.ts");
const api = await import("../src/app/api/admin/content/route.ts");
const setup = await import("../src/app/api/admin/content/setup/route.ts");
const upload = await import("../src/app/api/admin/content/media/route.ts");
const media = await import("../src/app/api/media/[id]/route.ts");
const { CMS_SQL } = await import("../src/lib/cmsSchema.ts");
const admin = { id: "cms-admin", email: "editor@example.test", name: "Test editor", role: "admin", mustChangePassword: false };
const origin = "https://werigo.co";
const request = (body, headers = {}) => new Request(origin + "/api/admin/content", { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const command = (key, payload, version = 0, action = "draft") => ({ key, payload, version, action });
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(a, b, message) { assert.deepEqual(a, b, message); checks++; }
async function status(response, expected, message) { equal((await response).status, expected, message); }
function invalid(fn) { assert.throws(fn); checks++; }
const clone = value => structuredClone(value);

try {
  const proxyRequest = value => new Request("http://127.0.0.1:3000/api/admin/content/setup", { headers: value ? { origin: value } : {} });
  equal(access.sameOrigin(proxyRequest(origin)), true, "Public HTTPS origin survives reverse-proxy HTTP transport");
  equal(access.sameOrigin(proxyRequest("https://wrong-origin.example")), false);
  equal(access.sameOrigin(proxyRequest("null")), false);
  equal(access.sameOrigin(proxyRequest("http://werigo.co")), false);
  equal(access.sameOrigin(proxyRequest()), false);
  equal(access.sameOrigin(new Request("https://wrong-origin.example/api", { headers: { origin: "https://wrong-origin.example", "x-forwarded-host": "werigo.co" } })), false, "Request URL and forwarded host cannot authorize an untrusted origin");
  equal(CMS_SQL, readFileSync("db/migrations/0015_content_management.sql", "utf8").replace(/\r\n/g, "\n"));
  parseContent("home", cmsDefaults.home, true); parseContent("places", cmsDefaults.places, true); checks += 2;
  for (const place of cmsDefaults.places.items) ok(existsSync(resolve("public", "." + place.image)), "Seed photo exists: " + place.id);
  for (const url of ["javascript:alert(1)", "//evil.example", "http://example.test", "https://user:pass@example.test", "https://localhost/test"]) equal(safeHttps(url), false);
  for (const path of ["/media/../secret.png", "//evil.example/a.png", "/api/media/not-a-uuid", "/media/a.svg"]) equal(mediaPathSchema.safeParse(path).success, false);
  const empty = clone(cmsDefaults.places); empty.items[0].image = "";
  parseContent("places", empty); checks++;
  invalid(() => parseContent("places", empty, true));
  empty.items[0].enabled = false; parseContent("places", empty, true); checks++;
  const duplicate = clone(cmsDefaults.places); duplicate.items.push(duplicate.items[0]); invalid(() => parseContent("places", duplicate));
  const malformed = clone(cmsDefaults.home); malformed.copy.unknown = { en: "no", id: "", ru: "" }; invalid(() => parseContent("home", malformed));
  equal(await cms.cmsReady(), false);
  equal(await cms.publishedContent("home"), cmsDefaults.home, "No table uses approved content");
  await status(api.GET(), 401, "Public cannot read drafts");
  await status(api.POST(request(command("home", cmsDefaults.home))), 401);
  state.admin = { ...admin, mustChangePassword: true };
  await status(api.GET(), 403, "Temporary password cannot access CMS");
  state.admin = admin;
  await status(setup.POST(request({})), 403, "Activation is super-admin only");
  await status(api.POST(request({}, { origin: "https://evil.example" })), 403, "Cross-origin mutation rejected");
  await status(api.POST(request({}, { origin: "" })), 403, "Missing origin rejected");
  await status(api.POST(request({}, { "content-type": "text/plain" })), 415);
  await status(api.POST(request({ value: "x".repeat(350001) })), 413);
  await assert.rejects(access.boundedBody(new Request(origin, { method: "POST", body: "x".repeat(100), duplex: "half" }), 20), RangeError); checks++;
  state.admin = { ...admin, role: "super_admin" };
  await db.exec("create table schema_migrations(name text primary key,checksum text)");
  await status(setup.POST(request({})), 503, "Failure after creating tables rolls back setup");
  equal(await cms.cmsReady(), false, "Failed activation leaves no CMS tables");
  equal((await db.query("select count(*)::int as n from schema_migrations")).rows[0].n, 0);
  await db.exec("create table audit_log(actor_id text,actor_email text,actor_role text,action text,entity_type text)");
  await status(setup.POST(request({})), 200);
  await status(setup.POST(request({})), 200, "Activation is idempotent");
  equal((await db.query("select count(*)::int as n from audit_log")).rows[0].n, 1);
  equal(await cms.cmsReady(), true);
  const schemaBefore = await db.query("select tablename from pg_tables where schemaname='public' order by tablename");
  await db.query("update schema_migrations set checksum='bad'");
  await status(setup.POST(request({})), 503, "Checksum conflict fails safely");
  equal(await db.query("select tablename from pg_tables where schemaname='public' order by tablename"), schemaBefore);
  await db.query("update schema_migrations set checksum=$1", [(await import("node:crypto")).createHash("sha256").update(CMS_SQL).digest("hex").slice(0,16)]);
  state.admin = admin;
  let response = await api.GET();
  equal(response.headers.get("cache-control"), "private, no-store");
  equal((await response.json()).documents[0].version, 0);
  const home = clone(cmsDefaults.home); home.copy.heroTitle1.en = "Ride your own Bali.";
  response = await api.POST(request(command("home", home)));
  equal(response.status, 200);
  let document = (await response.json()).document;
  equal(document.version, 1); equal(document.published, null);
  equal(await cms.publishedContent("home"), cmsDefaults.home, "Saving a draft does not publish");
  equal(await cms.cmsPublicationDate("home"), null);
  await status(api.POST(request(command("home", home, 0))), 409, "Stale editor cannot overwrite");
  response = await api.POST(request(command("home", home, 1, "publish")));
  equal(response.status, 200);
  document = (await response.json()).document;
  equal(document.version, 2);
  equal((await cms.publishedContent("home")).copy.heroTitle1.en, home.copy.heroTitle1.en);
  ok(await cms.cmsPublicationDate("home"));
  ok(state.invalidations.some(args => args[0] === "werigo-cms"));
  const originalPublishedAt = document.publishedAt;
  home.copy.heroTitle1.en = "Unpublished next version";
  await status(api.POST(request(command("home", home, 2))), 200);
  equal((await cms.publishedContent("home")).copy.heroTitle1.en, "Ride your own Bali.");
  equal(await cms.cmsPublicationDate("home"), originalPublishedAt, "Drafts do not change sitemap dates");
  const revisions = await cms.cmsRevisions("home");
  equal(revisions.map(r => r.version), [3,2,1]);
  const restored = await cms.restoreContent("home", revisions.at(-1).id, 3, admin.email);
  equal(restored.version, 4); equal(restored.draft.copy.heroTitle1.en, "Ride your own Bali.");
  equal(restored.publishedAt, originalPublishedAt, "Restore is draft-only");
  await assert.rejects(cms.restoreContent("places", revisions[0].id, 0, admin.email), cms.ContentConflict); checks++;
  const badImage = clone(cmsDefaults.places); badImage.items[0].image = "/media/missing-file.webp";
  await status(api.POST(request(command("places", badImage))), 422);
  await status(upload.POST(new Request(origin + "/api/admin/content/media", { method: "POST", headers: { origin, "content-type": "image/svg+xml" }, body: "<svg/>" })), 415);
  const imageRequest = (body, mime = "image/png") => new Request(origin + "/api/admin/content/media", { method: "POST", headers: { origin, "content-type": mime, "x-file-name": "Bali%20photo.png" }, body });
  await status(upload.POST(imageRequest(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>"))), 422, "Spoofed image rejected by actual decoder");
  await status(upload.POST(imageRequest(Buffer.alloc(5 * 1024 * 1024 + 1))), 413);
  const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#007d70" } }).png().withMetadata().toBuffer();
  response = await upload.POST(imageRequest(png));
  equal(response.status, 201);
  const image = (await response.json()).image;
  equal(image.name, "Bali photo.png");
  const id = image.src.split("/").at(-1);
  const stored = (await db.query("select * from werigo_cms_media where id=$1", [id])).rows[0];
  equal(stored.public, false); equal(stored.width, 2000); equal(stored.height, 1000);
  const meta = await sharp(stored.body).metadata();
  equal(meta.format, "webp"); equal(meta.exif, undefined);
  const context = { params: Promise.resolve({ id }) };
  state.admin = null;
  await status(media.GET(new Request(origin + image.src), context), 404, "Draft images are private");
  state.admin = admin;
  response = await media.GET(new Request(origin + image.src), context);
  equal(response.status, 200); equal(response.headers.get("cache-control"), "private, no-store");
  const places = clone(cmsDefaults.places); places.items[0].image = image.src;
  await cms.writeContent("places", places, 0, "draft", admin.email);
  equal((await db.query("select public from werigo_cms_media where id=$1", [id])).rows[0].public, false);
  await assert.rejects(cms.restoreContent("places", revisions[0].id, 1, admin.email), cms.ContentMissing, "Cannot restore another document's revision"); checks++;
  const missing = clone(places); missing.items[0].image = "/api/media/" + randomUUID();
  await assert.rejects(cms.writeContent("places", missing, 1, "draft", admin.email), cms.ContentMissing); checks++;
  equal((await cms.getContentDocument("places")).version, 1, "Failed write rolled back");
  await cms.writeContent("places", places, 1, "publish", admin.email);
  state.admin = null;
  response = await media.GET(new Request(origin + image.src), context);
  equal(response.status, 200); ok(response.headers.get("cache-control").includes("immutable"));
  await status(media.GET(new Request(origin + image.src, { headers: { "if-none-match": response.headers.get("etag") } }), context), 304);
  await status(media.GET(new Request(origin + "/api/media/no"), { params: Promise.resolve({ id: "bad" }) }), 404);
  const sqlText = clone(home); sqlText.copy.heroTitle1.en = "'; drop table werigo_cms_documents; --";
  await cms.writeContent("home", sqlText, 4, "draft", admin.email);
  equal((await cms.getContentDocument("home")).draft.copy.heroTitle1.en, sqlText.copy.heroTitle1.en, "Content is parameterized, not executable SQL");
  const competing = await Promise.allSettled([
    cms.writeContent("home", sqlText, 5, "draft", admin.email),
    cms.writeContent("home", home, 5, "draft", "second-editor@example.test"),
  ]);
  equal(competing.filter(r => r.status === "fulfilled").length, 1, "Only one competing editor can save");
  ok(competing.some(r => r.status === "rejected" && r.reason instanceof cms.ContentConflict));
  state.fail = true; equal(await cms.publishedContent("home"), cmsDefaults.home, "Outage keeps a populated website"); state.fail = false;
  state.configured = false; equal(await cms.publishedContent("home"), cmsDefaults.home);
  console.log("CMS PostgreSQL, route, authorization, upload and validation checks passed: " + checks);
} finally {
  await db.close();
  delete globalThis.__cmsTest;
}
