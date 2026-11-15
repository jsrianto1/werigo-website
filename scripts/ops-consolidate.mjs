// Run explicitly inside the existing Hostinger build environment. No env edits.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,sign} from 'node:crypto';
import {Pool} from 'pg';
import {websiteSigningKey,websitePublicKey,serviceMessage} from '../src/lib/opsServiceProtocol.ts';
const source='https://werigo-team-ops.veyaworkspace.chatgpt.site';
const sourceId='appgprj_6af49ac6842881918d77c11684d8e58a';
const tables=JSON.parse(readFileSync(new URL('../src/ops/tables.json',import.meta.url),'utf8'));
const ephemeral=new Set(['auth_sessions','auth_limits']);
const normalize=value=>typeof value==='bigint'?Number(value):value;
function canonical(rows){return JSON.stringify(rows.map(row=>Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v)]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}
async function exported(secret,search=''){
 const time=String(Date.now()),path='/api/migration/export';
 const signature=sign(null,Buffer.from(serviceMessage('website','GET',path,time,search)),websiteSigningKey(secret)).toString('base64url');
 const response=await fetch(source+path+search,{headers:{'user-agent':'WerigoWebsite/1.0 (+https://werigo.co)','x-werigo-time':time,'x-werigo-signature':signature},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('FROZEN_EXPORT_UNAVAILABLE');return response;
}
async function migrateSchemas(client){
 for(const name of ['0017_ops_inventory_sync.sql','0018_ops_service_observability.sql','0019_consolidated_ops.sql','0020_ops_atomic_inventory.sql']){
  const sql=readFileSync(new URL('../db/migrations/'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const checksum=createHash('sha256').update(sql).digest('hex').slice(0,16);
  const old=(await client.query('SELECT checksum FROM public.schema_migrations WHERE name=$1',[name])).rows[0];
  if(old){if(old.checksum!==checksum)throw new Error('MIGRATION_CHECKSUM_MISMATCH');continue;}
  await client.query(sql);await client.query('INSERT INTO public.schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
 }
}
export async function consolidate(mode){
 if(new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://invalid.local').hostname!=='werigo.co')throw new Error('WRONG_TARGET');
 if(!['inspect','migrate','verify'].includes(mode))throw new Error('INVALID_ACTION');
 const secret=process.env.BETTER_AUTH_SECRET||'';if(secret.length<32||!process.env.DATABASE_URL)throw new Error('SERVER_CONFIGURATION_UNAVAILABLE');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:15000}),client=await pool.connect();
 try{
  const existing=(await client.query("SELECT to_regclass('ops.settings') AS ops")).rows[0].ops;
  const schema=(await client.query('SELECT name FROM public.schema_migrations ORDER BY name')).rows.map(r=>r.name);
  if(mode==='inspect'){
   const future=(await client.query(`SELECT vehicle_model,status,payment_status,count(*)::int bookings,sum(quantity)::int units FROM public.bookings
    WHERE end_at>now() AND status NOT IN ('completed','cancelled','expired','no_response') AND (payment_status IN ('paid','pending') OR status IN ('confirmed','active')) GROUP BY vehicle_model,status,payment_status`)).rows;
   console.log(JSON.stringify({step:'ops.inspect',existing:!!existing,migrations:schema,future_commitments:future,website_public_key:websitePublicKey(secret),environment_changes:0}));return;
  }
  if(mode==='verify'||existing&&(await client.query('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready){
   if(!existing)throw new Error('OPS_NOT_MIGRATED');
   const state=(await client.query('SELECT ready,source_counts FROM ops.settings WHERE id=1')).rows[0];
   const counts={};for(const table of tables)counts[table]=(await client.query('SELECT count(*)::int n FROM ops."'+table+'"')).rows[0].n;
   const unallocated=(await client.query(`SELECT count(*)::int n FROM public.bookings b WHERE b.end_at>now() AND b.status IN ('pending_payment','confirmed','active') AND NOT EXISTS(SELECT 1 FROM ops.website_bookings w WHERE w.website_id=b.id::text)`)).rows[0].n;
   console.log(JSON.stringify({step:'ops.verify',ready:state.ready,counts,unallocated,environment_changes:0}));
   if(!state.ready||unallocated)throw new Error('OPS_VERIFICATION_FAILED');return;
  }
  const snapshot=await (await exported(secret)).json();
  if(snapshot.version!==1||snapshot.source!==sourceId||snapshot.readonly!==true||!snapshot.tables||tables.some(t=>!Array.isArray(snapshot.tables[t]))||Object.keys(snapshot.tables).some(t=>!tables.includes(t)))throw new Error('INVALID_SNAPSHOT');
  if(!snapshot.tables.staff.some(s=>s.role==='owner'&&s.enabled===1)||!snapshot.tables.auth_accounts.length)throw new Error('STAFF_ACCESS_NOT_READY');
  const accounts=new Set(snapshot.tables.auth_accounts.filter(a=>String(a.password_hash).startsWith('pbkdf2-sha256$')).map(a=>a.staff_id));
  if(snapshot.tables.staff.some(s=>s.enabled===1&&s.role==='owner'&&!accounts.has(s.id)))throw new Error('OWNER_PASSWORD_REQUIRED');
  const files=[];for(const f of snapshot.tables.files){const bytes=Buffer.from(await (await exported(secret,'?file='+encodeURIComponent(f.id))).arrayBuffer());if(bytes.length!==Number(f.size))throw new Error('EVIDENCE_SIZE_MISMATCH');files.push({id:f.id,bytes});}
  await client.query('BEGIN');
  try{
   await client.query("SET LOCAL lock_timeout='15s'");await client.query('SELECT pg_advisory_xact_lock(76019)');
   await migrateSchemas(client);await client.query('SET CONSTRAINTS ALL DEFERRED');
   const counts={};
   for(const table of tables){
    if(ephemeral.has(table)){counts[table]=0;continue;}
    const columns=(await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='ops' AND table_name=$1",[table])).rows.map(r=>r.column_name);
    for(const row of snapshot.tables[table]){
     const keys=Object.keys(row);if(keys.some(k=>!columns.includes(k)))throw new Error('SOURCE_COLUMN_MISMATCH');
     await client.query(`INSERT INTO ops."${table}"(${keys.map(k=>'"'+k+'"').join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));
    }
    const result=await client.query('SELECT * FROM ops."'+table+'"');
    // bigint fields are returned as text by pg. Normalize from source column types.
    const integerKeys=result.fields.filter(f=>f.dataTypeID===20).map(f=>f.name);
    for(const row of result.rows)for(const k of integerKeys)if(row[k]!==null)row[k]=Number(row[k]);
    if(canonical(result.rows)!==canonical(snapshot.tables[table]))throw new Error('SOURCE_DATA_MISMATCH');counts[table]=result.rows.length;
   }
   for(const f of files)await client.query('INSERT INTO ops.file_contents(file_id,content) VALUES($1,$2)',[f.id,f.bytes]);
   await client.query("SELECT setval('ops.website_status_events_sequence_seq',GREATEST(1,COALESCE((SELECT MAX(sequence) FROM ops.website_status_events),0)),EXISTS(SELECT 1 FROM ops.website_status_events))");
   await client.query('UPDATE ops.settings SET ready=true,migrated_at=now(),source_counts=$1 WHERE id=1',[JSON.stringify(counts)]);
   const commitments=(await client.query(`SELECT id FROM public.bookings WHERE (end_at>now() OR status='active') AND status NOT IN ('cancelled','completed','expired','no_response') AND (payment_status IN ('paid','pending') OR status IN ('confirmed','active')) ORDER BY created_at`)).rows;
   for(const booking of commitments)await client.query('SELECT ops.sync_website_booking($1)',[booking.id]);
   await client.query('SET CONSTRAINTS ALL IMMEDIATE');
   await client.query("INSERT INTO ops.audit(id,action,entity_id,detail,actor,created_at) VALUES(gen_random_uuid()::text,'ops.migrated','consolidation',$1,'hosting-migration',$2)",[JSON.stringify({source:sourceId,counts,website_bookings:commitments.length,files:files.length}),Date.now()]);
   await client.query('COMMIT');console.log(JSON.stringify({step:'ops.migrated',ready:true,counts,files:files.length,website_bookings:commitments.length,environment_changes:0}));
  }catch(e){await client.query('ROLLBACK');throw e;}
 }finally{client.release();await pool.end();}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])consolidate(process.argv[2]||'inspect').catch(e=>{console.error(JSON.stringify({ok:false,error:/^[A-Z_]+$/.test(e.message)?e.message:'OPS_MIGRATION_FAILED',...(e.message==='stock_unavailable'?{reason:'REVIEW_EXISTING_BOOKING_STOCK'}:{})}));process.exitCode=1;});
