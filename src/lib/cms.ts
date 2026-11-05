import "server-only";
import { unstable_cache } from "next/cache";
import { isDatabaseConfigured, query, withTransaction } from "@/lib/db";
import { cmsDefaults } from "@/data/cmsDefaults";
import { parseContent, contentMediaIds, type CmsDocument, type CmsRevision, type ContentKey, type ContentPayloads } from "@/lib/cmsRules";

type Row = Record<string, unknown>;
const iso = (v: unknown) => v ? new Date(String(v)).toISOString() : null;
export class ContentConflict extends Error {}
export class ContentMissing extends Error {}
export async function cmsReady() {
  if (!isDatabaseConfigured()) return false;
  return Boolean((await query("select to_regclass('public.werigo_cms_documents') is not null and to_regclass('public.werigo_cms_media') is not null as ready")).rows[0]?.ready);
}
function fromRow<K extends ContentKey>(key: K, row?: Row): CmsDocument<K> {
  return { key, draft: row ? parseContent(key, row.draft) : structuredClone(cmsDefaults[key]),
    published: row?.published ? parseContent(key, row.published, true) : null, version: row ? Number(row.version) : 0,
    updatedAt: iso(row?.updated_at), publishedAt: iso(row?.published_at), updatedBy: row ? String(row.updated_by) : null };
}
export async function getContentDocument<K extends ContentKey>(key: K) {
  const result = await query("select * from werigo_cms_documents where key=$1", [key]);
  return fromRow(key, result.rows[0]);
}
/** Published snapshots only. A database outage never replaces the approved fallback with a blank page. */
const cachedPublished = unstable_cache(async (key: ContentKey) => {
  try {
    if (!await cmsReady()) return null;
    const result = await query("select published, published_at from werigo_cms_documents where key=$1", [key]);
    const row = result.rows[0];
    return row?.published ? { payload: parseContent(key, row.published, true), publishedAt: iso(row.published_at) } : null;
  } catch { return null; }
}, ["werigo-editorial-v1"], { revalidate: 60, tags: ["werigo-cms"] });
export async function publishedContent<K extends ContentKey>(key: K): Promise<ContentPayloads[K]> {
  if (!isDatabaseConfigured()) return structuredClone(cmsDefaults[key]);
  return (await cachedPublished(key))?.payload as ContentPayloads[K] ?? structuredClone(cmsDefaults[key]);
}
export async function cmsPublicationDate(key: ContentKey) {
  if (!isDatabaseConfigured()) return null;
  return (await cachedPublished(key))?.publishedAt ?? null;
}
export async function cmsRevisions(key: ContentKey): Promise<CmsRevision[]> {
  const result = await query("select id,document_key,version,event,actor,created_at from werigo_cms_revisions where document_key=$1 order by version desc limit 30", [key]);
  return result.rows.map(r => ({ id: String(r.id), key: r.document_key as ContentKey, version: Number(r.version), event: String(r.event), actor: String(r.actor), createdAt: iso(r.created_at)! }));
}
export async function writeContent<K extends ContentKey>(key: K, input: unknown, version: number, event: "draft" | "publish", actor: string) {
  const payload = parseContent(key, input, event === "publish");
  return withTransaction(async client => {
    const existing = await client.query("select * from werigo_cms_documents where key=$1 for update", [key]);
    const row = existing.rows[0];
    if ((row ? Number(row.version) : 0) !== version) throw new ContentConflict();
    const ids = contentMediaIds(payload);
    if (ids.length) {
      const media = await client.query("select id from werigo_cms_media where id=any($1::uuid[])", [ids]);
      if (media.rows.length !== ids.length) throw new ContentMissing("A selected image no longer exists.");
    }
    const serialized = JSON.stringify(payload);
    let result;
    if (!row) {
      result = await client.query(`insert into werigo_cms_documents(key,draft,published,version,updated_by,published_at)
        values($1,$2::jsonb,case when $3 then $2::jsonb end,1,$4,case when $3 then now() end)
        on conflict(key) do nothing returning *`, [key, serialized, event === "publish", actor]);
      if (!result.rows[0]) throw new ContentConflict();
    } else {
      result = await client.query(`update werigo_cms_documents set draft=$2::jsonb,
        published=case when $3 then $2::jsonb else published end,
        published_at=case when $3 then now() else published_at end,
        version=version+1,updated_by=$4,updated_at=now() where key=$1 returning *`, [key, serialized, event === "publish", actor]);
    }
    const current = result.rows[0];
    if (event === "publish" && ids.length) await client.query("update werigo_cms_media set public=true where id=any($1::uuid[])", [ids]);
    await client.query("insert into werigo_cms_revisions(document_key,version,event,payload,actor) values($1,$2,$3,$4::jsonb,$5)", [key, current.version, event, serialized, actor]);
    return fromRow(key, current);
  });
}
export async function restoreContent(key: ContentKey, revisionId: string, version: number, actor: string) {
  return withTransaction(async client => {
    const result = await client.query("select * from werigo_cms_documents where key=$1 for update", [key]);
    const row = result.rows[0];
    if (!row || Number(row.version) !== version) throw new ContentConflict();
    const revision = await client.query("select payload from werigo_cms_revisions where id=$1 and document_key=$2", [revisionId, key]);
    if (!revision.rows[0]) throw new ContentMissing();
    const payload = JSON.stringify(parseContent(key, revision.rows[0].payload));
    const saved = await client.query("update werigo_cms_documents set draft=$2::jsonb,version=version+1,updated_by=$3,updated_at=now() where key=$1 returning *", [key, payload, actor]);
    await client.query("insert into werigo_cms_revisions(document_key,version,event,payload,actor) values($1,$2,'restore',$3::jsonb,$4)", [key, saved.rows[0].version, payload, actor]);
    return fromRow(key, saved.rows[0]);
  });
}
