import { db,currentStaff,permitted,txt,num,choice,timestamp,one,uid,auditStatement,json,fail,AppError,sameOrigin,checkFiles } from "@/ops/lib/server";
import { HANDOVER_CONSENT,totalBooking,type Row } from "@/ops/lib/domain";
import {notifyWebsite} from '@/ops/lib/website-notify';
export const dynamic="force-dynamic";
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();permitted(member,["owner","manager","ops"]);const d=await req.json() as Row;
 const b=await one("bookings",txt(d.booking_id,80,true));const unit=await one("units",txt(d.unit_id,80,true));if(!JSON.parse(b.unit_ids).includes(unit.id))throw new AppError("Unit bukan bagian booking ini.");
 if(num(d.booking_version,1,4102444800000)!==b.updated_at)throw new AppError("Booking telah diperbarui. Buka ulang booking dan minta customer memeriksa ringkasan terbaru.",409);
 const kind=choice(d.kind,["out","in"]);if(kind==="out"&&!["confirmed","active"].includes(b.status))throw new AppError("Konfirmasi booking sebelum motor keluar.");if(kind==="in"&&b.status!=="active")throw new AppError("Booking belum berjalan atau sudah selesai.");
 if(d.accepted!==true)throw new AppError("Customer harus menyetujui ringkasan serah terima.");
 const acceptedLanguage=choice(d.accepted_language??"id",["en","id"]) as "en"|"id";
 const photos=await checkFiles(d.photos,member);if(photos.length<1)throw new AppError("Lampirkan setidaknya satu foto kondisi motor.");
 const signature=txt(d.signature_id,80,true);await checkFiles([signature],member);const signatureFile=await one("files",signature);if(signatureFile.mime!=="image/png")throw new AppError("Tanda tangan harus berasal dari panel tanda tangan.");
 const customer=await one("customers",b.customer_id),now=Date.now(),id=uid(),actual=timestamp(d.actual_at);if(actual>now+300000)throw new AppError("Waktu aktual tidak boleh di masa depan.");
 const signer=txt(d.signer,160,true),battery=num(d.battery,0,100),odometer=num(d.odometer,0,2000000),notes=txt(d.notes,4000);
 if(battery<80&&!notes)throw new AppError("Baterai di bawah 80%. Catat kesepakatan pengecualiannya.");
 if(kind==="out"&&actual<b.start_at)throw new AppError("Waktu motor keluar belum mencapai jadwal mulai. Periksa waktu aktual dan jadwal booking.");
 if(kind==="out"&&actual>=b.end_at)throw new AppError("Jadwal rental sudah berakhir. Perpanjang booking sebelum motor keluar.");
 const checklist={charger:!!d.checklist?.charger,keys:!!d.checklist?.keys,phone_holder:!!d.checklist?.phone_holder,helmets:num(d.checklist?.helmets||0,0,2),briefing:!!d.checklist?.briefing};
 if(!checklist.keys)throw new AppError("Periksa dan konfirmasi penyerahan kunci.");
 const summary={booking_code:b.code,customer_name:customer.name,unit_code:unit.code,plate:unit.plate,model:unit.model,start_at:b.start_at,end_at:b.end_at,total_idr:totalBooking(b),kind,battery,odometer,checklist,notes,signer,actual_at:actual,accepted_text:HANDOVER_CONSENT[acceptedLanguage],accepted_language:acceptedLanguage,version:2};
 const stmts=[db().prepare("INSERT INTO handovers(id,booking_id,kind,unit_id,battery,odometer,checklist,notes,photos,signature_id,signer,summary,actual_at,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,b.id,kind,unit.id,battery,odometer,JSON.stringify(checklist),notes,JSON.stringify(photos),signature,signer,JSON.stringify(summary),actual,member.email,now)];
 if(kind==="out")stmts.push(db().prepare("UPDATE bookings SET status='active',updated_at=? WHERE id=? AND status IN ('confirmed','active')").bind(now,b.id));
 else {
  stmts.push(db().prepare("UPDATE bookings SET status='completed',updated_at=? WHERE id=? AND status='active' AND (SELECT count(*) FROM handovers WHERE booking_id=? AND kind='in')=json_array_length(unit_ids)").bind(now,b.id,b.id));
  stmts.push(db().prepare("UPDATE units SET state=?,location=?,updated_at=? WHERE id=?").bind(d.needs_service?"maintenance":"ready",txt(d.return_location,200)||"Showroom",now,unit.id));
 }
 stmts.push(auditStatement("handover."+kind,id,{booking:b.code,unit:unit.code},member.email));
 if(d.needs_service&&kind==="in")stmts.push(db().prepare("INSERT INTO notes(id,title,kind,priority,status,booking_id,unit_id,customer_id,body,assignee,photos,actor,created_at,updated_at) VALUES(?,?, 'damage','normal','open',?,?,?,?,?,?,?,?,?)").bind(uid(),"Pemeriksaan setelah kembali · "+unit.code,b.id,unit.id,customer.id,notes||"Unit memerlukan pemeriksaan sebelum rental berikutnya.","",JSON.stringify(photos),member.email,now,now));
 await db().batch(stmts);const websiteSync=b.source==='Website'?await notifyWebsite('handover'):null;return json({ok:true,id,website_sync:websiteSync});
 }catch(e){return fail(e);}}
