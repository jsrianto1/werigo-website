import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { appGuides } from '../src/data/appGuides.ts';

const manifest=JSON.parse(readFileSync('public/app/manifest.webmanifest','utf8'));
assert.ok(manifest.start_url.startsWith(manifest.scope));
assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons) assert.ok(existsSync(`public${icon.src}`));
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
