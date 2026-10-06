import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { redemptionPoints } from '../src/lib/rideClubRules.ts';
const db=new PGlite();
for(const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort()){
  await db.exec(readFileSync(`db/migrations/${file}`,'utf8'));
}
const sql=readFileSync('db/migrations/0009_ride_club.sql','utf8').replace(/\r\n/g,'\n');
const generated=readFileSync('src/lib/rideClubSchema.ts','utf8');
assert.equal(JSON.parse(generated.split('export const RIDE_CLUB_SQL = ')[1].trim().slice(0,-1)).replace(/\r\n/g,'\n'),sql);
async function user(id,verified=true){await db.query(`insert into "user"(id,name,email,"emailVerified","updatedAt",role) values($1,$1,$2,$3,now(),'customer')`,[id,`${id}@example.test`,verified]);}
async function balance(id){return (await db.query('select ride_balance($1) as n',[id])).rows[0].n;}
async function tier(id){return (await db.query('select ride_tier_for($1) as t',[id])).rows[0].t;}
async function book(uid,base=1000000,points=0,discount=0,kind=null){
  const id=randomUUID();
  await db.query(`insert into bookings(id,client_submission_id,user_id,full_name,whatsapp_number,email,pickup_area,return_area,start_at,end_at,vehicle_model,privacy_consent_at,base_idr,discount_idr,discount_kind,ride_points,status,payment_status,payment_expires_at)
    values($1,$2,$3,'Test Rider','+628123456789','rider@example.test','canggu','canggu',now()+interval '1 day',now()+interval '3 days','bees',now(),$4,$5,$6,$7,'pending_payment','pending',now()+interval '1 hour')`,[id,randomUUID(),uid,base,points?points*200:discount,points?'points':kind,points]);
  return id;
}
async function complete(id){await db.query("update bookings set status='completed',payment_status='paid' where id=$1",[id]);}
await user('alice');
assert.equal(await balance('alice'),0);
let b=await book('alice',1000000,0,200000,'promotion');
await db.query("update bookings set payment_status='paid' where id=$1",[b]);
assert.equal(await balance('alice'),0,'Payment alone earns no points');
await complete(b);assert.equal(await balance('alice'),130,'80 earned on net rental + 50 welcome');
await complete(b);assert.equal(await balance('alice'),130,'Repeated completion is idempotent');
assert.equal(redemptionPoints(500,180000),0,'10% cap below 100 points cannot redeem');
assert.equal(redemptionPoints(500,1000000),500);assert.equal(redemptionPoints(500,500000),250);
const reserved=await book('alice',300000,100);assert.equal(await balance('alice'),30);
await assert.rejects(book('alice',300000,100),/no longer available/,'A second concurrent reservation cannot spend the same points');
await db.query("update bookings set status='cancelled' where id=$1",[reserved]);assert.equal(await balance('alice'),130,'Cancellation releases points');
const expires=await book('alice',300000,100);
await db.query("update bookings set payment_expires_at=now()-interval '1 second' where id=$1",[expires]);assert.equal(await balance('alice'),130,'Expiry releases points without waiting for cron');
await assert.rejects(book('alice',100000,100),/Invalid Ride Points discount/,'Server enforces 10% cap');
await db.query("update ride_credits set expires_at=now()-interval '1 second' where user_id='alice'");assert.equal(await balance('alice'),0,'Expired credits cannot be used');
await user('bob');let big=await book('bob',3000000);await complete(big);
assert.equal(await tier('bob'),'Gold');
const gold=await book('bob',1000000);assert.equal((await db.query('select ride_tier from bookings where id=$1',[gold])).rows[0].ride_tier,'Gold');
await complete(gold);assert.equal(await balance('bob'),475,'Qualifying booking earns Silver; next earns Gold');
big=await book('bob',4000000);await complete(big);assert.equal(await tier('bob'),'Platinum');
const platinum=await book('bob',1000000);await complete(platinum);assert.equal(await balance('bob'),1125);
await db.query("update bookings set payment_status='refunded' where id=$1",[big]);assert.equal(await tier('bob'),'Gold');assert.equal(await balance('bob'),625,'Refund reverses earning and tier spend');
await user('unverified',false);const unverified=await book('unverified');await complete(unverified);assert.equal(await balance('unverified'),100,'Unverified email gets no welcome bonus');
await db.query('update "user" set "emailVerified"=true where id=$1',['unverified']);assert.equal(await balance('unverified'),150,'Verification after rental unlocks bonus');
await db.query('update "user" set "emailVerified"=true where id=$1',['unverified']);assert.equal(await balance('unverified'),150,'Verification replay cannot duplicate bonus');
await assert.rejects(db.query("update bookings set payment_status='pending',payment_expires_at=now()+interval '1 hour' where id=$1",[expires]),/no longer available/,'Payment retry cannot revive expired points');
await user('debt');const original=await book('debt');await complete(original);const used=await book('debt',1000000,150);
await db.query("update bookings set payment_status='paid' where id=$1",[used]);
await db.query("update bookings set payment_status='refunded' where id=$1",[original]);
assert.equal(await balance('debt'),-150,'Refund after points used becomes debt, never free credit');
await db.query("update bookings set status='cancelled' where id=$1",[used]);assert.equal(await balance('debt'),0);
await user('admin-correction');const req=randomUUID();
await db.query('select ride_adjust($1,200,$2,$3,$4)',['admin-correction','Service correction','admin@example.test',req]);
await db.query('select ride_adjust($1,200,$2,$3,$4)',['admin-correction','Service correction','admin@example.test',req]);assert.equal(await balance('admin-correction'),200);
await db.query('select ride_adjust($1,-50,$2,$3,$4)',['admin-correction','Correction reversal','admin@example.test',randomUUID()]);assert.equal(await balance('admin-correction'),150);
await assert.rejects(db.query('select ride_adjust($1,-500,$2,$3,$4)',['admin-correction','Invalid adjustment','admin@example.test',randomUUID()]),/no longer available/);
assert.equal(await balance('admin-correction'),150);
await db.close();console.log('Ride Club PostgreSQL integration checks passed.');
