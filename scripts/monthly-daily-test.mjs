import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('@/') ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context);
} });
const { estimateRental, ratesIdrPerDay } = await import('../src/lib/pricing.ts');
const { computeQuote } = await import('../src/lib/quote.ts');
const { bookingPaymentItems } = await import('../src/lib/paymentItems.ts');
const period = (startDate, endDate, endTime = '09:00') => ({startDate, endDate, startTime:'09:00', endTime});
let count = 0;
// Every monthly tier uses actual rental days, including short and long months.
for (const [start, end, days] of [
  ['2027-02-01','2027-03-01',28], ['2028-02-01','2028-03-01',29],
  ['2026-11-01','2026-12-01',30], ['2026-10-01','2026-11-01',31],
  ['2026-11-01','2026-12-31',60], ['2027-01-31','2027-03-31',59],
]) {
  const estimate = estimateRental('edpower', period(start,end));
  assert.equal(estimate.days, days);
  assert.equal(estimate.ratePerDayIdr, 93333);
  assert.equal(estimate.totalIdr, Math.round(2800000 / 30 * days));
  assert.equal(estimate.tier.id, 'monthly');
  count++;
}
assert.equal(estimateRental('edpower',period('2026-11-01','2026-12-01')).totalIdr,2800000);
assert.equal(estimateRental('edpower',period('2026-10-01','2026-11-01')).totalIdr,2893333);
assert.equal(estimateRental('edpower',period('2026-11-01','2026-12-01','10:00')).totalIdr,2893333);
const start='2026-11-01';
for(const model of Object.keys(ratesIdrPerDay)) {
  for(const [days,tier] of [[2,'daily'],[6,'daily'],[7,'weekly'],[13,'weekly'],[14,'twoWeeks'],[20,'twoWeeks'],[21,'threeWeeks'],[29,'threeWeeks']]) {
    const end=new Date(`${start}T09:00:00Z`);end.setUTCDate(end.getUTCDate()+days);
    const estimate=estimateRental(model,period(start,end.toISOString().slice(0,10)));
    assert.equal(estimate.totalIdr,ratesIdrPerDay[model][tier]*days);
    assert.equal(estimate.tier.id,tier);count++;
  }
}
for(const model of ['bees','victory','athena']) {
  assert.equal(estimateRental(model,period('2026-10-01','2026-11-01')).totalIdr,ratesIdrPerDay[model].monthly*31,'Other monthly pricing unchanged');
}
for(const quantity of [1,2,4,10]) {
  const prorated=computeQuote({modelSlug:'edpower',period:period('2026-10-01','2026-11-01'),quantity,pickupSlug:'showroom',returnSlug:'showroom'});
  assert.equal(prorated.baseIdr,2893333*quantity);
  assert.equal(bookingPaymentItems({vehicle_model:'edpower',rental_days:31,quantity,rate_per_day_idr:93333,base_idr:prorated.baseIdr,area_fee_idr:0,discount_idr:0},'Wedison EdPower').reduce((sum,item)=>sum+item.price*item.quantity,0),prorated.totalIdr);
  const quote=computeQuote({modelSlug:'edpower',period:period(start,'2026-12-01'),quantity,pickupSlug:'showroom',returnSlug:'showroom',discountIdr:100000});
  assert.equal(quote.baseIdr,2800000*quantity);
  const snapshot={vehicle_model:'edpower',rental_days:quote.days,quantity,rate_per_day_idr:quote.ratePerDayIdr,base_idr:quote.baseIdr,area_fee_idr:quote.areaFeeIdr,discount_idr:quote.discountIdr,discount_code:'TEST'};
  const items=bookingPaymentItems(snapshot,'Wedison EdPower');
  assert.equal(items.reduce((sum,item)=>sum+item.price*item.quantity,0),quote.totalIdr,'Midtrans items must equal the saved total, including daily proration and discounts');
  assert.ok(items.every(item=>Number.isInteger(item.price)));
  // Existing bookings retain the original price snapshot when payment is reopened.
  snapshot.base_idr=2799990*quantity;
  assert.equal(bookingPaymentItems(snapshot,'Wedison EdPower')[0].price,2799990);
  snapshot.base_idr=null;
  assert.equal(bookingPaymentItems(snapshot,'Wedison EdPower')[0].price,93333*30);
  count++;
}
console.log(`PASS: ${count} pricing/payment scenarios; actual-day monthly pricing, whole-rupiah rounding, unchanged tier boundaries/models, quantities, discounts and historical snapshots.`);
