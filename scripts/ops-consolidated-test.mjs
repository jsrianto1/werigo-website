import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {compileOpsSql} from '../src/ops/lib/sql.ts';
const db=new PGlite();let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
async function rejects(fn,pattern){await assert.rejects(fn,pattern);checks++;}
for(const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec('BEGIN;'+readFileSync('db/migrations/'+file,'utf8')+'COMMIT;');
const now=Date.now(),start=now+10*86400000,end=start+3*86400000;
await db.query('INSERT INTO ops.units(id,code,model,usage,state,created_at,updated_at) VALUES($1,$1,\'edpower\',\'rental\',\'ready\',$2,$2)',['test-red',now]);
await db.exec('UPDATE ops.settings SET ready=true WHERE id=1');
async function website({begin=start,finish=end,status='pending_payment',payment='pending',model='edpower',quantity=1}={}){
 const id=randomUUID();await db.query(`INSERT INTO public.bookings(id,client_submission_id,full_name,whatsapp_number,pickup_area,return_area,start_at,end_at,vehicle_model,privacy_consent_at,status,payment_status,payment_expires_at,base_idr,total_idr,quantity)
 VALUES($1,$2,'Local test','+628000000000','showroom','showroom',$3,$4,$5,now(),$6,$7,now()+interval '1 hour',300000,300000,$8)`,[id,randomUUID(),new Date(begin).toISOString(),new Date(finish).toISOString(),model,status,payment,quantity]);return id;
}
const id=await website();
check((await db.query("SELECT unit_ids,status FROM ops.bookings WHERE id=$1",['web:'+id])).rows[0].status==='pending_payment','Website pending reservation is already in Ops when insert returns');
check((await db.query("SELECT count(*)::int n FROM ops.available_units('edpower','',$1,$2)",[end,start])).rows[0].n===0,'Pending payment reserves the physical bike');
await rejects(()=>website(),/stock_unavailable/);
check((await db.query('SELECT count(*)::int n FROM public.bookings')).rows[0].n===1,'Insufficient stock rolls back the website booking itself');
await db.exec('BEGIN');await db.query("UPDATE public.bookings SET status='cancelled' WHERE id=$1",[id]);await db.exec('ROLLBACK');
check((await db.query('SELECT status FROM ops.bookings WHERE id=$1',['web:'+id])).rows[0].status==='pending_payment','Rolled-back cancellation never releases Ops stock');
await db.query("UPDATE public.bookings SET payment_status='paid',paid_at=now(),status='confirmed' WHERE id=$1",[id]);
await db.query('SELECT ops.sync_website_booking($1)',[id]);
check((await db.query('SELECT count(*)::int n FROM ops.payments')).rows[0].n===1,'Verified payment is recorded once, including idempotent reconciliation');
check((await db.query('SELECT amount FROM ops.payments')).rows[0].amount===300000,'Full verified amount is preserved');
await rejects(()=>db.query("UPDATE ops.payments SET amount=1"),/IMMUTABLE_LEDGER/);
await rejects(()=>db.query("INSERT INTO ops.payments(id,request_id,booking_id,kind,amount,method,paid_at,actor,created_at) VALUES('overpay','overpay',$1,'rental',1,'cash',$2,'test',$2)",['web:'+id,now]),/BALANCE_LIMIT/);
// A real outgoing handover updates customer history and remains held until return.
await db.query('UPDATE ops.bookings SET start_at=$1,end_at=$2 WHERE id=$3',[now-3600000,now+3*86400000,'web:'+id]);
// Sync dates must be changed by website admin in the actual API, not the raw SQL fixture.
await db.query('UPDATE public.bookings SET start_at=$1,end_at=$2 WHERE id=$3',[new Date(now-3600000).toISOString(),new Date(now+3*86400000).toISOString(),id]);
const snapshot=JSON.stringify({start_at:now-3600000,end_at:now+3*86400000,total_idr:300000});
const handover=async(kind,actual,odometer)=>db.query(`INSERT INTO ops.handovers(id,booking_id,kind,unit_id,battery,odometer,checklist,photos,signature_id,signer,summary,actual_at,actor,created_at) VALUES($1,$2,$3,'test-red',90,$4,'{}','["test-photo"]','test-signature','Test',$5,$6,'test',$6)`,[randomUUID(),'web:'+id,kind,odometer,snapshot,actual]);
await handover('out',now,100);
await db.query("UPDATE ops.bookings SET status='active',updated_at=$1 WHERE id=$2",[now,'web:'+id]);
check((await db.query('SELECT status FROM public.bookings WHERE id=$1',[id])).rows[0].status==='active','Ops motor-out status updates website customer history in the transaction');
await rejects(()=>db.query("UPDATE ops.handovers SET signer='Changed'"),/IMMUTABLE_EVIDENCE/);
await rejects(()=>handover('in',now+1000,99),/INVALID_RETURN/);
await db.query("UPDATE public.bookings SET status='cancelled' WHERE id=$1",[id]);
check((await db.query('SELECT status FROM ops.bookings WHERE id=$1',['web:'+id])).rows[0].status==='active','Cancelling website does not fabricate a return for a bike on the road');
await handover('in',now+1000,110);
await db.query("UPDATE public.bookings SET status='active' WHERE id=$1",[id]);
await db.query("UPDATE ops.bookings SET status='completed',updated_at=$1 WHERE id=$2",[now+1000,'web:'+id]);
check((await db.query('SELECT status FROM public.bookings WHERE id=$1',[id])).rows[0].status==='completed','Signed return completion reaches customer order history');
const second=await website();await db.query("UPDATE public.bookings SET status='expired',payment_status='expired' WHERE id=$1",[second]);
check((await db.query("SELECT count(*)::int n FROM ops.available_units('edpower','',$1,$2)",[end,start])).rows[0].n===1,'Verified expiry releases a pending hold');
await rejects(()=>website({model:'bees'}),/stock_unavailable/);
await db.query("UPDATE ops.units SET usage='internal' WHERE id='test-red'");
await rejects(()=>website(),/stock_unavailable/);
await db.query("UPDATE ops.units SET usage='rental',state='maintenance' WHERE id='test-red'");
await rejects(()=>website(),/stock_unavailable/);
await db.query("UPDATE ops.units SET state='ready' WHERE id='test-red'");
await db.query("INSERT INTO ops.customers(id,name,phone,created_at,updated_at) VALUES('manual-customer','Test','test',$1,$1)",[now]);
await db.query(`INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,pricing_snapshot,created_at,updated_at)
 VALUES('manual','TEST-MANUAL','manual-customer','["test-red"]',$1,$2,'confirmed','Walk-in',300000,'{}',$3,$3)`,[start,end,now]);
await rejects(()=>website({begin:end+3599999,finish:end+3*86400000}),/stock_unavailable/);
await website({begin:end+3600000,finish:end+3*86400000});
check(true,'Manual reservations and the exact one-hour preparation buffer affect website checkout');
await db.query("UPDATE ops.bookings SET status='cancelled' WHERE id='manual'");
const imported={id:'source-rental',source_id:'test',source_row:1,customer_id:'manual-customer',customer_name:'Test',unit_ids:'["test-red"]',model:'edpower',color:'red',vin:'TEST',engine_number:'TEST',quantity:1,days:3,daily_rate:100000,revenue:300000,start_date:'2026-01-01',end_date:'2026-01-04',source_status:'Active',sales:'',delivery:'',lead_source:'',payment_scheme:'',flags:'[]',finance_ids:'[]',source_data:'{}',followup_state:'open',followup_note:'',created_at:now,updated_at:now};
const keys=Object.keys(imported);await db.query(`INSERT INTO ops.rental_records(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(imported));
await rejects(()=>website(),/stock_unavailable/);
await db.query("UPDATE ops.rental_records SET followup_state='returned',returned_at=$1 WHERE id='source-rental'",[now]);
await website({finish:start+25*3600000});check(true,'Open source rental stays held past planned end; audited return releases it; two billed days accepts 25 hours');
check(compileOpsSql("SELECT '?' AS literal FROM units WHERE id=? AND updated_at>?",['test',now])==="SELECT '?' AS literal FROM units WHERE id=$1 AND updated_at>$2::bigint",'Placeholder adapter preserves quoted text and timestamp width');
check(compileOpsSql('INSERT INTO audit SELECT ? WHERE changes()>0',['test'],1).endsWith('WHERE 1>0'),'Conditional audit uses the preceding statement result within the transaction');
await db.close();console.log(`${checks} consolidated inventory, payment, handover and SQL checks passed.`);
