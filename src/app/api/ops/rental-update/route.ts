import type {OpsPreparedStatement,OpsDatabase} from '@/ops/lib/database';
import {currentStaff,db,sameOrigin,one,txt,num,uid,checkFiles,json,fail,AppError} from '@/ops/lib/server';
import {rentalUpdatePlan} from '@/ops/lib/rental-workflow';
import {PREPARATION_MS,type Row} from '@/ops/lib/domain';
import {extensionPaymentInput} from '@/ops/lib/extension-payments';
import {extensionChargeInsert} from '@/ops/lib/extension-server';
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff(),raw=await req.text();if(raw.length>20000)throw new AppError('Request too large.');const d=JSON.parse(raw),r=await one('rental_records',txt(d.id,200,true));
 const [u,b]=await Promise.all([db().prepare("SELECT u.*,EXISTS(SELECT 1 FROM notes n WHERE n.unit_id=u.id AND n.status!='resolved' AND n.kind IN ('damage','service')) AS open_service FROM units u").all(),db().prepare("SELECT * FROM bookings WHERE status IN ('pending_payment','confirmed','active')").all()]);
 let plan;try{plan=rentalUpdatePlan(r,d,{role:member.role,now:Date.now(),units:u.results,bookings:b.results});}catch(e){throw new AppError((e as Error).message,409);}
 const photos=await checkFiles(d.photos||[],member),eventId=uid(),now=Date.now(),version=Math.max(now,r.updated_at+1);plan.detail.photos=photos;
 let payment;if(plan.mode==='extend'&&d.extra_idr>0){try{payment=extensionPaymentInput(d,now);}catch(e){throw new AppError((e as Error).message);}Object.assign(plan.detail,{payment_status:payment.paid_at==null?'unpaid':'paid',...payment});}
 const guard='EXISTS(SELECT 1 FROM rental_events WHERE id=?)',statements:OpsPreparedStatement[]=[];
 let conflict='';const bind:unknown[]=[eventId,r.id,plan.mode,JSON.stringify(plan.detail),member.email,now,r.id,r.updated_at];
 if(plan.conflictEnd){conflict=" AND NOT EXISTS(SELECT 1 FROM bookings b,json_each(b.unit_ids) bu WHERE b.status IN ('pending_payment','confirmed','active') AND (b.status='active' OR (b.end_at>? AND b.start_at<?)) AND bu.value IN (SELECT value FROM json_each(?)))";bind.push(now-PREPARATION_MS,plan.conflictEnd+PREPARATION_MS,JSON.stringify(plan.rentalUnitIds));}
 if(plan.mode==='return'&&plan.unitState==='ready'){conflict+=" AND NOT EXISTS(SELECT 1 FROM notes WHERE unit_id IN (SELECT value FROM json_each(?)) AND status!='resolved' AND kind IN ('damage','service'))";bind.push(JSON.stringify(plan.rentalUnitIds));}
 statements.push(db().prepare('INSERT INTO rental_events(id,rental_id,kind,detail,actor,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rental_records WHERE id=? AND updated_at=?)'+conflict).bind(...bind));
 const patch={...plan.patch,updated_at:version},fields=Object.keys(patch);
 statements.push(db().prepare(`UPDATE rental_records SET ${fields.map(f=>f+'=?').join(',')} WHERE id=? AND ${guard}`).bind(...fields.map(f=>(patch as Row)[f]),r.id,eventId));
 if(payment)statements.push(extensionChargeInsert({id:eventId,rental_id:r.id,booking_id:null,amount:d.extra_idr,old_end:plan.detail.old_end,new_end:plan.detail.new_end,note:plan.detail.note,...payment,actor:member.email,paid_by:payment.paid_at==null?null:member.email,created_at:now},guard,[eventId]));
 if(plan.unitState&&plan.unitIds.length){
  // A return never releases another rental or an outstanding signed handover.
  const otherHold=plan.mode==='return'?" AND NOT EXISTS(SELECT 1 FROM rental_records rr,json_each(rr.unit_ids) ru WHERE ru.value=units.id AND rr.id!=? AND rr.source_status!='Done' AND rr.followup_state!='returned') AND NOT EXISTS(SELECT 1 FROM handovers h WHERE h.unit_id=units.id AND h.kind='out' AND NOT EXISTS(SELECT 1 FROM handovers hi WHERE hi.booking_id=h.booking_id AND hi.unit_id=h.unit_id AND hi.kind='in'))":'';
  statements.push(db().prepare(`UPDATE units SET state=?,location=CASE WHEN ?='return' THEN ? ELSE location END,updated_at=? WHERE id IN (SELECT value FROM json_each(?)) AND COALESCE(usage,'rental')='rental' AND ${guard}${otherHold}`).bind(plan.unitState,plan.mode,plan.detail.location||'',version,JSON.stringify(plan.unitIds),eventId,...(plan.mode==='return'?[r.id]:[])));
 }
 if(plan.newNote){const n=plan.newNote,targets=plan.mode==='return'&&plan.unitIds.length?plan.unitIds:[n.unit_id];for(const target of targets)statements.push(db().prepare(`INSERT INTO notes(id,title,kind,priority,status,rental_id,unit_id,customer_id,body,assignee,photos,actor,created_at,updated_at) SELECT ?,?,?,?,'open',?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(uid(),`${r.customer_name} · ${n.kind==='damage'?'Motorbike damage':n.kind==='service'?'Motorbike inspection':n.kind==='complaint'?'Customer complaint':'Team note'}`,n.kind,plan.unitState==='maintenance'?'urgent':'normal',r.id,target,r.customer_id,n.body,'',JSON.stringify(photos),member.email,now,version,eventId));}
 statements.push(db().prepare(`INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(uid(),'rental.'+plan.mode,r.id,JSON.stringify(plan.detail),member.email,now,eventId));
 const result=await db().batch(statements);if(!result[0].meta.changes)throw new AppError('Rental or schedule changed. Reload before saving. / Rental atau jadwal berubah. Muat ulang dulu.',409);
 return json({ok:true,id:r.id});
 }catch(e){return fail(e);}}
