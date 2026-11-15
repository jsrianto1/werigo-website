import {currentStaff,db,sameOrigin,json,fail,AppError} from '@/ops/lib/server';
import {rentalReminders,reminderReadKey} from '@/ops/lib/reminders';
export async function POST(req:Request){try{
 sameOrigin(req);const member=await currentStaff();const raw=await req.text();if(raw.length>100000)throw new AppError('Too many reminders.');
 const {keys}=JSON.parse(raw);if(!Array.isArray(keys)||keys.length>1000||keys.some(k=>typeof k!=='string'))throw new AppError('Invalid reminders.');
 const names=['bookings','handovers','customers','units','rental_records','sales_records'];
 const entries=await Promise.all(names.map(async name=>[name,(await db().prepare(`SELECT * FROM ${name}`).all()).results]));
 const current=new Set(rentalReminders(Object.fromEntries(entries),Date.now()).map(reminderReadKey));
 const accepted=keys.filter(k=>current.has(k));
 await db().prepare("UPDATE staff SET reminder_reads=(SELECT COALESCE(json_agg(value)::text,'[]') FROM (SELECT value FROM json_each(staff.reminder_reads) UNION SELECT value FROM json_each(?)) merged WHERE value IN (SELECT value FROM json_each(?))) WHERE id=?").bind(JSON.stringify(accepted),JSON.stringify([...current]),member.id).run();
 const saved=await db().prepare('SELECT reminder_reads FROM staff WHERE id=?').bind(member.id).first<{reminder_reads:string}>();const reads=JSON.parse(saved?.reminder_reads||'[]');
 return json({ok:true,reads});
 }catch(e){return fail(e);}}
