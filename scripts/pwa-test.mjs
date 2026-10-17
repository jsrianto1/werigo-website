import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { appGuides } from '../src/data/appGuides.ts';
import { defaultAppDates, appCheckoutUrl } from '../src/lib/appRental.ts';
import { APP_PICKUP_KEY, PICKUP_MAX_AGE, googleMapsSearch, googleMapsDirections, validMapsUrl, requestGps, readAppPickup, saveAppPickup, isBaliLocation } from '../src/lib/appPickup.ts';
import { rentalExtras, sanitizeExtraQuantities } from '../src/data/extras.ts';
import { appActivities } from '../src/data/appActivities.ts';

const manifest=JSON.parse(readFileSync('public/app/manifest.webmanifest','utf8'));
assert.ok(manifest.start_url.startsWith(manifest.scope));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url, '/app/login');
const baliMidnight = defaultAppDates(new Date('2026-10-17T16:30:00Z'));
assert.equal(baliMidnight.today, '2026-10-18');
assert.equal(baliMidnight.startDate, '2026-10-19');
assert.equal(baliMidnight.endDate, '2026-10-22');
assert.equal(defaultAppDates(new Date('2026-12-31T16:30:00Z')).startDate, '2027-01-02');
const appCheckout = new URL(appCheckoutUrl({pickup:'canggu',vehicle:'victory',startDate:'2026-10-20',endDate:'2026-10-27',startTime:'09:30',endTime:'10:00',ref:'VILLA&1'}), 'https://werigo.co');
assert.equal(appCheckout.pathname, '/app/rent/checkout');
assert.equal(appCheckout.searchParams.get('return'), 'canggu');
assert.equal(appCheckout.searchParams.get('vehicle'), 'victory');
assert.equal(appCheckout.searchParams.get('startTime'), '09:30');
assert.equal(appCheckout.searchParams.get('ref'), 'VILLA&1');
assert.equal(appCheckout.searchParams.has('latitude'), false);
assert.equal(appCheckout.searchParams.has('address'), false);
assert.deepEqual(rentalExtras.map(extra => extra.id), ['helmet']);
assert.equal(rentalExtras[0].maxQuantity, 2);
assert.deepEqual(sanitizeExtraQuantities([{id:'rain-poncho',quantity:1},{id:'helmet',quantity:9}]), {helmet:2});
assert.deepEqual(sanitizeExtraQuantities([{id:'helmet',quantity:-1}]), {});
assert.deepEqual(sanitizeExtraQuantities([{id:'helmet',quantity:NaN}]), {});
assert.equal(validMapsUrl('https://maps.app.goo.gl/example'), 'https://maps.app.goo.gl/example');
assert.equal(validMapsUrl('https://maps.app.goo.gl.evil.example/location'), null);
assert.equal(validMapsUrl('javascript:alert(1)'), null);
assert.equal(validMapsUrl('https://www.google.com/url?q=example.com'), null);
assert.equal(new URL(googleMapsSearch('-8.635925,115.221342')).searchParams.get('query'), '-8.635925,115.221342');
assert.equal(new URL(googleMapsDirections('La Brisa, Bali')).searchParams.get('destination'), 'La Brisa, Bali');
let stored = null;
const storage = {setItem:(key,value)=>{assert.equal(key,APP_PICKUP_KEY);stored=value;},getItem:()=>stored};
const now = Date.parse('2026-10-17T10:00:00Z');
saveAppPickup(storage,{version:1,area:'canggu',mapsUrl:googleMapsSearch('-8.65,115.13'),savedAt:now});
assert.equal(readAppPickup(storage,'canggu',now+1000).area,'canggu');
assert.equal(readAppPickup(storage,'ubud',now+1000),null);
assert.equal(readAppPickup(storage,'canggu',now+PICKUP_MAX_AGE+1),null);
assert.equal(readAppPickup(storage,'canggu',now-1),null);
assert.equal(isBaliLocation({latitude:-8.635925,longitude:115.221342,accuracy:10}),true);
assert.equal(isBaliLocation({latitude:55.75,longitude:37.61,accuracy:10}),false);
const gps=await requestGps({getCurrentPosition:(success,error,options)=>{assert.equal(options.enableHighAccuracy,true);assert.equal(options.timeout,12000);success({coords:{latitude:-8.65,longitude:115.13,accuracy:12}});}});
assert.equal(gps.accuracy,12);
await assert.rejects(requestGps({getCurrentPosition:(success,error)=>error({code:1})}), /denied/);
await assert.rejects(requestGps({getCurrentPosition:(success,error)=>error({code:3})}), /timed out/);
await assert.rejects(requestGps(undefined), /not supported/);
for(const icon of manifest.icons) {
  const image = readFileSync(`public${icon.src}`);
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${image.readUInt32BE(16)}x${image.readUInt32BE(20)}`, icon.sizes, 'Install icon dimensions must match the manifest');
}
const charging = JSON.parse(readFileSync('src/data/appChargingStations.json', 'utf8'));
assert.equal(charging.stations.length, 15, 'The official source lists fifteen locations');
assert.equal(new Set(charging.stations.map(station => station.name)).size, 15);
for (const station of charging.stations) {
  assert.ok(['DENPASAR', 'BADUNG', 'GIANYAR'].includes(station.area));
  assert.ok(station.name && station.address);
  assert.equal(validMapsUrl(station.mapsUrl), station.mapsUrl, 'Charging directions must use an approved Maps host');
}
for (const category of ['Surfing', 'Snorkeling', 'Parasailing', 'Rafting', 'Culture']) {
  assert.ok(appActivities.some(activity => activity.category === category), `Missing activity category: ${category}`);
}
for (const activity of appActivities) {
  assert.ok(existsSync(`public${activity.image}`), `Missing activity photo: ${activity.image}`);
  assert.equal(new URL(activity.website).protocol, 'https:');
  assert.ok(activity.tip && activity.photoLabel, 'Activities must explain visit arrangements and photo context');
}
for(const guide of appGuides) assert.ok(existsSync(`public${guide.image}`));
assert.equal(new Set(appGuides.map(guide=>guide.slug)).size,appGuides.length);

const listeners={}; let networkFails=false; let cached=[]; let deleted=[];
const fallback={offline:true};
const context={URL,Response,fetch:async()=>{if(networkFails)throw Error('offline');return {network:true};},
  caches:{open:async()=>({add:async path=>cached.push(path)}),keys:async()=>['another-app-cache','werigo-app-offline-old'],delete:async key=>deleted.push(key),match:async()=>fallback},
  self:{location:{origin:'https://werigo.co'},addEventListener:(name,handler)=>{listeners[name]=handler;},skipWaiting:async()=>{},clients:{claim:async()=>{}}}};
vm.runInNewContext(readFileSync('public/app/sw.js','utf8'),context);
let task; listeners.install({waitUntil:promise=>{task=promise;}});await task;
assert.deepEqual(cached,['/app/offline.html']);
listeners.activate({waitUntil:promise=>{task=promise;}});await task;
assert.deepEqual(deleted,['werigo-app-offline-old']);
async function request(path,{method='GET',mode='navigate'}={}){let intercepted=false;let response;listeners.fetch({request:{method,mode,url:`https://werigo.co${path}`},respondWith:promise=>{intercepted=true;response=promise;}});return {intercepted,response:await response};}
assert.equal((await request('/api/account/bookings')).intercepted,false);
assert.equal((await request('/account')).intercepted,false);
assert.equal((await request('/book/checkout')).intercepted,false);
assert.equal((await request('/app/explore',{method:'POST'})).intercepted,false);
assert.equal((await request('/app/explore')).response.network,true);
networkFails=true;
assert.equal((await request('/app/explore')).response,fallback);
assert.deepEqual(cached,['/app/offline.html'],'No customer or guide responses cached');
console.log('PWA manifest, guide assets, worker scope, cache isolation and offline fallback passed.');
