import { z } from "zod";
import { mediaPathSchema } from "@/lib/cmsRules";
import { emptyRichBody, parseRichBody, richTextPlain, richNodes } from "@/lib/articleRichText";
import { safeHttps } from "@/lib/cmsRules";

export const articleInputSchema = z.object({
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  title: z.string().trim().min(3).max(160),
  h1: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().max(300),
  body: z.string().max(180000).superRefine((value,ctx)=>{try{parseRichBody(value);}catch{ctx.addIssue({code:"custom",message:"Use the article editor to create valid formatted content."});}}),
  metaTitle: z.string().trim().max(60),
  metaDescription: z.string().trim().max(155),
  image: mediaPathSchema.or(z.literal("")),
  imageAlt: z.string().trim().max(200),
  noindex: z.boolean(),
  language: z.enum(["en", "id", "ru"]),
  author: z.string().trim().min(3).max(100),
  focusKeyword: z.string().trim().max(100),
  featured: z.boolean(),
  publishDate: z.string().max(40).refine(v=>!v||z.iso.datetime({offset:true}).safeParse(v).success,"Choose a publication date including its timezone."),
  sources: z.array(z.object({title:z.string().trim().max(160),url:z.string().trim().max(1000).refine(v=>!v||safeHttps(v),"Use an HTTPS source URL.")}).strict()).max(12),
}).strict();
export type ArticleInput = z.infer<typeof articleInputSchema>;
export function parseArticle(value: unknown, publishing = false): ArticleInput {
  const parsed = articleInputSchema.parse(value);
  if (publishing) {
    const issues: z.core.$ZodIssue[] = [];
    for (const [field, min] of [["excerpt",10],["metaTitle",3],["metaDescription",20],["image",1],["imageAlt",3]] as const) {
      if (parsed[field].length < min) issues.push({ code: "custom", path: [field], message: `${field} needs at least ${min} characters before publishing.` });
    }
    if(richTextPlain(parsed.body).length<100)issues.push({code:"custom",path:["body"],message:"Write at least 100 characters before publishing."});
    let section = false;
    for (const block of richNodes(parsed.body)) {
      if (block.type === "heading"&&block.attrs?.level===2) section = true;
      if (block.type === "heading"&&block.attrs?.level===3&&!section) issues.push({ code: "custom", path: ["body"], message: "Add a section heading before a subheading." });
    }
    parsed.sources.forEach((source,i)=>{if(!source.title||!source.url)issues.push({code:"custom",path:["sources",i],message:"Complete the source title and URL, or remove that source."});});
    if (issues.length) throw new z.ZodError(issues);
  }
  return parsed;
}
export const newArticle: ArticleInput = { slug: "", title: "", h1: "", excerpt: "", body: emptyRichBody, metaTitle: "", metaDescription: "", image: "", imageAlt: "", noindex: false, language: "en", author:"Werigo team",focusKeyword:"",featured:false,publishDate:"",sources:[] };
export interface Article extends ArticleInput {
  id: string; version: number; createdAt: string; updatedAt: string;
  firstPublishedAt: string | null; publishedAt: string | null; visibleAt: string | null; hasPublished: boolean;
}
export interface ArticleRevision { id: string; version: number; event: string; actor: string; createdAt: string }
export function articleCanonical(a: Pick<ArticleInput, "slug">) { return `https://werigo.co/guides/${a.slug}`; }
export function articleSearchTitle(title: string) {
  return /\|\s*werigo\s*$/i.test(title) ? title : `${title} | Werigo`;
}
