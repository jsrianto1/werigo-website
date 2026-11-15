// No secrets/PII are printed. Default mode is a read-only, aggregate audit.
// QA release requires an exact owner-authorized marker and cancels only unpaid
// synthetic bookings after Midtrans confirms the Snap session is cancelled.
import {Pool} from 'pg';
import {readFileSync} from 'node:fs';
const mode=process.argv[2]||'audit',tag=process.argv[3]||'';
if(!['audit','--release-qa'].includes(mode))throw new Error('INVALID_AUDIT_MODE');
if(mode==='--release-qa'&&!/^WERIGO-QA-[a-f0-9-]{36}$/.test(tag))throw new Error('INVALID_QA_MARKER');
if(new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://invalid.local').hostname!=='werigo.co')throw new Error('WRONG_TARGET');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:15000,query_timeout:15000,application_name:'werigo-booking-audit'});
const terminal=['cancel','expire','deny','failure'];
function emit(value){console.log(JSON.stringify({step:'booking.audit',...value}));}
async function audit(){
 const c=await pool.connect();
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await c.query("SET LOCAL statement_timeout='12s'");
  const ready=(await c.query('SELECT ready FROM ops.settings WHERE id=1')).rows[0]?.ready===true;
  const triggers=(await c.query("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.bookings'::regclass AND tgname IN ('a_ops_transaction_lock','consolidated_ops_insert','consolidated_ops_update') AND tgenabled='O'")).rows[0].n;
  const definitions={};
  const source=readFileSync(new URL('../db/migrations/0020_ops_atomic_inventory.sql',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  for(const name of ['available_units','sync_website_booking']){
   const expected=source.match(new RegExp('CREATE FUNCTION ops\\.'+name+'\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;'))?.[1]?.trim();
   const actual=(await c.query("SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ops' AND p.proname=$1",[name])).rows[0]?.prosrc?.replace(/\r\n/g,'\n').trim();
   definitions[name]=!!expected&&actual===expected;
  }
  const linkage=(await c.query(`SELECT
   count(*)::int live_commitments,
   count(*) FILTER(WHERE w.website_id IS NULL OR o.id IS NULL OR ops.json_array_length(o.unit_ids)<>b.quantity OR o.status NOT IN ('pending_payment','confirmed','active'))::int missing_or_inconsistent
   FROM public.bookings b LEFT JOIN ops.website_bookings w ON w.website_id=b.id::text LEFT JOIN ops.bookings o ON o.id=w.booking_id
   WHERE (b.end_at>now() OR b.status='active') AND b.status NOT IN ('completed','cancelled','expired','no_response') AND (b.payment_status IN ('paid','pending') OR b.status IN ('confirmed','active'))`)).rows[0];
  const conflicts=(await c.query(`SELECT count(*)::int n FROM ops.bookings a JOIN ops.bookings b ON a.id<b.id
   WHERE a.status IN ('pending_payment','confirmed','active') AND b.status IN ('pending_payment','confirmed','active')
   AND a.start_at<b.end_at+3600000 AND a.end_at+3600000>b.start_at
   AND EXISTS(SELECT 1 FROM ops.json_each(a.unit_ids) x,ops.json_each(b.unit_ids) y WHERE x.value=y.value)`)).rows[0].n;
  const unreconciled=(await c.query(`SELECT count(*)::int n FROM public.bookings b WHERE b.payment_status IN ('pending','unpaid','failed','expired')
   AND EXISTS(SELECT 1 FROM public.payments p WHERE p.booking_id=b.id AND p.gross_amount=b.total_idr
    AND (p.transaction_status='settlement' OR (p.transaction_status='capture' AND coalesce(p.fraud_status,'accept')='accept')))`)).rows[0].n;
  const qa=tag?(await c.query(`SELECT b.booking_code,b.status,b.payment_status,o.status AS ops_status,w.payment_state,
   ops.json_array_length(o.unit_ids) AS allocated_units,
   (SELECT count(*)::int FROM public.payments p WHERE p.booking_id=b.id) AS payment_attempts,
   (SELECT count(*)::int FROM ops.payments p WHERE p.booking_id=o.id) AS receipts
   FROM public.bookings b LEFT JOIN ops.website_bookings w ON w.website_id=b.id::text LEFT JOIN ops.bookings o ON o.id=w.booking_id
   WHERE b.customer_notes LIKE $1`,[tag+'%'])).rows:[];
  emit({ready,inventory_triggers:triggers,function_definitions_match:definitions,...linkage,overlapping_unit_assignments:conflicts,unreconciled_paid_bookings:unreconciled,qa,environment_changes:0});
  await c.query('COMMIT');
  if(!ready||triggers!==3||Object.values(definitions).some(v=>!v)||linkage.missing_or_inconsistent||conflicts||unreconciled)throw new Error('LIVE_BOOKING_INVARIANT_FAILED');
  return qa;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
async function gateway(path,method='GET',snap=false,rawAuth=false){
 const production=(process.env.MIDTRANS_ENV??process.env.NEXT_PUBLIC_MIDTRANS_ENV??'sandbox').trim().toLowerCase()==='production';
 const host=snap?(production?'https://app.midtrans.com/snap/v1':'https://app.sandbox.midtrans.com/snap/v1'):(production?'https://api.midtrans.com/v2':'https://api.sandbox.midtrans.com/v2');
 if(!process.env.MIDTRANS_SERVER_KEY?.trim())throw new Error('GATEWAY_NOT_CONFIGURED');
 const key=process.env.MIDTRANS_SERVER_KEY.trim();
 const response=await fetch(host+path,{method,headers:{Authorization:rawAuth?key:'Basic '+Buffer.from(key+':').toString('base64'),Accept:'application/json','Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>null);
 return {http:response.status,data};
}
async function closeQaSnap(token){
 for(const action of ['cancel','expire'])for(const rawAuth of [false,true]){
  const r=await gateway('/transactions/'+encodeURIComponent(token)+'/'+action,'POST',true,rawAuth);
  const already=r.data?.error_messages?.some(x=>/token (?:already |has been )?cancell?ed/i.test(x));
  if(r.http===200&&(r.data?.canceled_at||r.data?.expired_at||['cancel','expire'].includes(r.data?.transaction_status))||already)return true;
 }
 return false;
}
async function releaseQa(){
 const rows=(await pool.query(`SELECT b.id,b.booking_code,b.status,b.payment_status,b.user_id,b.start_at,u.email,u.name,
  (SELECT count(*)::int FROM ops.handovers h WHERE h.booking_id='web:'||b.id::text) AS handovers,
  (SELECT count(*)::int FROM ops.payments p WHERE p.booking_id='web:'||b.id::text) AS receipts
  FROM public.bookings b JOIN public."user" u ON u.id=b.user_id WHERE b.customer_notes LIKE $1`,[tag+'%'])).rows;
 if(rows.length>4)throw new Error('QA_SCOPE_TOO_LARGE');
 for(const b of rows){
  if(!/^qa-rental-[a-f0-9]+@werigo\.co$/.test(b.email)||b.name!=='WERIGO QA TEST DO NOT RENT'||new Date(b.start_at).getTime()<Date.now()+365*86400000||b.handovers||b.receipts||!['pending','failed','expired'].includes(b.payment_status))throw new Error('QA_RELEASE_SCOPE_REJECTED');
  const payments=(await pool.query('SELECT order_id,snap_token,transaction_status FROM public.payments WHERE booking_id=$1',[b.id])).rows;
  for(const p of payments){
   const status=await gateway('/'+encodeURIComponent(p.order_id)+'/status');
   if(status.http>=500||status.http===401||status.http===403||!status.data)throw new Error('QA_GATEWAY_STATUS_UNAVAILABLE');
   const state=status.data.transaction_status;
   if(['capture','settlement','refund','partial_refund','chargeback','partial_chargeback'].includes(state))throw new Error('QA_HAS_PAYMENT_REQUIRES_REVIEW');
   if(p.snap_token){
    if(!await closeQaSnap(p.snap_token)){
     if(state==='pending'){
      await gateway('/'+encodeURIComponent(p.order_id)+'/expire','POST');
      const expired=await gateway('/'+encodeURIComponent(p.order_id)+'/status');
      if(!terminal.includes(expired.data?.transaction_status))throw new Error('QA_GATEWAY_NOT_CLOSED');
     }else if(!terminal.includes(state))throw new Error('QA_SNAP_CANCELLATION_UNCONFIRMED');
    }
   }else if(state&&!terminal.includes(state))throw new Error('QA_GATEWAY_NOT_CLOSED');
  }
  const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");
   await c.query('SELECT pg_advisory_xact_lock(76019)');
   const current=(await c.query('SELECT payment_status,status FROM public.bookings WHERE id=$1 FOR UPDATE',[b.id])).rows[0];
   if(!['pending','failed','expired'].includes(current.payment_status))throw new Error('QA_PAYMENT_STATE_CHANGED');
   await c.query("UPDATE public.payments SET transaction_status='cancel' WHERE booking_id=$1 AND (transaction_status IS NULL OR transaction_status NOT IN ('capture','settlement','refund','partial_refund','chargeback','partial_chargeback'))",[b.id]);
   await c.query("UPDATE public.bookings SET status='cancelled',payment_status='failed' WHERE id=$1",[b.id]);
   await c.query("INSERT INTO public.booking_events(booking_id,event_type,note,actor) SELECT $1,'qa_released',$2,'qa:owner-authorized' WHERE NOT EXISTS(SELECT 1 FROM public.booking_events WHERE booking_id=$1 AND event_type='qa_released')",[b.id,tag+' unpaid test; Snap session cancelled; no funds charged']);
   await c.query('COMMIT');emit({qa_released:b.booking_code,payment_charged:false});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }
 const users=(await pool.query('SELECT id,email,name FROM public."user" WHERE nationality=$1',[tag])).rows;
 for(const user of users){
  if(!/^qa-rental-[a-f0-9]+@werigo\.co$/.test(user.email)||user.name!=='WERIGO QA TEST DO NOT RENT')throw new Error('QA_ACCOUNT_SCOPE_REJECTED');
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query('DELETE FROM public.session WHERE "userId"=$1',[user.id]);
   await c.query('UPDATE public."user" SET banned=true,"banReason"=$2 WHERE id=$1',[user.id,'Completed owner-authorized QA booking test']);
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }
 emit({qa_login_disabled:true,accounts:users.length});
 return rows.length;
}
try{
 await audit().catch(e=>{if(mode==='audit')throw e;emit({before_invariant_failed:true});});
 if(mode==='--release-qa'){const released=await releaseQa();await audit();emit({qa_cleanup_complete:true,released});}
}catch(e){console.error(JSON.stringify({step:'booking.audit',ok:false,error:/^[A-Z_]+$/.test(e.message)?e.message:'BOOKING_AUDIT_FAILED',...(/^[A-Z0-9_]{3,40}$/.test(e.code||'')?{code:e.code}:{})}));process.exitCode=1;}
finally{await pool.end();}
