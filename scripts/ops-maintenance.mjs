// Explicit hosting maintenance entry point. Never runs during a normal build.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {websiteServiceHeaders} from '../src/lib/opsServiceProtocol.ts';
import {opsPayload} from '../src/lib/opsInventoryPayload.ts';
const endpoint='https://werigo-team-ops.veyaworkspace.chatgpt.site/api/website-sync';
const migrationRoot=new URL('../db/migrations/',import.meta.url);
export async function prepareOpsSchema(client){
 await client.query('begin');
 try{
  await client.query("set local lock_timeout='5s'");await client.query('select pg_advisory_xact_lock(76017)');
  for(const name of ['0017_ops_inventory_sync.sql','0018_ops_service_observability.sql']){
   const sql=readFileSync(new URL(name,migrationRoot),'utf8').replace(/\r\n/g,'\n'),checksum=createHash('sha256').update(sql).digest('hex').slice(0,16);
   const old=await client.query('select checksum from schema_migrations where name=$1',[name]);
   if(old.rows[0]){if(old.rows[0].checksum!==checksum)throw new Error('MIGRATION_CHECKSUM_MISMATCH');continue;}
   await client.query(sql);await client.query('insert into schema_migrations(name,checksum) values($1,$2)',[name,checksum]);
  }
  await client.query("insert into werigo_ops_sync_audit(action) values('schema.prepared')");await client.query('commit');
 }catch(e){await client.query('rollback');throw e;}
}
async function requestOps(secret,method,body){
 const response=await fetch(endpoint+(method==='GET'?body:''),{method,headers:{...websiteServiceHeaders(secret,method,body),...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(response.status===409?'ALLOCATION_CONFLICT':'OPS_CONNECTION_FAILED');
 const result=await response.json();if(!result.ok)throw new Error('OPS_CONNECTION_FAILED');return result;
}
export async function maintenance(mode){
 if(new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://invalid.local').hostname!=='werigo.co')throw new Error('WRONG_TARGET');
 if(!['audit','activate'].includes(mode))throw new Error('INVALID_MAINTENANCE_ACTION');
 const secret=process.env.BETTER_AUTH_SECRET||'';if(secret.length<32||!process.env.DATABASE_URL)throw new Error('SERVER_CONFIGURATION_UNAVAILABLE');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:15000}),client=await pool.connect();
 try{
  await prepareOpsSchema(client);
  const keyResponse=await fetch(endpoint+'/key',{headers:{'user-agent':'WerigoWebsite/1.0 (+https://werigo.co)'},signal:AbortSignal.timeout(15000)});
  if(!keyResponse.ok)throw new Error('OPS_IDENTITY_UNAVAILABLE');const {key}=await keyResponse.json();
  if(key.kty!=='OKP'||key.crv!=='Ed25519'||typeof key.x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key.x)||key.d)throw new Error('INVALID_OPS_IDENTITY');
  const pinned=JSON.stringify({kty:key.kty,crv:key.crv,x:key.x});
  const settings=(await client.query('select * from werigo_ops_sync_settings where id=1')).rows[0];
  if(settings.ops_public_key&&settings.ops_public_key!==pinned)throw new Error('OPS_IDENTITY_MISMATCH');
  await client.query('update werigo_ops_sync_settings set ops_public_key=$1 where id=1',[pinned]);
  const now=Date.now(),search='?'+new URLSearchParams({start:String(now),end:String(now+3*86400000)});
  const stock=await requestOps(secret,'GET',search);
  const audit=await client.query(`select vehicle_model,status,payment_status,count(*)::int bookings,sum(quantity)::int units from bookings where end_at>now() and status not in ('completed','cancelled','expired','no_response') and (payment_status='paid' or (payment_status='pending' and payment_expires_at>now()) or status in ('confirmed','active')) group by vehicle_model,status,payment_status`);
  console.log(JSON.stringify({step:'audit',future_commitments:audit.rows,stock:stock.stock}));
  if(mode==='audit')return;
  // Observe the actual unattended scheduler before pausing any new checkouts.
  let verified=false;for(let i=0;i<16;i++){
   const row=(await client.query('select cron_verified_at from werigo_ops_sync_settings where id=1')).rows[0];
   if(row.cron_verified_at&&Date.now()-new Date(row.cron_verified_at).getTime()<150000){verified=true;break;}
   if(i%3===0)console.log(JSON.stringify({step:'waiting_for_authenticated_scheduler',attempt:i+1}));
   await new Promise(resolve=>setTimeout(resolve,10000));
  }
  if(!verified)throw new Error('SCHEDULER_NOT_OBSERVED');
  await client.query('update werigo_ops_sync_settings set enabled=true,ready=false,updated_at=now() where id=1');
  for(let pass=0;pass<20;pass++){
   const rows=await client.query('select b.*,q.revision from werigo_ops_sync_queue q join bookings b on b.id=q.booking_id where q.revision>q.synced_revision order by q.updated_at limit 25');
   if(!rows.rows.length)break;
   for(const row of rows.rows){
    const revision=Number(row.revision);if(!Number.isSafeInteger(revision))throw new Error('INVALID_REVISION');
    const normalized=Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Date?v.toISOString():v]));
    try{
     const result=await requestOps(secret,'POST',JSON.stringify(opsPayload(normalized,revision)));
     if(!Number.isSafeInteger(result.revision)||result.revision<revision)throw new Error('INVALID_ACKNOWLEDGEMENT');
     await client.query('update werigo_ops_sync_queue set synced_revision=$2,last_error=null,attempts=0 where booking_id=$1 and revision=$2',[row.id,revision]);
    }catch(e){
     await client.query('update werigo_ops_sync_queue set last_error=$2,attempts=attempts+1 where booking_id=$1',[row.id,e.message==='ALLOCATION_CONFLICT'?'allocation_conflict':'connection_failed']);
     console.log(JSON.stringify({step:'booking_requires_review',booking_code:row.booking_code,error:e.message==='ALLOCATION_CONFLICT'?'allocation_conflict':'connection_failed'}));throw e;
    }
   }
   console.log(JSON.stringify({step:'reconciled_batch',count:rows.rows.length}));
  }
  await client.query('begin');
  try{
   const pending=(await client.query('select count(*)::int n from werigo_ops_sync_queue where revision>synced_revision')).rows[0].n;
   if(pending)throw new Error('PENDING_BOOKINGS_REMAIN');
   await client.query('update werigo_ops_sync_settings set enabled=true,ready=true,updated_at=now() where id=1');
   await client.query("insert into werigo_ops_sync_audit(action,detail) values('connection.activated',$1)",[JSON.stringify({scheduler_verified:true})]);await client.query('commit');
  }catch(e){await client.query('rollback');throw e;}
  console.log(JSON.stringify({step:'activated',ready:true,pending:0,environment_changes:0}));
 }finally{client.release();await pool.end();}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])maintenance(process.argv[2]||'audit').catch(error=>{
 const safe=/^[A-Z_]+$/.test(error.message)?error.message:'MAINTENANCE_FAILED';console.error(JSON.stringify({ok:false,error:safe}));process.exitCode=1;
});
