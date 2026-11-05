import "server-only";
import { query, withTransaction, isDatabaseConfigured } from "@/lib/db";
import { parseArticle, articleCanonical, type Article, type ArticleInput, type ArticleRevision } from "@/lib/articleRules";
import { contentMediaIds } from "@/lib/cmsRules";
import { ContentConflict, ContentMissing } from "@/lib/cms";
import type { SitemapEntry } from "@/lib/sitemap-content";
type Row = Record<string, unknown>;
const iso = (v: unknown) => v ? new Date(String(v)).toISOString() : null;
export function articleFromRow(r: Row, publicOnly = false): Article {
  return { ...parseArticle(publicOnly ? r.published : r.draft, publicOnly), id: String(r.id), version: Number(r.version),
    createdAt: iso(r.created_at)!, updatedAt: publicOnly ? new Date(Math.max(Date.parse(iso(r.published_at)!),Date.parse(iso(r.visible_from)!))).toISOString() : iso(r.updated_at)!,
    firstPublishedAt: iso(r.first_published_at), publishedAt: iso(r.published_at), visibleAt:iso(r.visible_from),hasPublished: Boolean(r.published) };
}
export async function articlesReady() {
  if (!isDatabaseConfigured()) return false;
  return Boolean((await query("select to_regclass('public.werigo_articles') is not null and to_regclass('public.werigo_article_revisions') is not null as ready")).rows[0]?.ready);
}
export async function listArticles(publicOnly = true): Promise<Article[]> {
  if (!await articlesReady()) return [];
  const result = await query(`select * from werigo_articles ${publicOnly ? "where published is not null and visible_from <= now() order by (published->>'featured')::boolean desc,visible_from desc" : "order by updated_at desc"} limit 200`);
  return result.rows.map(r => articleFromRow(r, publicOnly));
}
export async function getArticle(slug: string): Promise<Article | null> {
  if (!await articlesReady()) return null;
  const result = await query("select * from werigo_articles where slug=$1 and published is not null and visible_from <= now()", [slug]);
  return result.rows[0] ? articleFromRow(result.rows[0], true) : null;
}
export async function getArticleDraft(id: string): Promise<Article | null> {
  if (!await articlesReady()) return null;
  const result = await query("select * from werigo_articles where id=$1", [id]);
  return result.rows[0] ? articleFromRow(result.rows[0]) : null;
}
export async function articleRevisions(id: string): Promise<ArticleRevision[]> {
  const result = await query("select id,version,event,actor,created_at from werigo_article_revisions where article_id=$1 order by version desc limit 30", [id]);
  return result.rows.map(r => ({ id: String(r.id), version: Number(r.version), event: String(r.event), actor: String(r.actor), createdAt: iso(r.created_at)! }));
}
export async function writeArticle(id: string | null, value: unknown, version: number, action: "draft" | "publish" | "unpublish" | "restore", actor: string, revisionId?: string): Promise<Article> {
  return withTransaction(async client => {
    const row = id ? (await client.query("select * from werigo_articles where id=$1 for update", [id])).rows[0] : null;
    if ((id && !row) || Number(row?.version ?? 0) !== version) throw new ContentConflict();
    if (!row && (action === "restore" || action === "unpublish")) throw new ContentMissing();
    if (action === "restore") {
      const revision = await client.query("select payload from werigo_article_revisions where id=$1 and article_id=$2", [revisionId, id]);
      if (!revision.rows[0]) throw new ContentMissing();
      value = revision.rows[0].payload;
    }
    const payload: ArticleInput = parseArticle(action === "unpublish" ? row!.draft : value, action === "publish");
    if (row?.first_published_at && payload.slug !== row.slug) throw new ContentConflict("Published article URLs stay fixed.");
    const ids = contentMediaIds(payload);
    if (ids.length && (await client.query("select id from werigo_cms_media where id=any($1::uuid[])", [ids])).rows.length !== ids.length) throw new ContentMissing("Choose an existing image.");
    const json = JSON.stringify(payload);
    const result = row ? await client.query(`update werigo_articles set slug=$2,draft=$3::jsonb,
      published=case when $4='publish' then $3::jsonb when $4='unpublish' then null else published end,
      published_at=case when $4='publish' then now() when $4='unpublish' then null else published_at end,
      visible_from=case when $4='publish' then coalesce(nullif($6,'')::timestamptz,now()) when $4='unpublish' then null else visible_from end,
      first_published_at=case when $4='publish' then coalesce(first_published_at,now()) else first_published_at end,
      version=version+1,updated_at=now(),updated_by=$5 where id=$1 returning *`, [id,payload.slug,json,action,actor,payload.publishDate])
      : await client.query(`insert into werigo_articles(slug,draft,published,published_at,first_published_at,updated_by,visible_from)
        values($1,$2::jsonb,case when $3 then $2::jsonb end,case when $3 then now() end,case when $3 then now() end,$4,case when $3 then coalesce(nullif($5,'')::timestamptz,now()) end) returning *`, [payload.slug,json,action==="publish",actor,payload.publishDate]);
    const current = result.rows[0];
    if (action === "publish" && ids.length) await client.query("update werigo_cms_media set public=true where id=any($1::uuid[])", [ids]);
    await client.query("insert into werigo_article_revisions(article_id,version,event,payload,actor) values($1,$2,$3,$4::jsonb,$5)", [current.id,current.version,action,json,actor]);
    return articleFromRow(current);
  });
}
export async function articleSitemapEntries(): Promise<SitemapEntry[]> {
  const articles = (await listArticles()).filter(a => !a.noindex);
  if (!articles.length) return [];
  const modified = articles.map(a => a.updatedAt).sort().at(-1)!;
  return [{url:"https://werigo.co/guides",group:"page",lastModified:modified,images:[]},
    ...articles.map(a => ({url:articleCanonical(a),group:"page" as const,lastModified:a.updatedAt,images:[`https://werigo.co${a.image}`]}))];
}
