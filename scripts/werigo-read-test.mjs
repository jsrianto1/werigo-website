import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {readDeviceKey,signedMessage,deviceTableSql,path,readRequest,verifyReadSignature} from '../src/lib/werigo-read.ts';

const pg=new PGlite(), require=createRequire(import.meta.url), now=Date.now(), day=86_400_000;
for(const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())await pg.exec('BEGIN;'+readFileSync('db/migrations/'+file,'utf8')+'COMMIT;');
await pg.exec(deviceTableSql);
await pg.exec('UPDATE ops.settings SET ready=true WHERE id=1');
await pg.query(`INSERT INTO public.bookings(booking_code,client_submission_id,full_name,whatsapp_number,email,pickup_area,return_area,customer_notes,start_at,end_at,vehicle_model,privacy_consent_at)
  VALUES ('WRG-WEB-FIXTURE',gen_random_uuid(),'Private test person','+62000000000','fixture@example.invalid','showroom','showroom','private-test-note',$1,$2,'athena',now())`,[new Date(now+day),new Date(now+3*day)]);
await pg.query("INSERT INTO ops.units(id,code,plate,vin,model,usage,state,created_at,updated_at) VALUES('unit-1','TEST-A1','private-plate-1','private-vin-1','athena','rental','ready',$1,$1),('unit-2','TEST-A2','private-plate-2','private-vin-2','athena','rental','ready',$1,$1)",[now]);
await pg.query("INSERT INTO ops.customers(id,name,phone,created_at,updated_at) VALUES('c1','Private Ops person','+62000000000',$1,$1)",[now]);
await pg.query(`INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,pricing_snapshot,notes,created_at,updated_at)
  VALUES('manual-1','WRG-OPS-FIXTURE','c1','["unit-1"]',$1,$2,'active','Walk-in',100000,'{}','private-test-note',$3,$3)`,[now-3*day,now-day,now]);
const rental={id:'legacy:fixture',source_id:'legacy',source_row:5,customer_id:'c1',customer_name:'Private Ops person',unit_ids:'[]',model:'athena',color:'red',vin:'private-vin',engine_number:'private-engine',quantity:1,days:2,daily_rate:1,revenue:1,start_date:'2025-01-01',end_date:'2025-01-02',source_status:'Active',sales:'',delivery:'',lead_source:'',payment_scheme:'',flags:'[]',finance_ids:'[]',source_data:'{}',followup_state:'open',followup_note:'private-test-note',created_at:now,updated_at:now};
const fields=Object.keys(rental);
await pg.query(`INSERT INTO ops.rental_records(${fields.join(',')}) VALUES(${fields.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(rental));
const pair=generateKeyPairSync('ed25519'), x=pair.publicKey.export({format:'jwk'}).x;
const {id}=readDeviceKey(x);
await pg.query("INSERT INTO ops.codex_read_devices(id,public_key,label,created_by,expires_at) VALUES($1,$2,'Test laptop','fixture',now()+interval '1 day')",[id,x]);

const stubs={
  '@/lib/db':{withTransaction:fn=>pg.transaction(fn)},
  '@/lib/cmsAccess':{boundedBody:async(req,max)=>{const b=new Uint8Array(await req.arrayBuffer());if(b.length>max)throw new RangeError();return b;}},
  '@/lib/werigo-read':await import('../src/lib/werigo-read.ts'),
};
const source=ts.transpileModule(readFileSync('src/app/api/integrations/werigo-read/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',source)(name=>stubs[name]??require(name),mod,mod.exports);
const {POST}=mod.exports;
function headers(body,time=String(Date.now())) {
 return {'Content-Type':'application/json','x-werigo-read-id':id,'x-werigo-read-time':time,'x-werigo-read-signature':sign(null,signedMessage(id,time,Buffer.from(body)),pair.privateKey).toString('base64url')};
}
const call=async(payload,options={})=>{
 const body=JSON.stringify(payload), h=options.headers ?? headers(body,options.time);
 return POST(new Request('https://werigo.co'+path,{method:'POST',headers:h,body}));
};
let checks=0;
function check(truth){assert.ok(truth);checks++;}
async function result(res,status) {assert.equal(res.status,status);checks++;return res.json();}
const bookings={tool:'list_bookings',args:{}};
await result(await call(bookings,{headers:{Cookie:'werigo_ops_session=fixture'}}),401);
await result(await call(bookings,{time:String(Date.now()-180_000)}),401);
await result(await call({...bookings,args:{reference:'WRG-WEB-FIXTURE'}},{headers:headers(JSON.stringify(bookings))}),401);
await result(await call({tool:'update_booking',args:{}}),400);
await result(await call({...bookings,args:{limit:26}}),400);
await result(await call({...bookings,args:{include_customer:true}}),400);
const list=await result(await call(bookings),200);
check(list.bookings.length===2&&list.bookings.some(b=>b.reference==='WRG-WEB-FIXTURE'&&b.source==='website')&&list.bookings.some(b=>b.reference==='WRG-OPS-FIXTURE'&&b.source==='ops'));
check(list.timezone==='Asia/Makassar');
check(!/private|whatsapp|notes|email|base_idr/.test(JSON.stringify(list).toLowerCase()));
check((await result(await call({...bookings,args:{reference:'wrg-web-fixture'}}),200)).bookings.length===1);
const stockArgs={start:new Date(now+day).toISOString(),end:new Date(now+3*day).toISOString(),model:'athena'};
const inventory=await result(await call({tool:'check_stock',args:stockArgs}),200);
assert.deepEqual(inventory.stock,[{model:'athena',rental_units:2,available:1}]);checks++;
await result(await call({tool:'check_stock',args:{...stockArgs,end:stockArgs.start}}),400);
const ops=await result(await call({tool:'check_rental_status',args:{status:'overdue'}}),200);
check(ops.rentals.length===2&&ops.rentals.some(r=>r.source==='imported'&&r.date_precision==='date_only')&&ops.rentals.some(r=>r.source==='ops'&&r.date_precision==='timestamp'));
check(!/private|whatsapp|notes|email|vin/.test(JSON.stringify(ops).toLowerCase()));
const token=headers(JSON.stringify(bookings));
check(verifyReadSignature(x,{id,time:token['x-werigo-read-time'],sig:token['x-werigo-read-signature']},Buffer.from(JSON.stringify(bookings))));
check(!readRequest.safeParse({tool:'sql',args:{query:'SELECT 1'}}).success);
await pg.query("UPDATE ops.codex_read_devices SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);
await result(await call(bookings),401);
await pg.query("UPDATE ops.codex_read_devices SET expires_at=now()+interval '1 day',revoked_at=now() WHERE id=$1",[id]);
await result(await call(bookings),401);
await pg.close();
console.log(`${checks} Werigo read-only API checks passed (isolated PostgreSQL, fixtures only).`);
