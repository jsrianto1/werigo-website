import { parseRichBody, type RichNode } from "@/lib/articleRichText";
import type { ReactNode } from "react";
export function ArticleBody({body}:{body:string}) {
  let doc:RichNode;try{doc=parseRichBody(body);}catch{return <p className="text-ink-soft">Start writing to preview your article.</p>;}
  function render(n:RichNode,key:number):ReactNode {
    const children=n.content?.map(render);
    if(n.type==="text"){let text:ReactNode=n.text;for(const m of n.marks??[]){if(m.type==="bold")text=<strong>{text}</strong>;if(m.type==="italic")text=<em>{text}</em>;if(m.type==="underline")text=<u>{text}</u>;if(m.type==="strike")text=<s>{text}</s>;if(m.type==="link")text=<a href={m.attrs!.href} className="font-medium text-primary underline underline-offset-4" {...(m.attrs!.href!.startsWith("https:")?{target:"_blank",rel:"noopener noreferrer"}:{})}>{text}</a>;}return <span key={key}>{text}</span>;}
    if(n.type==="heading")return n.attrs?.level===3?<h3 key={key} className="pt-2 font-display text-xl leading-snug text-ink">{children}</h3>:<h2 key={key} className="pt-5 font-display text-2xl leading-snug text-ink">{children}</h2>;
    if(n.type==="paragraph")return <p key={key} className="whitespace-pre-wrap">{children}</p>;
    if(n.type==="bulletList")return <ul key={key} className="list-disc space-y-2 pl-6">{children}</ul>;
    if(n.type==="orderedList")return <ol key={key} start={n.attrs?.start??1} className="list-decimal space-y-2 pl-6">{children}</ol>;
    if(n.type==="listItem")return <li key={key}>{children}</li>;
    if(n.type==="blockquote")return <blockquote key={key} className="border-l-4 border-primary pl-5 italic">{children}</blockquote>;
    if(n.type==="hardBreak")return <br key={key}/>;
    if(n.type==="horizontalRule")return <hr key={key} className="border-line"/>;
    return <div key={key} className="space-y-6">{children}</div>;
  }
  return <div className="article-prose space-y-6 text-base leading-8 text-ink-soft">{render(doc,0)}</div>;
}
