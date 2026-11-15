import {getPool,withTransaction} from '@/lib/db';
import {verifyOpsServiceSignature} from '@/lib/opsServiceProtocol';
import {runOpsSyncWorker} from '@/lib/opsSyncWorker';
import {boundedBody} from '@/lib/cmsAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 let body:string;try{body=new TextDecoder().decode(await boundedBody(req,1024));}catch{return Response.json({ok:false},{status:413});}
 try{
  const settings=(await getPool().query('select ops_public_key,enabled,ready from werigo_ops_sync_settings where id=1')).rows[0];
  if(!settings?.ops_public_key||!verifyOpsServiceSignature(settings.ops_public_key,req.headers.get('x-werigo-time')||'',body,req.headers.get('x-werigo-signature')||''))return Response.json({ok:false},{status:401});
  const event=JSON.parse(body);if(!['cron','handover'].includes(event.reason))return Response.json({ok:false},{status:422});
  if(event.reason==='cron')await getPool().query('update werigo_ops_sync_settings set cron_verified_at=now() where id=1');
  // A transaction-scoped advisory lock drops overlapping ticks; it is released on
  // connection loss too. The worker uses separate pool clients for its bounded work.
  return await withTransaction(async client=>{
   const lock=await client.query('select pg_try_advisory_xact_lock(76019) acquired');
   if(!lock.rows[0]?.acquired)return Response.json({ok:true,busy:true});
   if(!settings.enabled||!settings.ready)return Response.json({ok:true,active:false});
   try{const result=await runOpsSyncWorker(event.reason);await client.query('update werigo_ops_sync_settings set last_sync_at=now(),last_sync_error=$1 where id=1',[result.ops_sync.failed?'queue_pending':null]);return Response.json({ok:result.ops_sync.failed===0,active:true,...result},{status:result.ops_sync.failed?503:200});}
   catch{await client.query("update werigo_ops_sync_settings set last_sync_error='worker_failed' where id=1");return Response.json({ok:false},{status:503});}
  });
 }catch{return Response.json({ok:false,error:'not_ready'},{status:503});}
}
