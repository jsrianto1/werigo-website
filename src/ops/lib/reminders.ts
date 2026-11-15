import { DAY,dateWita,parseWita,type Row } from './domain';
import {effectiveRentalEnd} from './rental-workflow';
export type RentalReminder={id:string;kind:'pickup'|'return';due:number;dateOnly:boolean;overdue:boolean;customer:string;units:string;record:Row;imported:boolean};
export const reminderReadKey=(r:RentalReminder)=>JSON.stringify([r.id,r.kind,r.due,r.overdue,r.units]);
export function rentalReminders(data:Row,now:number):RentalReminder[]{
 const list:RentalReminder[]=[];
 for(const b of data.bookings||[]){
  if(!['confirmed','active'].includes(b.status))continue;
  const ids=JSON.parse(b.unit_ids) as string[], evidence=(data.handovers||[]).filter((h:Row)=>h.booking_id===b.id);
  const out=ids.filter(id=>evidence.some((h:Row)=>h.unit_id===id&&h.kind==='out'));
  const pending=out.filter(id=>!evidence.some((h:Row)=>h.unit_id===id&&h.kind==='in'));
  const pickup=ids.filter(id=>!out.includes(id));
  const add=(kind:'pickup'|'return',due:number,units:string[])=>{if(units.length&&due<=now+2*DAY)list.push({id:b.id+kind,kind,due,dateOnly:false,overdue:due<now,customer:data.customers.find((c:Row)=>c.id===b.customer_id)?.name||b.code,units:units.map(id=>data.units.find((u:Row)=>u.id===id)?.code||id).join(', '),record:b,imported:false});};
  add('pickup',b.start_at,pickup);add('return',b.end_at,pending);
 }
 const covered=new Set((data.rental_records||[]).flatMap((r:Row)=>JSON.parse(r.finance_ids)));
 for(const original of data.rental_records||[]){
  const r={...original,end_date:effectiveRentalEnd(original)};
  if(r.source_status==='Done'||r.followup_state==='returned'||!r.end_date)continue;const due=parseWita(r.end_date+'T00:00');if(due>parseWita(dateWita(now)+'T00:00')+2*DAY)continue;
  list.push({id:r.id,kind:'return',due,dateOnly:true,overdue:r.end_date<dateWita(now),customer:r.customer_name,units:[r.model,r.color,r.vin].join(' · '),record:r,imported:true});
 }
 for(const r of data.sales_records||[]){
  if(covered.has(r.id))continue;
  if(r.category!=='active'||r.followup_state==='returned')continue;
  const due=parseWita(r.end_date+'T00:00');
  if(due>parseWita(dateWita(now)+'T00:00')+2*DAY)continue;
  list.push({id:r.id,kind:'return',due,dateOnly:true,overdue:r.end_date<dateWita(now),customer:r.customer_name||'',units:[r.model,r.color,r.vin].filter(Boolean).join(' · '),record:r,imported:true});
 }
 return list.sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id));
}
const escapeIcs=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const utc=(v:number)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function reminderCalendar(r:RentalReminder,title:string,description:string,now:number){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Werigo//Operations//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${escapeIcs(r.id)}@werigo-ops`,`DTSTAMP:${utc(now)}`];
 if(r.dateOnly){lines.push(`DTSTART;VALUE=DATE:${dateWita(r.due).replaceAll('-','')}`,`DTEND;VALUE=DATE:${dateWita(r.due+DAY).replaceAll('-','')}`);}
 else lines.push(`DTSTART:${utc(r.due)}`,`DTEND:${utc(r.due+30*60000)}`);
 lines.push(`SUMMARY:${escapeIcs(title)}`,`DESCRIPTION:${escapeIcs(description)}`);
 for(const trigger of r.dateOnly?['-P1D']:['-P1D','-PT2H'])lines.push('BEGIN:VALARM',`TRIGGER:${trigger}`,'ACTION:DISPLAY',`DESCRIPTION:${escapeIcs(title)}`,'END:VALARM');
 lines.push('END:VEVENT','END:VCALENDAR');
 // RFC 5545: fold by UTF-8 octets, never split an Indonesian/customer character.
 return lines.flatMap(line=>{const folded:string[]=[];let part='';for(const char of line){if(new TextEncoder().encode(part+char).length>73){folded.push(part);part=' '+char;}else part+=char;}folded.push(part);return folded;}).join('\r\n')+'\r\n';
}
