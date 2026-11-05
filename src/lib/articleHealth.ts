import type { ArticleInput } from "@/lib/articleRules";
import { richTextPlain, richNodes } from "@/lib/articleRichText";
export interface HealthCheck {label:string;pass:boolean}
export interface HealthSection {name:"SEO"|"AEO"|"GEO";score:number;checks:HealthCheck[]}
export function articleHealth(a:ArticleInput):{words:number;minutes:number;sections:HealthSection[]} {
  const text=richTextPlain(a.body);const nodes=richNodes(a.body);const words=text.trim()?text.trim().split(/\s+/u).length:0;
  const headings=nodes.filter(n=>n.type==="heading");const keyword=a.focusKeyword.trim().toLocaleLowerCase();
  const headingText=headings.map(h=>h.content?.map(t=>t.text??"").join("")??"");const first=nodes.find(n=>n.type==="paragraph")?.content?.map(t=>t.text??"").join("")??"";
  const hasLink=nodes.some(n=>n.marks?.some(m=>m.type==="link"&&m.attrs?.href?.startsWith("/")));
  const hasSource=a.sources.some(s=>s.title.trim()&&s.url.startsWith("https://"));
  const groups:{name:HealthSection["name"];checks:HealthCheck[]}[]=[
    {name:"SEO",checks:[
      {label:"Search title: 20–60 characters",pass:a.metaTitle.length>=20&&a.metaTitle.length<=60},
      {label:"Meta description: 80–155 characters",pass:a.metaDescription.length>=80&&a.metaDescription.length<=155},
      {label:"Clear URL slug and page heading",pass:/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)&&a.h1.length>=10},
      {label:"Cover photo with descriptive alt text",pass:!!a.image&&a.imageAlt.length>=10},
      {label:"Focus keyword appears in title and copy",pass:!!keyword&&a.title.toLocaleLowerCase().includes(keyword)&&text.toLocaleLowerCase().includes(keyword)},
      {label:"Useful depth: at least 300 words",pass:words>=300},
      {label:"Link to a relevant Werigo page",pass:hasLink},
    ]},
    {name:"AEO",checks:[
      {label:"Opening paragraph gives a concise answer (20–90 words)",pass:first.trim().split(/\s+/).length>=20&&first.trim().split(/\s+/).length<=90},
      {label:"Introduction summarises the article",pass:a.excerpt.length>=50},
      {label:"At least two clear section headings",pass:headings.filter(n=>n.attrs?.level===2).length>=2},
      {label:"A question heading helps answer a visitor's query",pass:headingText.some(t=>/[?？]/.test(t))},
      {label:"Steps or bullets make advice easy to scan",pass:nodes.some(n=>n.type==="orderedList"||n.type==="bulletList")},
    ]},
    {name:"GEO",checks:[
      {label:"Named author or editorial team",pass:a.author.trim().length>=3},
      {label:"Bali location context is clear",pass:/\b(bali|canggu|ubud|sanur|uluwatu|seminyak|denpasar)\b|бали/iu.test(a.title+" "+text)},
      {label:"Werigo or Wedison is identified in the copy",pass:/\b(werigo|wedison)\b/iu.test(text)},
      {label:"Sources include a title and an HTTPS link",pass:hasSource},
      {label:"Practical details support the advice (dates, quantities or conditions)",pass:/\d/.test(text)},
      {label:"At least two paragraphs give enough context to quote",pass:nodes.filter(n=>n.type==="paragraph"&&(n.content?.map(t=>t.text??"").join("").length??0)>=80).length>=2},
    ]},
  ];
  return {words,minutes:Math.max(1,Math.ceil(words/200)),sections:groups.map(g=>({...g,score:Math.round(100*g.checks.filter(c=>c.pass).length/g.checks.length)}))};
}
