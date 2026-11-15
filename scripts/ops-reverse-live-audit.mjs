// Live verification uses a short transaction that ALWAYS ROLLS BACK.
// No staff account, payment, inventory unit or persistent booking is created.
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

function ensure(value,code){if(!value)throw new Error(code);}
export async function runReverseAudit(client){
 const start=Date.parse('2028-03-08T09:00:00+08:00'),end=start+3*86400000;
 const marker='qa-reverse:'+randomUUID(),customer=marker+':customer',manual=marker+':booking',website=randomUUID(),scheduleId=marker+':schedule',futureId=randomUUID(),rebookId=randomUUID();
 const sources={};for(const f of ['0019_consolidated_ops.sql','0020_ops_atomic_inventory.sql'])sources[f]=readFileSync(new URL('../db/migrations/'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
 let result,rollback=false;
 const count=async(model,begin=start,finish=end)=>(await client.query("SELECT count(*)::int n FROM ops.available_units($1,'',$2,$3)",[model,finish,begin])).rows[0].n;
 async function expectedConflict(fn,pattern){
  await client.query('SAVEPOINT reverse_probe');let rejected=false;
  try{await fn();}catch(e){rejected=pattern.test(e.message);}
  finally{await client.query('ROLLBACK TO SAVEPOINT reverse_probe');await client.query('RELEASE SAVEPOINT reverse_probe');}
  ensure(rejected,'REVERSE_CONFLICT_NOT_REJECTED');return true;
 }
 await client.query('BEGIN');
 try{
  await client.query("SET LOCAL statement_timeout='5s'");
  await client.query("SET LOCAL lock_timeout='3s'");
  const ready=(await client.query('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready===true;
  ensure(ready,'OPS_NOT_READY');
  const definitions={};
  for(const name of ['available_units','booking_insert_guard_fn','booking_update_guard_fn','source_rental_booking_insert_fn','source_rental_booking_update_fn','write_lock']){
   const source=name==='available_units'?sources['0020_ops_atomic_inventory.sql']:sources['0019_consolidated_ops.sql'];
   const expected=source.match(new RegExp('CREATE FUNCTION ops\\.'+name+'\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;'))?.[1]?.trim();
   const actual=(await client.query("SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ops' AND p.proname=$1",[name])).rows[0]?.prosrc?.replace(/\r\n/g,'\n').trim();
   definitions[name]=!!expected&&expected===actual;
  }
  ensure(Object.values(definitions).every(Boolean),'REVERSE_FUNCTION_MISMATCH');
  const triggers=(await client.query("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='ops.bookings'::regclass AND tgname IN ('a_transaction_lock','booking_insert_guard','booking_update_guard','source_rental_booking_insert','source_rental_booking_update') AND tgenabled='O'")).rows[0].n;
  ensure(triggers===5,'REVERSE_TRIGGER_MISSING');
  await client.query('SELECT pg_advisory_xact_lock(76019)');
  const units=(await client.query("SELECT * FROM ops.available_units('edpower','',$1,$2) UNION ALL SELECT * FROM ops.available_units('athena','',$1,$2) UNION ALL SELECT * FROM ops.available_units('victory','',$1,$2) UNION ALL SELECT * FROM ops.available_units('bees','',$1,$2)",[end,start])).rows;
  ensure(units.length>0,'REVERSE_NO_ELIGIBLE_UNIT');
  const unit=units[0],before=await count(unit.model),now=Date.now();
  await client.query("INSERT INTO ops.customers(id,name,phone,notes,created_at,updated_at) VALUES($1,'INTERNAL QA ROLLBACK ONLY','+12025550123','Uncommitted test; no actual customer',$2,$2)",[customer,now]);
  await client.query("INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,notes,pricing_snapshot,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'draft','Walk-in',0,'INTERNAL QA; rolled back; do not rent','{}',$7,$7)",[manual,'QA-REVERSE-'+randomUUID(),customer,JSON.stringify([unit.id]),start,end,now]);
  ensure(await count(unit.model)===before,'REVERSE_DRAFT_RESERVED_STOCK');
  await client.query("UPDATE ops.bookings SET status='confirmed' WHERE id=$1",[manual]);
  ensure(await count(unit.model)===before-1,'REVERSE_CONFIRM_NOT_HELD');
  const manualConflict=await expectedConflict(()=>client.query("INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,pricing_snapshot,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'confirmed','Walk-in',0,'{}',$7,$7)",[marker+':conflict','QA-CONFLICT-'+randomUUID(),customer,JSON.stringify([unit.id]),start,end,now]),/BOOKING_CONFLICT/);
  const websiteInsert=(id=website,begin=start,finish=end)=>client.query("INSERT INTO public.bookings(id,client_submission_id,full_name,whatsapp_number,pickup_area,return_area,start_at,end_at,vehicle_model,privacy_consent_at,status,payment_status,base_idr,total_idr,quantity,customer_notes) VALUES($1,$2,'INTERNAL QA ROLLBACK ONLY','+12025550123','showroom','showroom',$3,$4,$5,now(),'confirmed','unpaid',0,0,1,'Uncommitted reverse inventory test')",[id,randomUUID(),new Date(begin).toISOString(),new Date(finish).toISOString(),unit.model]);
  let websiteConflict=false,websiteAvoidsManualUnit=false;
  if(before===1)websiteConflict=await expectedConflict(websiteInsert,/stock_unavailable/);
  else{
   await client.query('SAVEPOINT reverse_allocation');await websiteInsert();
   const selected=(await client.query('SELECT unit_ids FROM ops.bookings WHERE id=$1',['web:'+website])).rows[0];
   websiteAvoidsManualUnit=!JSON.parse(selected.unit_ids).includes(unit.id);ensure(websiteAvoidsManualUnit,'REVERSE_WEBSITE_TOOK_HELD_UNIT');
   await client.query('ROLLBACK TO SAVEPOINT reverse_allocation');await client.query('RELEASE SAVEPOINT reverse_allocation');
  }
  await client.query("UPDATE ops.bookings SET status='cancelled' WHERE id=$1",[manual]);
  ensure(await count(unit.model)===before,'REVERSE_CANCEL_NOT_RELEASED');
  await websiteInsert();
  const allocated=JSON.parse((await client.query('SELECT unit_ids FROM ops.bookings WHERE id=$1',['web:'+website])).rows[0].unit_ids)[0];
  const reverseConflict=await expectedConflict(()=>client.query("UPDATE ops.bookings SET unit_ids=$2,status='confirmed' WHERE id=$1",[manual,JSON.stringify([allocated])]),/BOOKING_CONFLICT/);
  // Schedule probes are uncommitted too. A later website reservation must not
  // be displaced by extending or moving a manual booking into its slot.
  const day=86400000,hour=3600000,begin=start+30*day,finish=begin+3*day,nextBegin=finish+4*day,nextFinish=nextBegin+3*day,movedBegin=begin+30*day,movedFinish=movedBegin+5*day;
  await websiteInsert(futureId,nextBegin,nextFinish);
  const pinned=JSON.parse((await client.query('SELECT unit_ids FROM ops.bookings WHERE id=$1',['web:'+futureId])).rows[0].unit_ids)[0];
  for(const [a,b] of [[begin,finish+2*day],[movedBegin,movedFinish]])ensure((await client.query("SELECT 1 FROM ops.available_units($1,'',$2,$3) WHERE id=$4",[unit.model,b,a,pinned])).rows.length===1,'SCHEDULE_PROBE_DATES_UNAVAILABLE');
  const oldBefore=await count(unit.model,begin,finish),tailBefore=await count(unit.model,finish+hour,finish+3*day+hour),newBefore=await count(unit.model,movedBegin,movedFinish);
  await client.query("INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,pricing_snapshot,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'confirmed','Walk-in',0,'{}',$7,$7)",[scheduleId,'QA-SCHEDULE-'+randomUUID(),customer,JSON.stringify([pinned]),begin,finish,now]);
  ensure(await count(unit.model,finish+hour,finish+3*day+hour)===tailBefore,'SCHEDULE_ORIGINAL_TAIL_NOT_FREE');
  await client.query('UPDATE ops.bookings SET end_at=$2 WHERE id=$1',[scheduleId,finish+2*day]);
  ensure(await count(unit.model,finish+hour,finish+3*day+hour)===tailBefore-1,'SCHEDULE_EXTENSION_NOT_HELD');
  const extensionConflict=await expectedConflict(()=>client.query('UPDATE ops.bookings SET end_at=$2 WHERE id=$1',[scheduleId,nextBegin+hour]),/BOOKING_CONFLICT/);
  ensure(Number((await client.query('SELECT end_at FROM ops.bookings WHERE id=$1',[scheduleId])).rows[0].end_at)===finish+2*day,'SCHEDULE_CONFLICT_CHANGED_END');
  await client.query('UPDATE ops.bookings SET start_at=$2,end_at=$3 WHERE id=$1',[scheduleId,movedBegin,movedFinish]);
  ensure(await count(unit.model,begin,finish)===oldBefore,'SCHEDULE_OLD_DATES_NOT_RELEASED');
  ensure(await count(unit.model,movedBegin,movedFinish)===newBefore-1,'SCHEDULE_NEW_DATES_NOT_HELD');
  const moveConflict=await expectedConflict(()=>client.query('UPDATE ops.bookings SET start_at=$2,end_at=$3 WHERE id=$1',[scheduleId,nextBegin,nextBegin+5*day]),/BOOKING_CONFLICT/);
  ensure(Number((await client.query('SELECT start_at FROM ops.bookings WHERE id=$1',[scheduleId])).rows[0].start_at)===movedBegin,'SCHEDULE_CONFLICT_MOVED_BOOKING');
  await websiteInsert(rebookId,begin,finish);
  ensure(await count(unit.model,begin,finish)===oldBefore-1,'SCHEDULE_RELEASED_DATES_NOT_BOOKABLE');
  result={ready,guard_functions_match:definitions,enabled_manual_booking_triggers:triggers,model:unit.model,available_before:before,available_after_draft:before,available_after_confirm:before-1,available_after_cancel:before,manual_conflict_rejected:manualConflict,website_last_unit_conflict_rejected:websiteConflict,website_avoids_manual_unit:websiteAvoidsManualUnit,manual_rejects_website_held_unit:reverseConflict,schedule:{extension_tail_before:tailBefore,extension_tail_after:tailBefore-1,conflicting_extension_rejected:extensionConflict,old_dates_released:true,new_dates_held:true,conflicting_move_rejected:moveConflict,conflict_preserves_previous_schedule:true,released_dates_rebookable_by_website:true},real_payments:0,environment_changes:0};
 }finally{await client.query('ROLLBACK');rollback=true;}
 const remaining=(await client.query("SELECT (SELECT count(*) FROM ops.customers WHERE id=$1)+(SELECT count(*) FROM ops.bookings WHERE id=ANY($2::text[]))+(SELECT count(*) FROM public.bookings WHERE id=ANY($3::uuid[]))::int AS n",[customer,[manual,scheduleId],[website,futureId,rebookId]])).rows[0].n;
 ensure(Number(remaining)===0,'REVERSE_FIXTURE_NOT_ROLLED_BACK');
 return {...result,rolled_back:rollback,persisted_test_rows:Number(remaining),available_after_rollback:await count(result.model)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let pool,client;
 try{
  ensure(new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://invalid.local').hostname==='werigo.co','WRONG_REVERSE_TARGET');
  ensure(!!process.env.DATABASE_URL,'DATABASE_NOT_CONFIGURED');
  pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:15000,query_timeout:10000,application_name:'werigo-reverse-rollback-audit'});
  client=await pool.connect();const result=await runReverseAudit(client);
  console.log(JSON.stringify({step:'ops.reverse.audit',ok:true,...result}));
 }catch(e){console.error(JSON.stringify({step:'ops.reverse.audit',ok:false,error:/^[A-Z_]+$/.test(e.message)?e.message:'REVERSE_AUDIT_FAILED',...(/^[A-Z0-9_]{3,40}$/.test(e.code||'')?{code:e.code}:{})}));process.exitCode=1;}
 finally{client?.release();await pool?.end();}
}
