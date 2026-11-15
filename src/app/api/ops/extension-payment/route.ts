import {db,currentStaff,permitted,sameOrigin,one,txt,uid,json,fail,AppError} from '@/ops/lib/server';
import {extensionPaymentInput} from '@/ops/lib/extension-payments';
import {nativeExtensionReceipt} from '@/ops/lib/extension-server';
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();permitted(member,['owner','manager','ops','finance']);const raw=await req.text();if(raw.length>5000)throw new AppError('Request too large.');const d=JSON.parse(raw),charge=await one('rental_extensions',txt(d.extension_id,200,true));
 if(charge.paid_at!=null)return json({ok:true,already_paid:true});const now=Date.now();let payment;try{payment=extensionPaymentInput(d,now,true);}catch(e){throw new AppError((e as Error).message);}
 const updated={...charge,...payment,paid_by:member.email,created_at:now};
 const statements=[db().prepare('UPDATE rental_extensions SET paid_at=?,method=?,reference=?,paid_by=? WHERE id=? AND paid_at IS NULL').bind(payment.paid_at,payment.method,payment.reference,member.email,charge.id)];
 if(charge.booking_id)statements.push(nativeExtensionReceipt(updated,'changes()>0',[]));
 statements.push(db().prepare("INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'extension.paid',?,?,?,? WHERE changes()>0").bind(uid(),charge.id,JSON.stringify({amount:charge.amount,...payment,rental_id:charge.rental_id,booking_id:charge.booking_id}),member.email,now));
 const result=await db().batch(statements);return json({ok:true,already_paid:!result[0].meta.changes});
 }catch(e){return fail(e);}}
