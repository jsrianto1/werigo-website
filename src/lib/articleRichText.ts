import { z } from "zod";
import { safeHttps } from "@/lib/cmsRules";
export type RichNode = { type: "doc"|"paragraph"|"heading"|"bulletList"|"orderedList"|"listItem"|"blockquote"|"text"|"hardBreak"|"horizontalRule"; text?:string; attrs?:{level?:number;start?:number;type?:null}; marks?:{type:"bold"|"italic"|"underline"|"strike"|"link";attrs?:{href?:string;target?:string|null;rel?:string|null;class?:null}}[]; content?:RichNode[] };
export function safeArticleLink(value:string) {
  if(safeHttps(value))return true;
  if(!value.startsWith("/")||value.startsWith("//")||/[\\\s\x00-\x1f]/.test(value))return false;
  try{return new URL(value,"https://werigo.co").origin==="https://werigo.co";}catch{return false;}
}
const markSchema=z.object({type:z.enum(["bold","italic","underline","strike","link"]),attrs:z.object({href:z.string().max(1000).refine(safeArticleLink).optional(),target:z.enum(["_blank","_self"]).nullable().optional(),rel:z.string().max(100).nullable().optional(),class:z.null().optional()}).strict().optional()}).strict().refine(m=>m.type!=="link"||Boolean(m.attrs?.href),"Links need a valid address.");
const nodeSchema:z.ZodType<RichNode>=z.lazy(()=>z.object({
  type:z.enum(["doc","paragraph","heading","bulletList","orderedList","listItem","blockquote","text","hardBreak","horizontalRule"]),
  text:z.string().max(60000).optional(),attrs:z.object({level:z.union([z.literal(2),z.literal(3)]).optional(),start:z.number().int().min(1).max(10000).optional(),type:z.null().optional()}).strict().optional(),
  marks:z.array(markSchema).max(5).optional(),content:z.array(nodeSchema).max(1000).optional(),
}).strict());
export const emptyRichBody=JSON.stringify({type:"doc",content:[{type:"paragraph"}]});
export function parseRichBody(raw:string):RichNode {
  const parsed:unknown=JSON.parse(raw);
  const stack:{node:unknown;depth:number}[]=[{node:parsed,depth:0}];let count=0;let chars=0;
  while(stack.length){const {node,depth}=stack.pop()!;if(depth>12||++count>3000)throw new Error("Article structure is too large.");
    if(node&&typeof node==="object"){const n=node as {content?:unknown;text?:unknown};if(typeof n.text==="string")chars+=n.text.length;if(Array.isArray(n.content))for(const child of n.content)stack.push({node:child,depth:depth+1});}
  }
  if(chars>60000)throw new Error("Article text is too long.");
  const doc=nodeSchema.parse(parsed);if(doc.type!=="doc")throw new Error("Article needs a document.");
  function check(n:RichNode,root=false){
    if(n.type==="text"&&(!n.text||n.content?.length))throw new Error("Invalid text.");
    if(!root&&n.type==="doc")throw new Error("Invalid nested document.");
    if(n.type==="heading"&&!n.attrs?.level)throw new Error("Choose a section heading level.");
    if(n.type==="text"||n.type==="hardBreak"||n.type==="horizontalRule"){if(n.content?.length)throw new Error("Invalid leaf content.");}
    const children=n.content??[];
    const allowed=n.type==="paragraph"||n.type==="heading"?["text","hardBreak"]:n.type==="bulletList"||n.type==="orderedList"?["listItem"]:["paragraph","heading","blockquote","bulletList","orderedList","horizontalRule"];
    for(const child of children){if(!allowed.includes(child.type))throw new Error("Invalid document structure.");check(child);}
  }
  check(doc,true);return doc;
}
export function richTextPlain(raw:string):string {
  try{const doc=parseRichBody(raw);function text(n:RichNode):string{return n.type==="text"?n.text??"":(n.content??[]).map(text).join(n.type==="paragraph"||n.type==="heading"?"":"\n");}return text(doc);}catch{return "";}
}
export function richNodes(raw:string):RichNode[] {try{const all:RichNode[]=[];const visit=(n:RichNode)=>{all.push(n);n.content?.forEach(visit);};visit(parseRichBody(raw));return all;}catch{return [];}}
