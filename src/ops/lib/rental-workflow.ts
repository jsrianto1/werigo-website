import {parseWita,DAY,type Row} from './domain';
export const effectiveRentalEnd=(r:Row)=>r.operational_end_date||r.end_date||'';
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString().slice(0,10)===v;
const text=(v:unknown,max=2000)=>{if(typeof v!=='string'||v.trim().length>max)throw new Error('Please check the note. / Periksa catatan.');return v.trim();};
const insist=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
export function rentalUpdatePlan(r:Row,d:Row,context:{role:string;now:number;units:Row[];bookings:Row[]}){
 insist(['owner','manager','ops'].includes(context.role),'Only operational staff can update rentals. / Khusus tim operasional.');
 insist(d.expected_updated_at===r.updated_at,'This rental changed. Reload and try again. / Rental berubah. Muat ulang dulu.');
 const mode=String(d.mode),ids=JSON.parse(r.unit_ids) as string[],units=context.units.filter(u=>ids.includes(u.id)),active=r.source_status!=='Done'&&r.followup_state!=='returned';
 const note=text(d.note||''),patch:Row={},detail:Row={note},now=context.now;let newNote:Row|null=null,unitState:string|null=null,unitIds:string[]=[];
 if(mode==='return'){
  insist(active,'This rental is already closed. / Rental ini sudah selesai.');
  insist(Number.isSafeInteger(d.actual_at)&&d.actual_at>=parseWita(r.start_date+'T00:00')&&d.actual_at<=now+300000,'Check the actual return time. / Periksa waktu kembali aktual.');
  insist(['ready','maintenance','unchecked'].includes(d.condition),'Choose the motorbike condition. / Pilih kondisi motor.');
  insist(d.condition==='unchecked'||units.length===r.quantity,'Unit references are incomplete. Save as needs inspection. / Referensi unit belum lengkap. Pilih perlu dicek.');
  insist(d.condition!=='maintenance'||note,'Describe the damage or inspection needed. / Tulis kerusakan atau pemeriksaan yang diperlukan.');
  insist(d.condition!=='ready'||!units.some(u=>u.open_service),'Resolve existing damage/service notes before marking ready. / Selesaikan catatan kerusakan atau servis dulu.');
  Object.assign(patch,{followup_state:'returned',returned_at:d.actual_at,return_condition:d.condition,followup_note:note});
  const location=text(d.location||'',200);insist(location,'Where was the motorbike returned? / Motor kembali ke mana?');
  Object.assign(detail,{actual_at:d.actual_at,condition:d.condition,location});unitState=d.condition==='ready'?'ready':d.condition==='maintenance'?'maintenance':'inactive';unitIds=ids;
  if(d.condition!=='ready')newNote={kind:d.condition==='maintenance'?'damage':'service',body:note||(d.condition==='unchecked'?'Check the returned motorbike before the next rental. / Periksa motor kembali sebelum rental berikutnya.':''),unit_id:ids.length===1?ids[0]:null};
 }else if(mode==='extend'){
  insist(active,'Only open rentals can be extended. / Hanya rental aktif yang bisa diperpanjang.');
  insist(validDate(d.end_date)&&validDate(effectiveRentalEnd(r))&&d.end_date>effectiveRentalEnd(r),'Choose a later return date. / Pilih tanggal kembali yang lebih lama.');
  insist(Number.isSafeInteger(d.extra_idr)&&d.extra_idr>=0&&d.extra_idr<=100000000,'Check the agreed extra rent. / Periksa biaya tambahan.');insist(note,'Add the agreed extension details. / Tulis kesepakatan perpanjangan.');
  Object.assign(patch,{operational_end_date:d.end_date,extension_idr:(r.extension_idr||0)+d.extra_idr});Object.assign(detail,{old_end:effectiveRentalEnd(r),new_end:d.end_date,extra_idr:d.extra_idr});
 }else if(mode==='reopen'){
  insist(['owner','manager'].includes(context.role),'Only an Admin can undo a return. / Hanya Admin bisa membatalkan status kembali.');
  insist(r.source_status!=='Done'&&r.followup_state==='returned','Only a team-confirmed return can be reopened. / Hanya pengembalian yang dikonfirmasi tim bisa dibuka lagi.');insist(note,'Explain why the rental should reopen. / Tulis alasan rental dibuka lagi.');Object.assign(patch,{followup_state:'open',returned_at:null,return_condition:null,followup_note:note});
 }else if(mode==='note'){
  insist(['damage','complaint','service','general'].includes(d.kind),'Choose a note type. / Pilih jenis catatan.');insist(note,'Describe what happened. / Tulis apa yang terjadi.');
  const unitId=String(d.unit_id||'');insist(!unitId||ids.includes(unitId),'Choose a motorbike from this rental. / Pilih motor dari rental ini.');
  insist(!d.hold||unitId,'Choose the motorbike that needs inspection. / Pilih motor yang perlu dicek.');insist(!d.hold||['damage','service'].includes(d.kind),'Only damage/service can hold a unit. / Penahanan unit untuk kerusakan/servis.');
  newNote={kind:d.kind,body:note,unit_id:unitId||null};if(d.hold){unitState='maintenance';unitIds=[unitId];}Object.assign(detail,{kind:d.kind,unit_id:unitId,hold:!!d.hold});
 }else throw new Error('Unknown rental action. / Tindakan tidak dikenal.');
 const conflictEnd=mode==='extend'?parseWita(d.end_date+'T00:00')+DAY:mode==='reopen'?4102444800000:null;
 if(conflictEnd)insist(!context.bookings.some(b=>['pending_payment','confirmed','active'].includes(b.status)&&JSON.parse(b.unit_ids).some((id:string)=>ids.includes(id))&&b.end_at>=now&&b.start_at<conflictEnd),'A motorbike already has another booking. Ask an Admin to reconcile the schedule. / Motor sudah punya booking lain. Minta Admin cek jadwal.');
 return {mode,patch,detail,newNote,unitState,unitIds,conflictEnd,rentalUnitIds:ids};
}
