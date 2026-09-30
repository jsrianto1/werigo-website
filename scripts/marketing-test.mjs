import assert from 'node:assert/strict';
import { defaultSearch } from '../src/lib/booking.ts';
import { resolveTier } from '../src/lib/pricing.ts';
import { trackMarketingEvent } from '../src/lib/analytics.ts';

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
const calls=[];
globalThis.window={location:{pathname:'/fleet/athena'},dataLayer:[],fbq:(...args)=>calls.push(args)};
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
console.log('PASS: monthly calendar defaults, leap year, month end, event semantics, SSR and blocked-tag resilience.');
