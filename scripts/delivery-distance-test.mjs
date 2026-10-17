import assert from 'node:assert/strict';
import { deliveryFeeIdr } from '../src/lib/deliveryPricing.ts';
import { signDeliveryQuote, verifyDeliveryQuote } from '../src/lib/deliveryToken.ts';
import { identitySchema } from '../src/lib/identitySchema.ts';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { RENTAL_IDENTITY_SQL } from '../src/lib/rentalIdentitySchema.ts';

for (const [distance, fee] of [[0,0],[5000,0],[5000.1,75000],[9999.9,75000],[10000,100000],[15000,100000],[15500,102000],[18000,112000],[25000,140000]]) {
  assert.equal(deliveryFeeIdr(distance),fee,`${distance} metres`);
  assert.equal(deliveryFeeIdr(distance,true),0,'Monthly waiver');
}
for (const distance of [-1,NaN,Infinity,250001]) assert.throws(()=>deliveryFeeIdr(distance));
const secret='test-only-secret-for-delivery-quotes-123456';
const now=Date.now();
const route={version:1,area:'canggu',latitude:-8.6478,longitude:115.1385,distanceMeters:18000,expiresAt:now+1800000};
const token=signDeliveryQuote(route,secret);
assert.deepEqual(verifyDeliveryQuote(token,'canggu',secret,now),route);
assert.equal(verifyDeliveryQuote(token,'ubud',secret,now),null);
assert.equal(verifyDeliveryQuote(token,'canggu','different-secret-that-is-long-enough',now),null);
assert.equal(verifyDeliveryQuote(token,'canggu',secret,now+1800001),null);
const [payload,signature]=token.split('.');
const altered=Buffer.from(JSON.stringify({...route,distanceMeters:100})).toString('base64url');
assert.equal(verifyDeliveryQuote(`${altered}.${signature}`,'canggu',secret,now),null);
assert.equal(verifyDeliveryQuote(`${payload}.bad`,'canggu',secret,now),null);
assert.throws(()=>signDeliveryQuote(route,''));

assert.equal(identitySchema.safeParse({idType:'passport',idNumber:'A1234567'}).success,true);
assert.equal(identitySchema.parse({idType:'kitas',idNumber:'AB-1234567',drivingLicenseNumber:''}).drivingLicenseNumber,'');
assert.equal(identitySchema.safeParse({idType:'national_id',idNumber:'1234567890123456',drivingLicenseNumber:''}).success,true);
assert.equal(identitySchema.safeParse({idType:'passport',idNumber:'A1234567',drivingLicenseNumber:'?'}).success,false);
assert.equal(identitySchema.safeParse({idType:'kitas',idNumber:''}).success,false);
assert.equal(RENTAL_IDENTITY_SQL,readFileSync('db/migrations/0012_rental_identity.sql','utf8').replace(/\r\n/g,'\n'));
const db=new PGlite();
for (const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql') && f < '0012').sort()) await db.exec(readFileSync(`db/migrations/${file}`,'utf8'));
await db.query(`insert into "user" (id,name,email,"emailVerified","updatedAt") values ('rider','Test','rider@example.test',true,now())`);
await db.query(`insert into customer_identity(user_id,id_type,id_number,driving_license_number) values('rider','passport','A1234567','LIC1234')`);
await db.exec(RENTAL_IDENTITY_SQL);
assert.equal((await db.query('select id_number from customer_identity')).rows[0].id_number,'A1234567','Existing identity preserved');
await db.query(`update customer_identity set id_type='kitas',driving_license_number='' where user_id='rider'`);
await assert.rejects(db.query(`update customer_identity set id_type='invalid' where user_id='rider'`));
await db.close();
console.log('Distance tiers, monthly waiver, signed route tampering/expiry, optional licence and non-destructive identity migration passed.');
