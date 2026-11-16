import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {reserveAthenaForRto,OPERATION} from './ops-reserve-athena-rto.mjs';
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const now=Date.parse('2026-11-16T04:00:00Z'),DAY=86400000;
async function fixture(extra=false){
 const db=new PGlite();for(const f of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec('BEGIN;'+readFileSync('db/migrations/'+f,'utf8')+'COMMIT;');
 await db.exec('UPDATE ops.settings SET ready=true WHERE id=1');
 for(const [id,model]of [['athena-test','athena'],['edpower-test','edpower'],...(extra?[['athena-second','athena']]:[])])await db.query("INSERT INTO ops.units(id,code,model,usage,state,notes,created_at,updated_at) VALUES($1,$1,$2,'rental','ready','Original note',$3,$3)",[id,model,now]);
 return db;
}
let db=await fixture();
try{
 const r=await reserveAthenaForRto(db,now);
 check(r.applied&&r.units_changed===1,'Reserve exactly the single currently available Athena');
 check(r.current_stock.find(x=>x.model==='athena').available===0,'Public stock function withdraws Athena');
 check(r.current_stock.find(x=>x.model==='edpower').available===1,'EdPower stock remains available and unchanged');
 let unit=(await db.query("SELECT * FROM ops.units WHERE id='athena-test'")).rows[0];
 check(unit.state==='inactive'&&unit.usage==='rental','Temporary hold does not pretend the bike has already been sold');
 check(unit.notes.startsWith('Original note\n')&&unit.notes.includes('RTO HOLD'),'Preserve original notes and record the temporary RTO reason');
 check((await db.query('SELECT count(*)::int n FROM ops.audit WHERE id=$1',[OPERATION])).rows[0].n===1,'Write one auditable, idempotent operation');
 const again=await reserveAthenaForRto(db,now+1);
 check(again.already_recorded&&again.units_changed===0,'Rerunning never reserves another unit');
 await db.query("UPDATE ops.units SET state='ready' WHERE id='athena-test'");
 const released=await reserveAthenaForRto(db,now+2);
 check(released.units_changed===0&&released.state==='ready','A later owner release is not silently undone by a rerun');
 check((await db.query('SELECT count(*)::int n FROM public.bookings')).rows[0].n===0,'No customer booking created by a stock hold');
 check((await db.query('SELECT count(*)::int n FROM public.payments')).rows[0].n===0,'No payment created by a stock hold');
}finally{await db.close();}
db=await fixture(true);
try{
 await assert.rejects(()=>reserveAthenaForRto(db,now),/RTO_EXPECTED_ONE_AVAILABLE_ATHENA/);checks++;
 check((await db.query("SELECT count(*)::int n FROM ops.units WHERE model='athena' AND state='ready'")).rows[0].n===2,'Ambiguous targets leave both units untouched');
 check((await db.query('SELECT count(*)::int n FROM ops.audit WHERE id=$1',[OPERATION])).rows[0].n===0,'An aborted selection leaves no false reservation audit');
}finally{await db.close();}
db=await fixture();
try{
 const id=randomUUID();await db.query("INSERT INTO public.bookings(id,client_submission_id,full_name,whatsapp_number,pickup_area,return_area,start_at,end_at,vehicle_model,privacy_consent_at,status,payment_status,base_idr,total_idr,quantity) VALUES($1,$2,'Local QA','+12025550123','showroom','showroom',$3,$4,'athena',now(),'confirmed','unpaid',0,0,1)",[id,randomUUID(),new Date(now+10*DAY).toISOString(),new Date(now+12*DAY).toISOString()]);
 await assert.rejects(()=>reserveAthenaForRto(db,now),/RTO_UNIT_HAS_EXISTING_COMMITMENT/);checks++;
 check((await db.query("SELECT state FROM ops.units WHERE id='athena-test'")).rows[0].state==='ready','An upcoming customer reservation prevents taking the unit for indefinite RTO');
 check((await db.query('SELECT status FROM public.bookings WHERE id=$1',[id])).rows[0].status==='confirmed','Existing customer booking remains unchanged');
 check((await db.query('SELECT count(*)::int n FROM ops.audit WHERE id=$1',[OPERATION])).rows[0].n===0,'A commitment conflict rolls back the entire stock operation');
}finally{await db.close();}
console.log(`${checks} Athena temporary RTO stock, safety and idempotency checks passed; disposable database only.`);
