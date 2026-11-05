import Image from "next/image";
import Link from "next/link";
import { ArticleBody } from "./ArticleBody";
import type { Article } from "@/lib/articleRules";
import { articleHealth } from "@/lib/articleHealth";
export function ArticleView({article:a,preview=false}:{article:Article;preview?:boolean}) {
  const published=a.publishDate||a.firstPublishedAt||a.createdAt;
  return <article lang={a.language} className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16"><p className="eyebrow">{preview?"PRIVATE ARTICLE PREVIEW":"WERIGO · BALI GUIDE"}</p>
    <h1 className="mt-4 font-display text-3xl leading-tight text-ink md:text-5xl">{a.h1}</h1><p className="mt-5 text-lg leading-relaxed text-ink-soft">{a.excerpt}</p>
    <p className="mt-5 text-sm text-ink-faint">By {a.author} · <time dateTime={published}>{new Date(published).toLocaleDateString("en-GB",{timeZone:"Asia/Makassar",day:"numeric",month:"long",year:"numeric"})}</time> · {articleHealth(a).minutes} min read</p>
    {a.image&&<Image src={a.image} alt={a.imageAlt} width={1200} height={750} unoptimized={a.image.startsWith("/api/media/")} sizes="(max-width:768px) 100vw,720px" priority className={`my-8 aspect-[8/5] w-full rounded-2xl ${a.image.includes("/fleet/")?"object-contain":"object-cover"}`}/>}
    <ArticleBody body={a.body}/>
    {a.sources.length>0&&<section className="mt-10 border-t border-line pt-6"><h2 className="font-display text-xl">Sources</h2><ul className="mt-4 space-y-3 text-sm">{a.sources.map((s,i)=><li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{s.title}</a></li>)}</ul></section>}
    <aside className="mt-12 rounded-2xl bg-primary-faint p-6"><h2 className="font-display text-xl">Where we go next?</h2><p className="mt-3 leading-relaxed text-ink-soft">Find your Wedison, choose your dates and make Bali yours.</p><Link href="/fleet" className="mt-4 inline-block font-semibold text-primary">Explore the fleet →</Link></aside>
  </article>;
}
