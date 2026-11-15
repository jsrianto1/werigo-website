import 'server-only';
import {createHmac} from 'node:crypto';
import {getPool,withTransaction} from '@/lib/db';
import {opsPayload} from '@/lib/opsInventoryPayload';
import type {StoredBooking} from '@/lib/bookingStore';
const OPS_URL='https://werigo-team-ops.veyaworkspace.chatgpt.site/api/website-sync';
export class OpsInventoryError extends Error {constructor(public code:'stock_unavailable'|'sync_unavailable'|'sync_not_ready'){super(code);this.name='OpsInventoryError';}}
export function opsConfigured(){return Boolean(process.env.WERIGO_OPS_SYNC_SECRET?.trim());}
export async function opsEnabled(){
 if(!opsConfigured())return false;
 const result=await getPool().query('select enabled,ready from werigo_ops_sync_settings where id=1');
 if(result.rows[0]?.enabled&&!result.rows[0]?.ready)throw new OpsInventoryError('sync_not_ready');
 return result.rows[0]?.enabled===true;
}
async function opsRequest(method:'GET'|'POST',payload:object|string){
 const secret=process.env.WERIGO_OPS_SYNC_SECRET?.trim();
 if(!secret||secret.length<32)throw new OpsInventoryError('sync_not_ready');
 const body=typeof payload==='string'?payload:JSON.stringify(payload),time=String(Date.now());
 const signature=createHmac('sha256',secret).update(time+'.'+body).digest('hex');
 let response;try{response=await fetch(OPS_URL+(method==='GET'?body:''),{method,cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'user-agent':'WerigoWebsite/1.0 (+https://werigo.co)','x-werigo-time':time,'x-werigo-signature':signature,...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body}:{})});}catch{throw new OpsInventoryError('sync_unavailable');}
 if(!response.ok){const result=await response.json().catch(()=>null);throw new OpsInventoryError(response.status===409&&result?.error==='stock_unavailable'?'stock_unavailable':'sync_unavailable');}
 return response.json();
}
export async function opsAvailability(start:string,end:string){
 const search='?'+new URLSearchParams({start:String(Date.parse(start)),end:String(Date.parse(end))});
 const result=await opsRequest('GET',search);
 if(!Array.isArray(result.stock)||result.stock.length!==4||new Set(result.stock.map((r:{model:string})=>r.model)).size!==4||!result.stock.every((r:{model:string;total:number;available:number})=>['bees','victory','athena','edpower'].includes(r.model)&&Number.isInteger(r.total)&&Number.isInteger(r.available)&&r.available>=0&&r.available<=r.total))throw new OpsInventoryError('sync_unavailable');
 return result.stock as {model:string;total:number;available:number}[];
}
/** Sending a queue revision twice is safe. Compare revision when acknowledging a result. */
export async function syncOpsBooking(id:string,force=false){
 if(!opsConfigured()||!force&&!await opsEnabled())return;
 const pool=getPool();const row=await pool.query(`select b.*,q.revision,q.synced_revision from werigo_ops_sync_queue q join bookings b on b.id=q.booking_id where b.id=$1::uuid`,[id]);
 if(!row.rows[0])throw new OpsInventoryError('sync_not_ready');
 const b=row.rows[0] as StoredBooking&{revision:string;synced_revision:string};
 if(BigInt(b.synced_revision)>=BigInt(b.revision))return;
 const revision=Number(b.revision);if(!Number.isSafeInteger(revision))throw new OpsInventoryError('sync_unavailable');
 try{
  const result=await opsRequest('POST',opsPayload(b,revision));
  if(!Number.isSafeInteger(result.revision)||result.revision<revision)throw new OpsInventoryError('sync_unavailable');
  await pool.query(`update werigo_ops_sync_queue set synced_revision=$2,attempts=0,last_error=null where booking_id=$1::uuid and revision=$2`,[id,revision]);
 }catch(e){
  const code=e instanceof OpsInventoryError?e.code:'sync_unavailable';
  await pool.query(`update werigo_ops_sync_queue set attempts=attempts+1,last_error=$3,next_attempt_at=now()+interval '1 minute' where booking_id=$1::uuid and revision=$2`,[id,revision,code]);
  throw new OpsInventoryError(code);
 }
}
export async function drainOpsQueue(limit=25,force=false){
 if(!opsConfigured()||!force&&!await opsEnabled())return {synced:0,failed:0};
 const rows=await getPool().query(`select booking_id from werigo_ops_sync_queue where revision>synced_revision and next_attempt_at<=now() order by updated_at limit $1`,[limit]);
 let synced=0,failed=0;
 for(const r of rows.rows){try{await syncOpsBooking(r.booking_id,force);synced++;}catch{failed++;}}
 return {synced,failed};
}
/** Ops handovers update the customer's ride history. Manual Ops customers are not
 * matched by name/email; only an explicit website booking ID can be updated. */
export async function pullOpsRideStatus(){
 if(!await opsEnabled())return 0;
 const pool=getPool();const settings=(await pool.query('select last_ops_event from werigo_ops_sync_settings where id=1')).rows[0];
 const result=await opsRequest('GET','?'+new URLSearchParams({mode:'statuses',after:String(settings.last_ops_event)}));
 if(!Array.isArray(result.bookings)||result.bookings.length>50)throw new OpsInventoryError('sync_unavailable');
 let updated=0;
 for(const row of result.bookings){
  if(!/^[0-9a-f-]{36}$/i.test(row.website_id)||!['active','completed','cancelled'].includes(row.status)||!Number.isSafeInteger(row.sequence)||row.sequence<1)throw new OpsInventoryError('sync_unavailable');
  updated+=await withTransaction(async client=>{
   const cursor=(await client.query('select last_ops_event from werigo_ops_sync_settings where id=1 for update')).rows[0];
   if(Number(cursor.last_ops_event)>=row.sequence)return 0;
   await client.query("select set_config('werigo.actor','ops:handover',true)");
   const change=await client.query(`update bookings set status=$2::booking_status where id=$1::uuid and payment_status='paid' and status not in ('cancelled','expired','completed') and status<>$2::booking_status returning id`,[row.website_id,row.status]);
   await client.query('update werigo_ops_sync_settings set last_ops_event=$1 where id=1',[row.sequence]);
   return change.rowCount||0;
  });
 }
 return updated;
}
