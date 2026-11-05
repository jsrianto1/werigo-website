import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { articleCanonical, articleSearchTitle } from "@/lib/articleRules";
import { jsonLd } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { ArticleView } from "@/components/articles/ArticleView";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
export const dynamic="force-dynamic";
const load=cache(getArticle);
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const a=await load((await params).slug);if(!a)notFound();
  const base=pageMetadata(a.metaTitle,a.metaDescription,articleCanonical(a),a.image);
  const title=articleSearchTitle(a.metaTitle);
  return {...base,title:{absolute:title},robots:{index:!a.noindex,follow:true},twitter:{...base.twitter,title},openGraph:{...base.openGraph,title,type:"article",locale:{en:"en_US",id:"id_ID",ru:"ru_RU"}[a.language],publishedTime:a.publishDate||a.firstPublishedAt!,modifiedTime:a.updatedAt,images:[{url:a.image,alt:a.imageAlt}]}};
}
export default async function Page({params}:Props){
  const a=await load((await params).slug);if(!a)notFound();
  return <><Breadcrumbs items={[{name:"Home",path:"/"},{name:"Bali guides",path:"/guides"},{name:a.title,path:`/guides/${a.slug}`}]}/><ArticleView article={a}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({"@context":"https://schema.org","@type":"BlogPosting","@id":articleCanonical(a)+"#article",headline:a.h1,description:a.metaDescription,image:[`https://werigo.co${a.image}`],datePublished:a.publishDate||a.firstPublishedAt,dateModified:a.updatedAt,mainEntityOfPage:articleCanonical(a),author:{"@type":a.author==="Werigo team"?"Organization":"Person",name:a.author},publisher:{"@id":"https://werigo.co/#business"},inLanguage:a.language,citation:a.sources.map(s=>({"@type":"CreativeWork",name:s.title,url:s.url}))})}}/>
  </>;
}
