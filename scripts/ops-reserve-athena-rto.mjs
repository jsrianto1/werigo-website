// Explicit, dated owner-requested stock operation. Never called by normal build.
import {Pool} from 'pg';
import {pathToFileURL} from 'node:url';
export const OPERATION='stock-athena-rto-20261116';
const DAY=86400000,PREPARATION=3600000;
function ensure(value,code){if(!value)throw new Error(code);}
async function counts(client,now){return (await client.query("SELECT m.model,(SELECT count(*)::int FROM ops.available_units(m.model,'',$1,$2)) available FROM (VALUES('bees'),('victory'),('athena'),('edpower')) m(model)",[now+2*DAY,now])).rows;}

export async function reserveAthenaForRto(client,now=Date.now()){
 await client.query('BEGIN');
 try{
  await client.query("SET LOCAL statement_timeout='5s'");
  await client.query("SET LOCAL lock_timeout='3s'");
  await client.query('SELECT pg_advisory_xact_lock(76019)');
  ensure((await client.query('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready===true,'RTO_OPS_NOT_READY');
  const recorded=(await client.query('SELECT action,entity_id FROM ops.audit WHERE id=$1',[OPERATION])).rows[0];
  if(recorded){
   ensure(recorded.action==='unit.rto_reserved','RTO_OPERATION_ID_CONFLICT');
   const unit=(await client.query('SELECT code,state,usage FROM ops.units WHERE id=$1',[recorded.entity_id])).rows[0];
   ensure(unit,'RTO_RECORDED_UNIT_MISSING');
   const current=await counts(client,now);await client.query('COMMIT');
   return {applied:false,already_recorded:true,unit_code:unit.code,state:unit.state,usage:unit.usage,current_stock:current,units_changed:0};
  }
  const before=await counts(client,now);
  const eligible=(await client.query("SELECT u.id,u.code,u.state,u.usage,u.notes,u.updated_at FROM ops.units u JOIN ops.available_units('athena','',$1,$2) a ON a.id=u.id ORDER BY u.code FOR UPDATE OF u",[now+2*DAY,now])).rows;
  ensure(eligible.length===1,'RTO_EXPECTED_ONE_AVAILABLE_ATHENA');
  const unit=eligible[0];
  // RTO has no release date yet. Do not displace any already committed rental,
  // including a reservation starting after the current two-day search window.
  const commitments=(await client.query("SELECT count(*)::int n FROM ops.bookings b,ops.json_each(b.unit_ids) j WHERE j.value=$1 AND b.status IN ('pending_payment','confirmed','active') AND (b.status='active' OR b.end_at+$2>$3)",[unit.id,PREPARATION,now])).rows[0].n;
  ensure(commitments===0,'RTO_UNIT_HAS_EXISTING_COMMITMENT');
  const marker='[RTO HOLD 2026-11-16] Temporarily reserved for RTO by owner request. Not sold. Release only after owner confirmation.';
  const notes=[unit.notes||'',marker].filter(Boolean).join('\n');
  const updated=await client.query("UPDATE ops.units SET state='inactive',notes=$1,updated_at=$2 WHERE id=$3 AND state='ready' AND usage='rental' AND updated_at=$4",[notes,Math.max(now,Number(unit.updated_at)+1),unit.id,unit.updated_at]);
  ensure(updated.rowCount===1,'RTO_UNIT_CHANGED');
  await client.query("INSERT INTO ops.audit(id,action,entity_id,detail,actor,created_at) VALUES($1,'unit.rto_reserved',$2,$3,'maintenance:owner-request-2026-11-16',$4)",[OPERATION,unit.id,JSON.stringify({request:'Temporarily reserve the single available Athena for RTO',previous:{state:unit.state,usage:unit.usage,notes:unit.notes||'',updated_at:unit.updated_at},next:{state:'inactive',usage:unit.usage,notes},environment_changes:0}),now]);
  const after=await counts(client,now);
  ensure(after.find(x=>x.model==='athena')?.available===0,'RTO_ATHENA_NOT_WITHDRAWN');
  ensure(before.filter(x=>x.model!=='athena').every(x=>after.find(y=>y.model===x.model)?.available===x.available),'RTO_OTHER_MODEL_STOCK_CHANGED');
  const later=(await client.query("SELECT count(*)::int n FROM ops.available_units('athena','',$1,$2) WHERE id=$3",[now+32*DAY,now+30*DAY,unit.id])).rows[0].n;
  ensure(later===0,'RTO_UNIT_AVAILABLE_FOR_FUTURE_RENTAL');
  await client.query('COMMIT');
  return {applied:true,already_recorded:false,unit_code:unit.code,state:'inactive',usage:unit.usage,stock_before:before,current_stock:after,units_changed:1,existing_commitments_changed:0,payments_changed:0,environment_changes:0};
 }catch(error){await client.query('ROLLBACK');throw error;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let pool,client;
 try{
  ensure(process.argv[2]==='--apply-2026-11-16','RTO_EXPLICIT_ACTION_REQUIRED');
  ensure(new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://invalid.local').hostname==='werigo.co','RTO_WRONG_TARGET');
  ensure(!!process.env.DATABASE_URL,'RTO_DATABASE_NOT_CONFIGURED');
  pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:15000,query_timeout:10000,application_name:'werigo-owner-athena-rto-reservation'});
  client=await pool.connect();
  console.log(JSON.stringify({step:'ops.athena.rto.reserve',ok:true,...await reserveAthenaForRto(client)}));
 }catch(error){console.error(JSON.stringify({step:'ops.athena.rto.reserve',ok:false,error:/^[A-Z0-9_]+$/.test(error.message)?error.message:'RTO_RESERVATION_FAILED'}));process.exitCode=1;}
 finally{client?.release();await pool?.end();}
}
