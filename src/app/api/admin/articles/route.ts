import { NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { contentAdmin, sameOrigin, boundedBody } from "@/lib/cmsAccess";
import { isResponse, storageFailed, fieldErrors } from "@/lib/adminApi";
import { articlesReady, listArticles, articleRevisions, writeArticle } from "@/lib/articles";
import { parseArticle } from "@/lib/articleRules";
import { ContentConflict, ContentMissing } from "@/lib/cms";
import { logAudit, requestIp } from "@/lib/audit";
export const runtime="nodejs";
const noStore={"Cache-Control":"private, no-store"};
const commandSchema=z.object({id:z.string().uuid().nullable(),action:z.enum(["draft","publish","unpublish","restore"]),version:z.number().int().min(0),payload:z.unknown().optional(),revisionId:z.string().uuid().optional()}).strict();
export async function GET(req: Request) {
  const admin=await contentAdmin();if(isResponse(admin))return admin;
  try {
    const ready=await articlesReady(); const id=new URL(req.url).searchParams.get("history");
    if(id) {if(!z.string().uuid().safeParse(id).success)return NextResponse.json({ok:false},{status:400});return NextResponse.json({ok:true,revisions:ready?await articleRevisions(id):[]},{headers:noStore});}
    return NextResponse.json({ok:true,ready,articles:ready?await listArticles(false):[]},{headers:noStore});
  } catch(err){return storageFailed("articles_read",err);}
}
export async function POST(req:Request) {
  if(!sameOrigin(req))return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const admin=await contentAdmin();if(isResponse(admin))return admin;
  if(!req.headers.get("content-type")?.startsWith("application/json"))return NextResponse.json({ok:false},{status:415});
  try {
    let raw;try{raw=JSON.parse(new TextDecoder().decode(await boundedBody(req,250000)));}catch(err){if(err instanceof RangeError)throw err;return NextResponse.json({ok:false,error:"invalid_json"},{status:400});}
    const command=commandSchema.parse(raw);
    if(!await articlesReady())return NextResponse.json({ok:false,error:"setup_required",message:"Ask a super admin to activate Articles first."},{status:503});
    if(command.action==="draft"||command.action==="publish") {
      const payload=parseArticle(command.payload,command.action==="publish");
      if(payload.image&&!payload.image.startsWith("/api/media/")&&!await stat(path.join(process.cwd(),"public",payload.image)).then(s=>s.isFile()).catch(()=>false))
        return NextResponse.json({ok:false,fieldErrors:{image:"Choose an image from the library or upload one."}},{status:422});
    }
    if(command.action==="restore"&&!command.revisionId)return NextResponse.json({ok:false,error:"missing_revision"},{status:422});
    const article=await writeArticle(command.id,command.payload,command.version,command.action,admin.email,command.revisionId);
    await logAudit({actor:admin,action:`article.${command.action}`,entityType:"article",entityId:article.id,meta:{slug:article.slug,version:article.version},ip:requestIp(req)});
    if(command.action==="publish"||command.action==="unpublish")for(const url of ["/guides",`/guides/${article.slug}`,"/page-sitemap.xml","/image-sitemap.xml"])revalidatePath(url);
    return NextResponse.json({ok:true,article,revisions:await articleRevisions(article.id)},{headers:noStore});
  } catch(err) {
    if(err instanceof RangeError)return NextResponse.json({ok:false,error:"too_large",message:"Article is too large."},{status:413});
    if(err instanceof z.ZodError)return NextResponse.json({ok:false,fieldErrors:fieldErrors(err),message:"Check the highlighted fields."},{status:422});
    if(err instanceof ContentConflict)return NextResponse.json({ok:false,error:"conflict",message:err.message||"Another editor saved changes. Reload the article before saving. Your unsaved text is still here."},{status:409});
    if(err instanceof ContentMissing)return NextResponse.json({ok:false,error:"missing",message:err.message||"The revision or image was not found."},{status:422});
    if((err as {code?:string}).code==="23505")return NextResponse.json({ok:false,fieldErrors:{slug:"This URL slug is already used."},message:"Choose another article URL."},{status:409});
    return storageFailed("article_write",err);
  }
}
