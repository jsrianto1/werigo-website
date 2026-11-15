import type {Row} from './domain';
// Only staff metadata is projected. Customer text and signed summaries stay verbatim.
export function teamProjection(data:Row,owners:Row[]){
 const hidden=new Set(owners.flatMap(o=>[o.email,o.name,o.id,o.username].filter(Boolean).map((v:string)=>v.trim().toLowerCase())));
 const metadata=new Set(['actor','paid_by','pic','assignee','discount_approver','approver']);
 const out:Row={};for(const [table,rows]of Object.entries(data)){if(table==='staff'||table==='audit')continue;out[table]=Array.isArray(rows)?rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,metadata.has(k)&&typeof v==='string'&&hidden.has(v.trim().toLowerCase())?'Werigo team':v]))):rows;}return out;
}
