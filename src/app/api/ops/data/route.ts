import type {OpsPreparedStatement,OpsDatabase} from '@/ops/lib/database';
import { db,currentStaff,permitted,txt,num,choice,timestamp,one,uid,saveRow,auditStatement,auditedMutation,json,fail,AppError,sameOrigin,checkFiles } from "@/ops/lib/server";
import { MODELS,quote,totalBooking,type Row } from "@/ops/lib/domain";
import {usernameValue,sha256,sessionToken} from '@/ops/lib/password';
import {teamProjection} from '@/ops/lib/privacy';
import {extensionPaymentInput} from '@/ops/lib/extension-payments';
import {extensionChargeInsert,nativeExtensionReceipt} from '@/ops/lib/extension-server';
import {rescheduleQuote} from '@/ops/lib/booking-schedule';
export const dynamic="force-dynamic";
const management=["owner","manager"], finance=["owner","manager","finance"], operations=["owner","manager","ops"];

export async function GET(){try{
 const member=await currentStaff();const tables=["customers","units","bookings","handovers","notes","note_updates","feedback","promotions","payments","sales_records","rental_records","source_imports","rental_events","rental_extensions"];
 const entries=await Promise.all(tables.map(async t=>[t,(await db().prepare(`SELECT * FROM ${t} ORDER BY created_at DESC`).all()).results]));
 let data=Object.fromEntries(entries);
 if(member.role==='owner'){data.staff=(await db().prepare("SELECT s.id,s.name,s.email AS actor_key,s.role,s.enabled,s.created_at,a.username,CASE WHEN a.password_hash='!pending' OR a.password_hash IS NULL THEN 1 ELSE 0 END AS pending_activation FROM staff s LEFT JOIN auth_accounts a ON a.staff_id=s.id ORDER BY s.created_at").all()).results;}
 else {const owners=(await db().prepare("SELECT s.id,s.email,s.name,a.username FROM staff s LEFT JOIN auth_accounts a ON a.staff_id=s.id WHERE s.role='owner'").all()).results as Row[];data=teamProjection(data,owners);}
 // Ops needs per-booking balances for handover, but not finance receipts/references.
 if(member.role==="ops")data.payments=(data.payments as Row[]).map(p=>({id:p.id,booking_id:p.booking_id,kind:p.kind,amount:p.amount,paid_at:p.paid_at}));
 return json({...data,member:{id:member.id,name:member.name,role:member.role,username:member.username||'',auth_type:member.auth_type,has_password:!!member.username,reminder_reads:JSON.parse(member.reminder_reads||'[]')},server_time:Date.now()});
 }catch(e){return fail(e);}}

