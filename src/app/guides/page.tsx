import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { listArticles } from "@/lib/articles";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeading } from "@/components/ui/Section";
export const dynamic="force-dynamic";
const published=cache(async()=>(await listArticles()).filter(a=>!a.noindex));
export async function generateMetadata(){return {...pageMetadata("Bali Riding & Electric Motorcycle Guides","Practical guides to renting a Wedison, charging and exploring Bali with Werigo.","/guides"),robots:{index:(await published()).length>0,follow:true}};}
export default async function Page(){
  const articles=await published();
  return <><Breadcrumbs items={[{name:"Home",path:"/"},{name:"Bali guides",path:"/guides"}]}/><Section><SectionHeading as="h1" eyebrow="THE WERIGO JOURNAL" title="A little local knowledge. A better Bali ride." lede="Practical island guides, written to help you make the most of your electric ride."/>
    {!articles.length?<div className="rounded-2xl border border-line bg-primary-faint p-7"><h2 className="font-display text-xl">Your next good read is on its way.</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">While our guides are being prepared, explore the fleet or find out how your Werigo rental works.</p><div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-primary"><Link href="/fleet">Explore the fleet →</Link><Link href="/how-it-works">How to rent →</Link></div></div>:<div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{articles.map(a=><article key={a.id} className="overflow-hidden rounded-2xl border border-line bg-card"><Link href={`/guides/${a.slug}`}><Image src={a.image} alt={a.imageAlt} width={1200} height={750} unoptimized={a.image.startsWith("/api/media/")} sizes="(max-width:768px) 100vw,33vw" className={`aspect-[8/5] w-full ${a.image.includes("/fleet/")?"object-contain":"object-cover"}`}/><div className="space-y-3 p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{a.featured?"Featured guide":"Bali guide"} · {a.language.toUpperCase()}</p><h2 className="font-display text-xl leading-snug">{a.title}</h2><p className="text-sm leading-relaxed text-ink-soft">{a.excerpt}</p><span className="block text-sm font-semibold text-primary">Read guide →</span></div></Link></article>)}</div>}
  </Section></>;
}
