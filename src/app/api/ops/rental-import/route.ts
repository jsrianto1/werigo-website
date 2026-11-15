import type {OpsPreparedStatement,OpsDatabase} from '@/ops/lib/database';
import {db,currentStaff,permitted,sameOrigin,json,fail,AppError,auditStatement} from '@/ops/lib/server';
import {planRentalImport} from '@/ops/lib/rental-source';
import {sha256} from '@/ops/lib/password';
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();permitted(member,['owner']);const text=await req.text();if(text.length>500000)throw new AppError('Source file is too large.');const p=JSON.parse(text),hash=await sha256(JSON.stringify(p));
 const prior=await db().prepare('SELECT * FROM source_imports WHERE source_id=?').bind(String(p.source_id||'')).first<any>();if(prior){if(prior.source_hash!==hash)throw new AppError('A different snapshot already exists. Reconcile changes before importing.',409);return json({ok:true,imported:0,replayed:true,summary:JSON.parse(prior.summary)});}
 const [units,customers,sales]=await Promise.all(['units','customers','sales_records'].map(t=>db().prepare('SELECT * FROM '+t).all()));let plan;try{plan=planRentalImport(p,units.results,customers.results,sales.results);}catch(e){throw new AppError((e as Error).message);}
 const now=Date.now(),statements:OpsPreparedStatement[]=[];
 for(const {source_note,...row}of plan.units){const value={...row,created_at:now,updated_at:now},keys=Object.keys(value);statements.push(db().prepare(`INSERT INTO units(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...Object.values(value)));}
 for(const row of plan.customers){const value={...row,created_at:now,updated_at:now},keys=Object.keys(value);statements.push(db().prepare(`INSERT INTO customers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...Object.values(value)));}
 for(const row of plan.rentals){const value={...row,created_at:now,updated_at:now},keys=Object.keys(value);statements.push(db().prepare(`INSERT INTO rental_records(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...Object.values(value)));}
 const summary={units:plan.units.length,customers:plan.customers.length,rentals:plan.rentals.length,review:plan.rentals.filter(r=>JSON.parse(r.flags).length).length,source_revenue:plan.rentals.reduce((n,r)=>n+r.revenue,0),cash_created:0,sales_created:0};
 statements.push(db().prepare('INSERT INTO source_imports(id,source_id,source_hash,read_date,summary,actor,created_at) VALUES(?,?,?,?,?,?,?)').bind('gs:'+p.source_id,p.source_id,hash,String(p.read_date),JSON.stringify(summary),member.email,now),auditStatement('rentals.imported',p.source_id,summary,member.email));
 await db().batch(statements);return json({ok:true,imported:plan.rentals.length,summary});
 }catch(e){return fail(e);}}