export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();const body=await req.json() as Row;const d=body.data as Row;if(!d||typeof d!=="object")throw new AppError("Isian belum lengkap.");
 const action=txt(body.action,50,true),now=Date.now(),actor=member.email;
 const entityId=txt(d.id,80)||uid();let invitation:Row|null=null;
 if(action==="rentalFollowup"){
  throw new AppError('Reload the app to use the return condition check. / Muat ulang aplikasi untuk cek kondisi saat pengembalian.',409);
 }else if(action==="saveCustomer"){
  permitted(member,operations);const row={name:txt(d.name,160,true),phone:txt(d.phone,40,true),email:txt(d.email,200),address:txt(d.address,800),nationality:txt(d.nationality,80),notes:txt(d.notes),identity_checked:d.identity_checked?1:0,updated_at:now};
  if(d.id){await one("customers",entityId);const keys=Object.keys(row);await db().batch([db().prepare(`UPDATE customers SET ${keys.map(k=>k+"=?").join(",")} WHERE id=?`).bind(...Object.values(row),entityId),auditStatement("customer.updated",entityId,row,actor)]);}
  else await saveRow("customers",{id:entityId,...row,created_at:now},actor);
 }else if(action==="saveUnit"){
  permitted(member,management);const row={engine_number:txt(d.engine_number,100),usage:choice(d.usage||"rental",["rental","internal","sold"]),code:txt(d.code,50,true).toUpperCase(),plate:txt(d.plate,30).toUpperCase(),model:choice(d.model,[...MODELS]),color:txt(d.color,60),vin:txt(d.vin,100),location:txt(d.location,200)||"Showroom",state:choice(d.state,["ready","maintenance","inactive"]),notes:txt(d.notes),updated_at:now};
  if(d.id){const old=await one("units",entityId);if(old.model!==row.model){const used=await db().prepare("SELECT 1 FROM bookings,json_each(bookings.unit_ids) u WHERE u.value=? LIMIT 1").bind(entityId).first();if(used)throw new AppError("Model unit yang punya riwayat booking tidak dapat diganti.");}const keys=Object.keys(row);await db().batch([db().prepare(`UPDATE units SET ${keys.map(k=>k+"=?").join(",")} WHERE id=?`).bind(...Object.values(row),entityId),auditStatement("unit.updated",entityId,row,actor)]);}
  else await saveRow("units",{id:entityId,...row,created_at:now},actor);
 }else if(action==="createBooking"){
  permitted(member,operations);const customer=await one("customers",txt(d.customer_id,80,true));
  if(!Array.isArray(d.unit_ids)||!d.unit_ids.length||d.unit_ids.length>20)throw new AppError("Pilih 1–20 unit.");
  const unitIds=[...new Set<string>(d.unit_ids.map((x:unknown)=>txt(x,80,true)))];if(unitIds.length!==d.unit_ids.length)throw new AppError("Unit yang sama dipilih dua kali.");
  const units=await Promise.all(unitIds.map(id=>one("units",id)));const start=timestamp(d.start_at),end=timestamp(d.end_at);const estimate=quote(units.map(u=>u.model),start,end);
  const discount=num(d.discount_idr,0,estimate.total),fee=num(d.fee_idr,0,100000000),reason=txt(d.discount_reason,400),approver=txt(d.discount_approver,160);
  if(discount&&(!reason||!approver))throw new AppError("Isi alasan diskon dan nama pemberi persetujuan.");if(discount)permitted(member,management);
  await saveRow("bookings",{id:entityId,code:"WRG-"+new Date(now+28800000).toISOString().slice(2,10).replaceAll("-","")+"-"+entityId.slice(0,5).toUpperCase(),customer_id:customer.id,unit_ids:JSON.stringify(unitIds),start_at:start,end_at:end,status:choice(d.status,["draft","confirmed"]),source:choice(d.source,["WhatsApp","Website → WhatsApp","Walk-in","Partner","Lainnya"]),location:txt(d.location,800),pic:txt(d.pic,160),base_idr:estimate.total,discount_idr:discount,fee_idr:fee,discount_reason:reason,discount_approver:approver,notes:txt(d.notes),pricing_snapshot:JSON.stringify({...estimate,units:units.map(u=>({id:u.id,code:u.code,plate:u.plate,model:u.model})),customer_name:customer.name,verified_at:"2026-11-12"}),created_at:now,updated_at:now},actor);
 }else if(action==="changeBooking"){
  permitted(member,operations);const b=await one("bookings",entityId);if(b.source==="Website")throw new AppError("Manage website booking dates/cancellation in Werigo website admin to keep the payment and reservation in sync.",409);const mode=choice(d.mode,["confirm","cancel","extend","reschedule"]);
  if(mode==="confirm"){if(b.status!=="draft")throw new AppError("Hanya draft yang dapat dikonfirmasi.");await auditedMutation(db().prepare("UPDATE bookings SET status='confirmed',updated_at=? WHERE id=? AND status='draft' AND updated_at=?").bind(now,b.id,b.updated_at),"booking.confirmed",b.id,{},actor);}
  if(mode==="cancel"){
   permitted(member,management);if(!["draft","confirmed"].includes(b.status))throw new AppError("Booking yang sudah berjalan tidak dapat dibatalkan. Selesaikan pengembalian.");
   const why=txt(d.reason,1000,true);await auditedMutation(db().prepare("UPDATE bookings SET status='cancelled',updated_at=? WHERE id=? AND status IN ('draft','confirmed') AND updated_at=? AND NOT EXISTS(SELECT 1 FROM handovers WHERE booking_id=?)").bind(now,b.id,b.updated_at,b.id),"booking.cancelled",b.id,{reason:why},actor);
  }
  if(mode==="extend"){
   permitted(member,operations);if(!["confirmed","active"].includes(b.status))throw new AppError("Hanya booking terkonfirmasi/berjalan yang dapat diperpanjang.");const end=timestamp(d.end_at);if(end<=b.end_at)throw new AppError("Tanggal kembali baru harus lebih lama.");const extra=num(d.extra_idr,0,100000000);const why=txt(d.reason,1000,true);
   if(d.expected_updated_at!=null&&d.expected_updated_at!==b.updated_at)throw new AppError('Booking changed. Reload first. / Booking berubah. Muat ulang dulu.',409);
   if(extra===0){await auditedMutation(db().prepare("UPDATE bookings SET end_at=?,updated_at=? WHERE id=? AND status IN ('confirmed','active') AND end_at=? AND updated_at=?").bind(end,Math.max(now,b.updated_at+1),b.id,b.end_at,b.updated_at),'booking.extended',b.id,{old_end:b.end_at,new_end:end,extra_idr:0,reason:why},actor);}
   else {let payment;try{payment=extensionPaymentInput(d,now);}catch(e){throw new AppError((e as Error).message);}const charge={id:uid(),rental_id:null,booking_id:b.id,amount:extra,old_end:String(b.end_at),new_end:String(end),note:why,...payment,actor,paid_by:payment.paid_at==null?null:actor,created_at:now},guard='EXISTS(SELECT 1 FROM rental_extensions WHERE id=?)';
    const statements=[extensionChargeInsert(charge,"EXISTS(SELECT 1 FROM bookings WHERE id=? AND updated_at=? AND end_at=? AND status IN ('confirmed','active'))",[b.id,b.updated_at,b.end_at]),db().prepare(`UPDATE bookings SET end_at=?,base_idr=base_idr+?,updated_at=? WHERE id=? AND ${guard}`).bind(end,extra,Math.max(now,b.updated_at+1),b.id,charge.id)];
    if(payment.paid_at!=null)statements.push(nativeExtensionReceipt(charge,guard,[charge.id]));
    statements.push(db().prepare(`INSERT INTO audit(id,action,entity_id,detail,actor,created_at) SELECT ?,'booking.extended',?,?,?,? WHERE ${guard}`).bind(uid(),b.id,JSON.stringify({old_end:b.end_at,new_end:end,extra_idr:extra,reason:why,payment_status:payment.paid_at==null?'unpaid':'paid',...payment,extension_id:charge.id}),actor,now,charge.id));const result=await db().batch(statements);if(!result[0].meta.changes)throw new AppError('Booking changed. Reload first. / Booking berubah. Muat ulang dulu.',409);
   }
  }
  if(mode==="reschedule"){
   if(!['draft','confirmed'].includes(b.status))throw new AppError('Only bookings before handover can change dates. / Ubah tanggal hanya sebelum serah terima.',409);
   if(d.expected_updated_at!==b.updated_at)throw new AppError('Booking changed. Reload first. / Booking berubah. Muat ulang dulu.',409);
   const start=timestamp(d.start_at),end=timestamp(d.end_at),why=txt(d.reason,1000,true);
   if(d.confirm_schedule!==true)throw new AppError('Confirm the new dates and total. / Konfirmasi tanggal dan total baru.');
   const units=await Promise.all((JSON.parse(b.unit_ids) as string[]).map(id=>one('units',id)));
   let pricing;try{pricing=rescheduleQuote(b,units.map(u=>u.model),start,end);}catch(e){throw new AppError((e as Error).message);}
   if(d.expected_total_idr!==pricing.total)throw new AppError('The quote changed. Reload before saving. / Penawaran berubah. Muat ulang sebelum menyimpan.',409);
   if(pricing.adjustment<0)permitted(member,management);
   if(await db().prepare('SELECT 1 FROM handovers WHERE booking_id=? LIMIT 1').bind(b.id).first())throw new AppError('Handover evidence already exists. / Bukti serah terima sudah tercatat.',409);
   const minimum=await db().prepare("SELECT COALESCE((SELECT SUM(amount) FROM rental_extensions WHERE booking_id=?),0)+GREATEST(0,COALESCE((SELECT SUM(CASE WHEN kind='rental' THEN amount WHEN kind='refund' THEN -amount ELSE 0 END) FROM payments WHERE booking_id=? AND extension_id IS NULL),0)) AS amount").bind(b.id,b.id).first<{amount:number}>();
   if(pricing.total<(minimum?.amount||0))throw new AppError('New total is below recorded payments or agreed extensions. Record actual refunds or reconcile extension charges first. / Total baru di bawah pembayaran atau biaya perpanjangan. Catat refund aktual atau rekonsiliasi biaya dulu.',409);
   await auditedMutation(db().prepare("UPDATE bookings SET start_at=?,end_at=?,base_idr=?,updated_at=? WHERE id=? AND updated_at=? AND start_at=? AND end_at=? AND status IN ('draft','confirmed') AND NOT EXISTS(SELECT 1 FROM handovers WHERE booking_id=?) AND ?-discount_idr+fee_idr >= COALESCE((SELECT SUM(amount) FROM rental_extensions e WHERE e.booking_id=bookings.id),0)+GREATEST(0,COALESCE((SELECT SUM(CASE WHEN p.kind='rental' THEN p.amount WHEN p.kind='refund' THEN -p.amount ELSE 0 END) FROM payments p WHERE p.booking_id=bookings.id AND p.extension_id IS NULL),0))").bind(start,end,pricing.base,Math.max(now,b.updated_at+1),b.id,b.updated_at,b.start_at,b.end_at,b.id,pricing.base),'booking.rescheduled',b.id,{old_start:b.start_at,old_end:b.end_at,new_start:start,new_end:end,old_base:b.base_idr,new_base:pricing.base,price_adjustment:pricing.adjustment,previous_tariff:pricing.previousTariff,new_tariff:pricing.nextTariff,reason:why},actor);
  }
 }else if(action==="recordPayment"){
  permitted(member,finance);const b=await one("bookings",txt(d.booking_id,80,true));const kind=choice(d.kind,["rental","deposit","refund","deposit_refund"]);if(b.source==="Website"&&kind==="rental")throw new AppError("Online rental payments are recorded automatically. Check the website payment record before recording another receipt.",409);
  if(b.status==="draft"||b.status==="cancelled"&&["rental","deposit"].includes(kind))throw new AppError("Konfirmasi booking sebelum mencatat penerimaan.");
  if(kind==='rental'){const extensions=await db().prepare('SELECT COALESCE(SUM(amount),0) AS amount FROM rental_extensions WHERE booking_id=?').bind(b.id).first<{amount:number}>();const basePaid=await db().prepare("SELECT COALESCE(SUM(CASE WHEN kind='rental' THEN amount WHEN kind='refund' THEN -amount ELSE 0 END),0) AS amount FROM payments WHERE booking_id=? AND extension_id IS NULL").bind(b.id).first<{amount:number}>();if(num(d.amount,1,1000000000)>totalBooking(b)-(extensions?.amount||0)-(basePaid?.amount||0))throw new AppError('This includes an extension fee. Record it under Extension payments to keep its paid status in sync. / Termasuk biaya perpanjangan. Catat di Pembayaran perpanjangan agar status bayarnya sesuai.');}
  const fileId=txt(d.file_id,80)||null;if(fileId)await checkFiles([fileId],member);
  await saveRow("payments",{id:entityId,request_id:txt(d.request_id,80,true),booking_id:b.id,kind,amount:num(d.amount,1,1000000000),method:choice(d.method,["Transfer bank","Tunai","QRIS","Kartu","Lainnya"]),reference:txt(d.reference,200),paid_at:timestamp(d.paid_at),note:txt(d.note,1000),file_id:fileId,actor,created_at:now},actor);
 }else if(action==="addNote"){
  const bookingId=txt(d.booking_id,80)||null,unitId=txt(d.unit_id,80)||null;let customerId=txt(d.customer_id,80)||null;
  if(bookingId){const b=await one("bookings",bookingId);if(unitId&&!JSON.parse(b.unit_ids).includes(unitId))throw new AppError("Unit yang dipilih bukan bagian booking ini.");if(customerId&&customerId!==b.customer_id)throw new AppError("Customer tidak sesuai booking.");customerId=b.customer_id;}if(unitId)await one("units",unitId);if(customerId)await one("customers",customerId);
  const photos=await checkFiles(d.photos||[],member);await saveRow("notes",{id:entityId,title:txt(d.title,200,true),kind:choice(d.kind,["damage","complaint","service","general"]),priority:choice(d.priority,["low","normal","urgent"]),status:"open",booking_id:bookingId,unit_id:unitId,customer_id:customerId,body:txt(d.body,6000,true),assignee:txt(d.assignee,160),photos:JSON.stringify(photos),actor,created_at:now,updated_at:now},actor);
 }else if(action==="updateNote"){
  const n=await one("notes",entityId);const status=choice(d.status,["open","in_progress","resolved"]);const text=txt(d.body,4000,true);
  const statements=[db().prepare("UPDATE notes SET status=?,assignee=?,updated_at=? WHERE id=?").bind(status,txt(d.assignee,160),now,n.id),db().prepare("INSERT INTO note_updates(id,note_id,body,status,actor,created_at) VALUES(?,?,?,?,?,?)").bind(uid(),n.id,text,status,actor,now),auditStatement("note.updated",n.id,{status,body:text},actor)];
  if(d.ready===true){permitted(member,operations);if(!n.unit_id||status!=='resolved'||!['damage','service'].includes(n.kind))throw new AppError('Resolve the unit inspection first. / Selesaikan pemeriksaan unit dulu.');const other=await db().prepare("SELECT id FROM notes WHERE unit_id=? AND id!=? AND status!='resolved' AND kind IN ('damage','service') LIMIT 1").bind(n.unit_id,n.id).first();if(other)throw new AppError('Other damage/service notes are still open. / Masih ada kerusakan atau servis lain yang belum selesai.');statements.push(db().prepare("UPDATE units SET state='ready',updated_at=? WHERE id=? AND COALESCE(usage,'rental')='rental' AND NOT EXISTS(SELECT 1 FROM notes WHERE unit_id=? AND status!='resolved' AND kind IN ('damage','service'))").bind(now,n.unit_id,n.unit_id),auditStatement('unit.inspected',n.unit_id,{note_id:n.id,condition:'ready'},actor));}
  await db().batch(statements);
 }else if(action==="addFeedback"){
  const c=await one("customers",txt(d.customer_id,80,true));const bookingId=txt(d.booking_id,80)||null;if(bookingId){const b=await one("bookings",bookingId);if(b.customer_id!==c.id)throw new AppError("Booking bukan milik customer ini.");}
  await saveRow("feedback",{id:entityId,customer_id:c.id,booking_id:bookingId,rating:d.rating?num(d.rating,1,5):null,message:txt(d.message,6000,true),channel:choice(d.channel,["WhatsApp","Langsung","Telepon","Google review","Lainnya"]),followup:txt(d.followup,2000),actor,created_at:now},actor);
 }else if(action==="savePromotion"){
  permitted(member,management);const type=choice(d.type,["percent","fixed"]);const start=timestamp(d.starts_at),end=timestamp(d.ends_at);if(end<=start)throw new AppError("Masa berlaku promo tidak valid.");
  await saveRow("promotions",{id:entityId,title:txt(d.title,160,true),code:txt(d.code,60).toUpperCase(),type,value:num(d.value,1,type==="percent"?100:100000000),starts_at:start,ends_at:end,terms:txt(d.terms,3000,true),approver:txt(d.approver,160,true),enabled:1,created_at:now},actor);
 }else if(action==="disablePromotion"){
  permitted(member,management);await one("promotions",entityId);await db().batch([db().prepare("UPDATE promotions SET enabled=0 WHERE id=?").bind(entityId),auditStatement("promotion.disabled",entityId,{},actor)]);
 }else if(action==="salesFollowup"){
  permitted(member,operations);const r=await one('sales_records',entityId);if(r.category!=='active')throw new AppError('Only active source rentals need return follow-up.');
  const state=choice(d.state,['open','returned']),note=txt(d.note,2000,true);
  await db().batch([db().prepare('UPDATE sales_records SET followup_state=?,followup_note=?,updated_at=? WHERE id=?').bind(state,note,now,r.id),auditStatement('sales.followup',r.id,{state,note},actor)]);
 }else if(action==="saveStaff"||action==="staffInvite"){
  permitted(member,['owner']);const existing=d.id?await one('staff',entityId):null;if(existing?.role==='owner')throw new AppError('Use My login to manage your own credentials.');
  const account=existing?await db().prepare('SELECT * FROM auth_accounts WHERE staff_id=?').bind(entityId).first<Row>():null;
  if(action==='staffInvite'&&!existing)throw new AppError('User not found.');
  let username;try{username=usernameValue(action==='staffInvite'?account?.username:d.username);}catch(e){throw new AppError((e as Error).message);}
  const used=await db().prepare('SELECT staff_id FROM auth_accounts WHERE username=?').bind(username).first<Row>();if(used&&used.staff_id!==entityId)throw new AppError('Username is already in use.');
  const name=action==='staffInvite'?existing!.name:txt(d.name,160,true),role=action==='staffInvite'?existing!.role:choice(d.role,['manager','ops','finance']),enabled=action==='staffInvite'?existing!.enabled:d.enabled===false?0:1;
  if(action==='staffInvite'&&!enabled)throw new AppError('Enable this user before issuing an activation link.');
  const issue=enabled&&(!account||account.password_hash==='!pending'||action==='staffInvite');const statements:OpsPreparedStatement[]=[existing?db().prepare('UPDATE staff SET name=?,role=?,enabled=? WHERE id=?').bind(name,role,enabled,entityId):db().prepare('INSERT INTO staff(id,email,name,role,enabled,created_at) VALUES(?,?,?,?,?,?)').bind(entityId,'user:'+entityId,name,role,enabled,now)];
  statements.push(db().prepare('INSERT INTO auth_accounts(staff_id,username,password_hash,updated_at) VALUES(?,?,?,?) ON CONFLICT(staff_id) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,updated_at=excluded.updated_at').bind(entityId,username,issue?'!pending':account?.password_hash||'!pending',now),db().prepare('DELETE FROM auth_sessions WHERE staff_id=?').bind(entityId),db().prepare('UPDATE auth_invites SET used_at=? WHERE staff_id=? AND used_at IS NULL').bind(now,entityId));
  if(issue){const token=sessionToken(),hash=await sha256(token),expires=now+72*3600000;statements.push(db().prepare('INSERT INTO auth_invites(id,staff_id,created_at,expires_at) VALUES(?,?,?,?)').bind(hash,entityId,now,expires));invitation={activation_url:new URL('/ops/activate?token='+token,req.url).toString(),expires_at:expires,name,username};}
  statements.push(auditStatement(action==='staffInvite'?'staff.invited':existing?'staff.updated':'staff.created',entityId,{username,name,role,enabled,activation_issued:!!invitation},actor));await db().batch(statements);
 }else throw new AppError("Aksi tidak dikenal.");
 return json({ok:true,id:entityId,...(invitation?{invitation}:{})});
 }catch(e){return fail(e);}}
