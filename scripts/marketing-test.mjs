import assert from 'node:assert/strict';
import { defaultSearch } from '../src/lib/booking.ts';
import { resolveTier } from '../src/lib/pricing.ts';
import { trackMarketingEvent } from '../src/lib/analytics.ts';
import { consentBootstrapScript } from '../src/lib/consent.ts';

const NativeDate = Date;
for (const [today, start, end] of [
  ['2026-09-30T12:00:00','2026-10-01','2026-11-01'],
  ['2027-01-30T12:00:00','2027-01-31','2027-02-28'],
  ['2028-01-30T12:00:00','2028-01-31','2028-02-29'],
  ['2026-12-30T12:00:00','2026-12-31','2027-01-31'],
]) {
  globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [today])); } };
  const period = defaultSearch(true);
  assert.equal(period.startDate,start);
  assert.equal(period.endDate,end);
  assert.equal(resolveTier(period).id,'monthly');
}
globalThis.Date=NativeDate;
assert.doesNotThrow(()=>trackMarketingEvent('begin_checkout'));
const consentCookie=(analytics,marketing)=>`werigo_consent=${encodeURIComponent(JSON.stringify({id:'00000000-0000-4000-8000-000000000000',v:1,t:1,analytics,marketing}))}`;
const calls=[];
globalThis.window={location:{pathname:'/fleet/athena'},dataLayer:[],fbq:(...args)=>calls.push(args)};
// No choice yet: nothing reaches GTM or Meta.
globalThis.document={cookie:''};
trackMarketingEvent('view_vehicle',{content_ids:['athena']});
assert.equal(calls.length,0);
assert.equal(window.dataLayer.length,0);
// Analytics only: dataLayer yes, Meta no.
document.cookie=consentCookie(true,false);
trackMarketingEvent('begin_checkout');
assert.equal(calls.length,0);
assert.equal(window.dataLayer.length,1);
window.dataLayer=[];
document.cookie=consentCookie(true,true);
trackMarketingEvent('view_vehicle',{content_ids:['athena'],content_type:'product'});
trackMarketingEvent('begin_checkout');
trackMarketingEvent('whatsapp_click',{contact_method:'whatsapp'});
trackMarketingEvent('booking_handoff',{content_ids:['athena'],rental_days:31,num_items:1});
assert.deepEqual(calls.map(x=>x.slice(0,2)),[
  ['track','ViewContent'],['track','InitiateCheckout'],['track','Contact'],['trackCustom','BookingHandoff']
]);
assert.equal(window.dataLayer.length,4);
assert.ok(!JSON.stringify(window.dataLayer).includes('Purchase'));
assert.ok(!JSON.stringify(window.dataLayer).includes('Lead'));
window.fbq=()=>{throw new Error('blocked pixel');};
Object.defineProperty(window,'dataLayer',{get(){throw new Error('blocked GTM');}});
assert.doesNotThrow(()=>trackMarketingEvent('booking_handoff'));
delete globalThis.window;
delete globalThis.document;

// Bootstrap: with no choice, no tag script is requested and Consent Mode defaults to denied.
function bootstrap(cookie){
  const added=[];
  const el=()=>({});
  const w={};
  const d={cookie,createElement:el,head:{appendChild:(n)=>added.push(n.src)},getElementsByTagName:()=>[{parentNode:{insertBefore:(n)=>added.push(n.src)}}]};
  new Function('window','document',consentBootstrapScript())(w,d);
  return {w,added};
}
let b=bootstrap('');
assert.deepEqual(b.added,[]);
const def=b.w.dataLayer.find((x)=>x[0]==='consent'&&x[1]==='default')[2];
assert.equal(def.analytics_storage,'denied');
assert.equal(def.ad_storage,'denied');
assert.equal(b.w.fbq,undefined);
b=bootstrap(consentCookie(true,false));
assert.equal(b.added.length,1);
assert.ok(b.added[0].includes('googletagmanager.com/gtm.js'));
assert.equal(b.w.fbq,undefined);
b=bootstrap(consentCookie(true,true));
assert.equal(b.added.length,2);
assert.ok(b.added.some((s)=>s.includes('connect.facebook.net')));
b.w.__werigoLoadGtm();b.w.__werigoLoadPixel();
assert.equal(b.added.length,2);
b=bootstrap(consentCookie(true,true).replace('%22v%22%3A1','%22v%22%3A0'));
assert.deepEqual(b.added,[]);
console.log('PASS: monthly calendar defaults, leap year, month end, event semantics, cookie consent gating, SSR and blocked-tag resilience.');
