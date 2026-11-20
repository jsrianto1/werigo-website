// Real promotion resolution and SQL guards against a disposable local database.
// No production connection, customer data, payment provider or env changes.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const root=new URL('../',import.meta.url),db=new PGlite();
globalThis.__christmasDb={query:async (...args)=>{const r=await db.query(...args);return {...r,rowCount:r.affectedRows??r.rows.length};}};
const mod=s=>'data:text/javascript,'+encodeURIComponent(s);
const mocks={
 'server-only':mod('export default {};'),
 '@/lib/db':mod('export const getPool=()=>globalThis.__christmasDb;'),
 '@/lib/referrals':mod('export const findReferralOwner=async()=>null;'),
 '@/lib/settings':mod('export const getReferralSettings=async()=>({});'),
 '@/lib/rideClub':mod('export const rideDiscount=async()=>({points:100,discountIdr:20000});'),
};
registerHooks({resolve(specifier,context,next){
 if(mocks[specifier])return {url:mocks[specifier],shortCircuit:true};
 if(specifier.startsWith('@/')){const p=fileURLToPath(new URL('src/'+specifier.slice(2)+'.ts',root));if(existsSync(p))return {url:pathToFileURL(p).href,shortCircuit:true};}
 return next(specifier,context);
}});
for(const file of readdirSync(new URL('db/migrations/',root)).filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
const sql=readFileSync(new URL('db/migrations/0021_christmas_promotions.sql',root),'utf8').replaceAll('\r\n','\n');
const {CHRISTMAS_PROMOTIONS_SQL}=await import('../src/lib/christmasPromotionSchema.ts');
assert.equal(CHRISTMAS_PROMOTIONS_SQL.replaceAll('\r\n','\n'),sql);
const {customerContext,createPromotion,updatePromotion}=await import('../src/lib/promotions.ts');
const {resolveDiscounts,pickDiscount}=await import('../src/lib/discounts.ts');
const {promotionInputSchema}=await import('../src/lib/promotionRules.ts');
const campaigns=(await db.query('select * from public.promotions where code in ($1,$2) order by discount_value desc',['NEWCHRISTMAS','CHRISTMAS26'])).rows;
assert.equal(campaigns.length,2);
for(const p of campaigns){
 assert.equal(p.max_discount_idr,null); assert.equal(p.audience,'public');
 for(const [when,valid] of [['2026-11-19T23:59:59+08:00',false],['2026-11-20T00:00:00+08:00',true],['2026-12-31T23:59:59.999+08:00',true],['2027-01-01T00:00:00+08:00',false]]){
  const r=await db.query('select $1::timestamptz>=starts_at and $1::timestamptz<ends_at as live from public.promotions where id=$2',[when,p.id]);assert.equal(r.rows[0].live,valid);
 }
}
// Make the remaining test independent of the machine's calendar date.
await db.exec("update public.promotions set starts_at=now()-interval '1 day',ends_at=now()+interval '1 day' where code in ('NEWCHRISTMAS','CHRISTMAS26')");
await db.exec('update ops.settings set ready=false');
async function user(id,verified=true){await db.query('insert into public."user"(id,name,email,"emailVerified","updatedAt",role) values($1,$1,$2,$3,now(),\'customer\')',[id,id+'@example.invalid',verified]);}
async function booking(uid,code=null,discount=0,patch={}){
 const id=randomUUID(),p=campaigns.find(p=>p.code===code);
 await db.query(`insert into public.bookings(id,client_submission_id,user_id,full_name,whatsapp_number,email,
 pickup_area,return_area,start_at,end_at,vehicle_model,privacy_consent_at,base_idr,area_fee_idr,total_idr,
 discount_idr,discount_kind,promotion_id,discount_code,status,payment_status,payment_expires_at)
 values($1,$2,$3,'Local QA','+12025550123','qa@example.invalid','showroom','showroom',now()+interval '10 days',now()+interval '13 days',
 'edpower',now(),570000,100000,670000-$4,$4,$5,$6,$7,$8,$9,$10)`,
 [id,randomUUID(),uid,discount,p?'promotion':null,p?.id??null,code,patch.status??'pending_payment',patch.payment??'pending',patch.expiry??new Date(Date.now()+3600000).toISOString()]);
 return id;
}
await user('new');await user('returning');await user('ops-linked');await user('unverified',false);
const input={modelSlug:'edpower',rentalIdr:570000};
let r=await resolveDiscounts({...input,userId:'new',code:' newchristmas '});
assert.equal(r.codeStatus.ok,true);assert.equal(pickDiscount(r).discountIdr,142500);
assert.equal(pickDiscount(r).code,'NEWCHRISTMAS');assert.equal(pickDiscount(r,'none'),null);
assert.equal(570000-pickDiscount(r).discountIdr+100000,527500,'Delivery is not discounted');
assert.equal((await resolveDiscounts({...input,userId:'new',code:'CHRISTMAS26'})).codeStatus.ok,false);
await assert.rejects(booking('new','CHRISTMAS26',114000),e=>e.code==='P0002');
await assert.rejects(booking('new','NEWCHRISTMAS',150000),e=>e.code==='P0002','Client cannot overstate discount');
let b=await booking('new','NEWCHRISTMAS',142500);
await assert.rejects(booking('new','NEWCHRISTMAS',142500),e=>e.code==='P0002','Second unpaid hold cannot reuse first-booking offer');
await db.query("update public.bookings set payment_status='expired',status='expired' where id=$1",[b]);
b=await booking('new','NEWCHRISTMAS',142500);
await db.query("update public.bookings set payment_status='paid' where id=$1",[b]);
assert.equal((await resolveDiscounts({...input,userId:'new',code:'NEWCHRISTMAS'})).codeStatus.ok,false);
assert.equal((await resolveDiscounts({...input,userId:'new',code:'CHRISTMAS26'})).codeStatus.ok,true);
await assert.rejects(booking('new','NEWCHRISTMAS',142500),e=>e.code==='P0002');
await booking('returning',null,0,{status:'confirmed',payment:'unpaid'});
assert.equal((await customerContext('returning')).hasPreviousBooking,true,'Confirmed manual web booking qualifies');
await booking('returning','CHRISTMAS26',114000);
await booking('returning','CHRISTMAS26',114000);
assert.equal((await resolveDiscounts({...input,userId:'returning',code:'CHRISTMAS26'})).options.filter(p=>p.kind==='promotion').length,1);
for(const uid of ['ops-linked','unverified']){
 await db.query("insert into ops.customers(id,name,phone,email,created_at,updated_at) values($1,$1,'+12025550123',$2,1,1)",[uid,uid+'@example.invalid']);
 await db.query("insert into ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,base_idr,pricing_snapshot,created_at,updated_at) values($1,$1,$1,$2,1,2,'completed','Walk-in',570000,'{}',1,1)",[uid,JSON.stringify(['qa-history-unit'])]);
}
assert.equal((await customerContext('ops-linked')).hasPreviousBooking,true);
assert.equal((await customerContext('unverified')).hasPreviousBooking,false,'Unverified email cannot claim an Ops history');
assert.equal((await resolveDiscounts({...input,userId:'ops-linked',code:'CHRISTMAS26'})).codeStatus.ok,true);
await user('imported');
await db.query("insert into ops.customers(id,name,phone,email,created_at,updated_at) values('imported','Import QA','+12025550123','imported@example.invalid',1,1)");
const imported={id:'qa-import',source_id:'local-qa',source_row:1,customer_id:'imported',customer_name:'Import QA',unit_ids:'[]',model:'edpower',color:'red',vin:'qa',engine_number:'qa',quantity:1,days:3,daily_rate:190000,revenue:570000,start_date:'2026-10-01',end_date:'2026-10-04',source_status:'Done',sales:'',delivery:'',lead_source:'',payment_scheme:'',flags:'[]',finance_ids:'[]',source_data:'{}',followup_state:'returned',followup_note:'',created_at:1,updated_at:1};
await db.query(`insert into ops.rental_records(${Object.keys(imported).join(',')}) values(${Object.values(imported).map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(imported));
assert.equal((await customerContext('imported')).hasPreviousBooking,true,'Imported rentals also qualify through verified email');
const inputData=promotionInputSchema.parse({code:'LOCALQA',title:'Local CRUD check',audience:'public',discountType:'percent',discountValue:5,returningBookingOnly:true});
const created=await createPromotion(inputData,'qa@example.invalid');
assert.equal(created.returning_booking_only,true);assert.equal(created.created_by,'qa@example.invalid');
assert.equal((await updatePromotion(created.id,{...inputData,discountValue:10})).discount_value,10);
await db.exec("update public.promotions set active=false where code='CHRISTMAS26'");
assert.equal((await resolveDiscounts({...input,userId:'returning',code:'CHRISTMAS26'})).codeStatus.ok,false);
await assert.rejects(booking('returning','CHRISTMAS26',114000),e=>e.code==='P0002','Paused offer rejected at insert');
await db.exec("update public.promotions set active=true,ends_at=now()-interval '1 hour',starts_at=now()-interval '1 day' where code='CHRISTMAS26'");
await assert.rejects(booking('returning','CHRISTMAS26',114000),e=>e.code==='P0002','Expired offer rejected at insert');
assert.equal(promotionInputSchema.safeParse({code:'INVALID',title:'Invalid',audience:'public',discountType:'percent',discountValue:20,firstBookingOnly:true,returningBookingOnly:true}).success,false);
await db.close();console.log('PASS: Christmas date boundaries, actual discount resolution, delivery exclusion, one-discount selection, new/returning/Ops eligibility, unverified-email rejection, first-booking hold/reuse guards, exact server amount, pause and expiry.');
