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
      if (!extname(file)) file += existsSync(file+".ts") ? ".ts" : ".tsx";
      return next(pathToFileURL(file).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url) && fileURLToPath(url).startsWith(resolve("src"))) {
      return { format: "module", source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    }
    if (url.startsWith("file:") && url.endsWith(".json") && fileURLToPath(url).startsWith(resolve("src"))) {
      return { format: "module", source: "export default " + readFileSync(fileURLToPath(url), "utf8"), shortCircuit: true };
    }
    return next(url, context);
  },
});
const { CMS_SQL }=await import("../src/lib/cmsSchema.ts");
const { ARTICLES_SQL }=await import("../src/lib/articleSchema.ts");
const { newArticle,parseArticle,articleSearchTitle }=await import("../src/lib/articleRules.ts");
const { parseRichBody }=await import("../src/lib/articleRichText.ts");
const { articleHealth }=await import("../src/lib/articleHealth.ts");
const service=await import("../src/lib/articles.ts");
const api=await import("../src/app/api/admin/articles/route.ts");
const setup=await import("../src/app/api/admin/articles/setup/route.ts");
const { ContentConflict,ContentMissing }=await import("../src/lib/cms.ts");
const { ArticleBody }=await import("../src/components/articles/ArticleBody.tsx");
const React=await import("react");const {renderToStaticMarkup}=await import("react-dom/server");
const origin="https://werigo.co";const admin={id:"article-editor",email:"editor@example.test",name:"Editor",role:"admin",mustChangePassword:false};
let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const ok=(a,message)=>{assert.ok(a,message);checks++;};
equal(articleSearchTitle("Bali rental"),"Bali rental | Werigo","Search title adds the brand once");
equal(articleSearchTitle("Bali rental | Werigo"),"Bali rental | Werigo","A supplied brand is not duplicated");
const invalid=fn=>{assert.throws(fn);checks++;};
const status=async(r,n,message)=>equal((await r).status,n,message);
const request=(value,headers={})=>new Request(origin+"/api/admin/articles",{method:"POST",headers:{origin,"content-type":"application/json",...headers},body:JSON.stringify(value)});
const cmd=(id,payload,version=0,action="draft")=>({id,payload,version,action});
const para=text=>({type:"paragraph",content:[{type:"text",text}]});
const doc=content=>JSON.stringify({type:"doc",content});
const goodBody=doc([
  para("Werigo helps visitors plan an electric motorcycle rental in Bali. Compare the Wedison models, choose rental dates and check charging arrangements before booking. This guide explains the practical steps so you can prepare for your visit with clear information."),
  {type:"heading",attrs:{level:2},content:[{type:"text",text:"How do I choose my Bali rental?"}]},
  para(("Compare the motorcycle models and think about your route in Bali. Check your accommodation and charging arrangements with Werigo before booking. ").repeat(12)),
  {type:"heading",attrs:{level:2},content:[{type:"text",text:"Prepare before you ride"}]},
  {type:"bulletList",content:[{type:"listItem",content:[para("Choose your rental dates and confirm the handover.") ]},{type:"listItem",content:[para("Ask about charging and request 0 to 2 helmets.")]}]},
  {type:"paragraph",content:[{type:"text",text:"Compare our fleet",marks:[{type:"link",attrs:{href:"/fleet"}}]}]},
]);
const draft={...structuredClone(newArticle),title:"Bali rental planning",h1:"Bali rental planning with Werigo",slug:"bali-rental-planning"};
const publish={...draft,body:goodBody,excerpt:"Plan your Bali rental with clear steps for choosing a Wedison, checking your dates and preparing to charge.",metaTitle:"Bali rental planning with Werigo",metaDescription:"Plan your Bali rental with Werigo. Compare electric motorcycles, prepare your rental dates, arrange handover and ask about charging before you ride.",image:"/media/fleet/bees/main.webp",imageAlt:"Wedison Bees electric motorcycle for your Bali rental",focusKeyword:"Bali rental",sources:[{title:"Werigo rental guidance",url:"https://werigo.co/how-it-works"}]};
try {
  equal(ARTICLES_SQL,readFileSync("db/migrations/0016_articles.sql","utf8").replace(/\r\n/g,"\n"));
  ok(existsSync("public"+publish.image));
  parseArticle(draft);checks++;invalid(()=>parseArticle(draft,true));parseArticle(publish,true);checks++;
  invalid(()=>parseArticle({...draft,publishDate:"not-a-date"}));invalid(()=>parseArticle({...draft,image:"/media/../secret.png"}));
  invalid(()=>parseArticle({...draft,body:"<script>alert(1)</script>"}));
  for(const href of ["javascript:alert(1)","data:text/html,test","//evil.example/x","https://user:pass@example.test","/\\evil.example/x"])invalid(()=>parseRichBody(doc([{type:"paragraph",content:[{type:"text",text:"Click",marks:[{type:"link",attrs:{href}}]}]}])));
  let deep=para("Too deep");for(let i=0;i<14;i++)deep={type:"blockquote",content:[deep]};invalid(()=>parseRichBody(doc([deep])));
  invalid(()=>parseRichBody(doc([{type:"paragraph",content:[{type:"heading",attrs:{level:2},content:[]}]}])));
  invalid(()=>parseRichBody(doc([para("x".repeat(60001))])));
  const html=renderToStaticMarkup(React.createElement(ArticleBody,{body:doc([para("<script>alert(1)</script>"),{type:"heading",attrs:{level:2},content:[{type:"text",text:"Safe heading"}]}])}));
  ok(html.includes("&lt;script&gt;"));ok(!html.includes("<script>"));ok(html.includes("<h2"));
  const health=articleHealth(publish);ok(health.words>=300);ok(health.sections.every(s=>s.score>=0&&s.score<=100));ok(health.sections.find(s=>s.name==="SEO").score>articleHealth(draft).sections[0].score);
  ok(articleHealth({...publish,sources:[]}).sections[2].score<health.sections[2].score,"Source removal reduces GEO editorial checks");
  equal(await service.articlesReady(),false);
  await status(api.GET(new Request(origin+"/api/admin/articles")),401);
  await status(setup.POST(request({})),401);
  state.admin={...admin,mustChangePassword:true};await status(api.GET(new Request(origin+"/api/admin/articles")),403);
  state.admin=admin;await status(setup.POST(request({})),403,"Only super admin can activate");
  await status(api.POST(request({}, {origin:"https://wrong-origin.example"})),403);
  await status(api.POST(request({text:"x".repeat(250001)})),413);
  state.admin={...admin,role:"super_admin"};
  await db.exec(CMS_SQL);await db.exec("create table schema_migrations(name text primary key,checksum text)");
  await status(setup.POST(request({})),503,"Audit failure rolls back activation");
  equal(await service.articlesReady(),false);
  await db.exec("create table audit_log(actor_id text,actor_email text,actor_role text,action text,entity_type text)");
  await status(setup.POST(request({})),200);await status(setup.POST(request({})),200);
  equal((await db.query("select count(*)::int as n from audit_log")).rows[0].n,1,"Activation is idempotent");
  state.admin=admin;
  let response=await api.POST(request(cmd(null,draft)));equal(response.status,200);
  let article=(await response.json()).article;equal(article.version,1);equal(article.hasPublished,false);
  equal(await service.getArticle(article.slug),null);equal((await service.articleSitemapEntries()).length,0);
  await status(api.POST(request(cmd(article.id,publish,0))),409);
  response=await api.POST(request(cmd(article.id,publish,1,"publish")));equal(response.status,200);
  article=(await response.json()).article;equal(article.version,2);ok(article.firstPublishedAt);ok(article.hasPublished);
  const publicArticle=await service.getArticle(article.slug);equal(publicArticle.title,publish.title);const pubDate=publicArticle.updatedAt;
  equal((await service.articleSitemapEntries()).map(e=>e.url),["https://werigo.co/guides","https://werigo.co/guides/bali-rental-planning"]);
  response=await api.POST(request(cmd(article.id,{...publish,title:"Unpublished draft revision"},2)));
  equal(response.status,200);article=(await response.json()).article;
  equal((await service.getArticle(article.slug)).title,publish.title,"Saving draft preserves published copy");
  equal((await service.getArticle(article.slug)).updatedAt,pubDate,"Draft does not change public lastmod");
  const history=await service.articleRevisions(article.id);equal(history.map(r=>r.event),["draft","publish","draft"]);
  await status(api.POST(request({id:article.id,version:3,action:"restore",revisionId:history.at(-1).id})),200);
  equal((await service.getArticleDraft(article.id)).version,4);equal((await service.getArticle(article.slug)).title,publish.title);
  await assert.rejects(service.writeArticle(article.id,{...publish,slug:"changed-published-url"},4,"draft",admin.email),ContentConflict);checks++;
  response=await api.POST(request(cmd(null,{...draft,slug:"another-guide"})));equal(response.status,200);const other=(await response.json()).article;
  await assert.rejects(service.writeArticle(other.id,undefined,1,"restore",admin.email,history[0].id),ContentMissing);checks++;
  await status(api.POST(request(cmd(null,draft))),409,"Duplicate slug rejected");
  const missing={...publish,image:"/api/media/"+randomUUID()};
  await assert.rejects(service.writeArticle(other.id,{...missing,slug:other.slug},1,"publish",admin.email),ContentMissing);checks++;
  equal((await service.getArticleDraft(other.id)).version,1,"Missing image rolls back article write");
  const pix=await sharp({create:{width:2,height:2,channels:3,background:"#007d70"}}).webp().toBuffer();
  const imageId=randomUUID();await db.query("insert into werigo_cms_media(id,name,body,mime,width,height,sha256,created_by) values($1,'test cover',$2,'image/webp',2,2,'test', $3)",[imageId,pix,admin.email]);
  const withUpload={...publish,slug:other.slug,image:"/api/media/"+imageId};
  await service.writeArticle(other.id,withUpload,1,"draft",admin.email);equal((await db.query("select public from werigo_cms_media where id=$1",[imageId])).rows[0].public,false);
  await service.writeArticle(other.id,withUpload,2,"publish",admin.email);equal((await db.query("select public from werigo_cms_media where id=$1",[imageId])).rows[0].public,true);
  const live=await service.getArticleDraft(article.id);
  await service.writeArticle(article.id,{...publish,noindex:true},live.version,"publish",admin.email);
  ok(await service.getArticle(article.slug),"Noindex is public, not draft-private");ok(!(await service.articleSitemapEntries()).some(e=>e.url.endsWith("/"+article.slug)));
  const nowArticle=await service.getArticleDraft(article.id);
  await service.writeArticle(article.id,{...publish,publishDate:new Date(Date.now()+86400000).toISOString()},nowArticle.version,"publish",admin.email);
  equal(await service.getArticle(article.slug),null,"Future publish date is not public early");
  const scheduled=await service.getArticleDraft(article.id);equal(scheduled.hasPublished,true);ok(Date.parse(scheduled.visibleAt)>Date.now());
  await service.writeArticle(article.id,{...publish,publishDate:"2026-01-01T00:00:00Z"},scheduled.version,"publish",admin.email);
  ok(await service.getArticle(article.slug),"Backdated article becomes public immediately");
  const unpub=await service.getArticleDraft(article.id);await service.writeArticle(article.id,undefined,unpub.version,"unpublish",admin.email);
  equal(await service.getArticle(article.slug),null);ok(await service.getArticleDraft(article.id),"Unpublish retains the article draft");
  const current=await service.getArticleDraft(other.id);
  const competing=await Promise.allSettled([service.writeArticle(other.id,withUpload,current.version,"draft",admin.email),service.writeArticle(other.id,withUpload,current.version,"draft","other-editor@example.test")]);
  equal(competing.filter(r=>r.status==="fulfilled").length,1);ok(competing.some(r=>r.status==="rejected"&&r.reason instanceof ContentConflict));
  state.admin=null;await status(api.GET(new Request(origin+"/api/admin/articles")),401);
  console.log("PASS: "+checks+" article SQL, rich-text safety, health checks, authorization, draft/publish isolation, scheduling, media, history and concurrency checks.");
}finally{await db.close();delete globalThis.__cmsTest;}
