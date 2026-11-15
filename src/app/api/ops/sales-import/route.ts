import { currentStaff,permitted,db,txt,num,choice,sameOrigin,json,fail,AppError,auditStatement } from '@/ops/lib/server';
import { MODELS } from '@/ops/lib/domain';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();permitted(member,['owner']);
 const text=await req.text();if(text.length>500000)throw new AppError('Import file is too large.');
 const p=JSON.parse(text), file=txt(p.source_file,200,true),sha=txt(p.source_sha,64,true),snapshot=txt(p.snapshot_date,10,true);
 if(!/^[a-f0-9]{64}$/.test(sha)||!/^\d{4}-\d{2}-\d{2}$/.test(snapshot)||!Array.isArray(p.rows)||!p.rows.length||p.rows.length>200)throw new AppError('Invalid Werigo import file.');
 const prior=await db().prepare('SELECT DISTINCT source_sha FROM sales_records WHERE snapshot_date=?').bind(snapshot).all();
 if(prior.results.some((r:any)=>r.source_sha!==sha))throw new AppError('This snapshot already exists with different source content. Review it before replacing records.',409);
 const now=Date.now(),sheets={'Daily RO-Werigo':'active','Complete RO-Werigo':'completed','Refund -Werigo':'refund'} as Record<string,string>;
 const ids=new Set<string>();const statements=p.rows.map((r:any)=>{
  const sheet=choice(r.source_sheet,Object.keys(sheets)),row=num(r.source_row,1,10000),category=choice(r.category,[sheets[sheet]]);
  const id=`werigo:${snapshot}:${sheet}:${row}`;if(ids.has(id))throw new AppError('Duplicate source row.');ids.add(id);
  const date=(d:unknown)=>{const v=txt(d,10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new AppError('Invalid source date.');return v;};
  const start=date(r.start_date),end=date(r.end_date);if(end<start)throw new AppError('Source end date precedes start date.');
  if(!r.source_data||typeof r.source_data!=='object'||Array.isArray(r.source_data))throw new AppError('Missing source values.');
  // Keep importable columns explicit; no identity document numbers in this ledger.
  const raw=Object.fromEntries(['number','sales','customer','start','end','scheme','model','color','daily_rate','total_paid','total_days','overdue_days','overdue_amount','vin','referral'].filter(k=>k in r.source_data).map(k=>[k,r.source_data[k]]));
  const rawText=JSON.stringify(raw);if(rawText.length>6000)throw new AppError('Source row is too large.');
  const flags=Array.isArray(r.flags)?r.flags.map((f:unknown)=>choice(f,['missing_vin','missing_customer','day_count_mismatch','vin_overlap','similar_row'])):[];
  return db().prepare('INSERT INTO sales_records(id,source_file,source_sha,source_sheet,source_row,snapshot_date,category,customer_name,sales,model,color,vin,start_date,end_date,amount_idr,source_data,flags,followup_state,followup_note,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,file,sha,sheet,row,snapshot,category,txt(r.customer_name,200),txt(r.sales,160),choice(r.model,[...MODELS]),txt(r.color,60),txt(r.vin,100),start,end,num(r.amount_idr,0,1000000000),rawText,JSON.stringify(flags),'open','',now,now);
 });
 const result=await db().batch([...statements,auditStatement('sales.imported',snapshot,{source_file:file,source_sha:sha,source_rows:p.rows.length},member.email)]);
 return json({ok:true,imported:result.slice(0,-1).reduce((n,r)=>n+(r.meta.changes||0),0),rows:p.rows.length});
 }catch(e){return fail(e);}}
