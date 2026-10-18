import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('@/') ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context);
} });
const { estimateRental, rentalRateDescription, ratesIdrPerDay } = await import('../src/lib/pricing.ts');
const { computeQuote } = await import('../src/lib/quote.ts');
const { bookingPaymentItems } = await import('../src/lib/paymentItems.ts');
const period = (startDate, endDate, endTime = '09:00') => ({startDate, endDate, startTime:'09:00', endTime});
let count = 0;
for (const [start, end] of [['2027-02-01','2027-03-01'], ['2028-02-01','2028-03-01'], ['2026-11-01','2026-12-01'], ['2026-10-01','2026-11-01'], ['2027-01-31','2027-02-28']]) {
  const estimate = estimateRental('edpower', period(start,end));
  assert.equal(estimate.totalIdr,2800000);
  assert.deepEqual(estimate.monthlyPackage,{priceIdr:2800000,months:1,extraDays:0});
  assert.equal(rentalRateDescription(estimate),'Rp 2,800,000/calendar month · 1 month');
  count++;
}
for (const [end,total,months,extraDays] of [['2027-01-01',5600000,2,0],['2026-12-02',2893333,1,1],['2027-01-03',5786666,2,2]]) {
  const estimate=estimateRental('edpower',period('2026-11-01',end));
  assert.equal(estimate.totalIdr,total);
  assert.equal(estimate.monthlyPackage.months,months);
  assert.equal(estimate.monthlyPackage.extraDays,extraDays);
  count++;
}
assert.equal(estimateRental('edpower',period('2026-11-01','2026-12-01','10:00')).totalIdr,2893333);
assert.equal(estimateRental('edpower',period('2027-01-31','2027-03-31')).totalIdr,5600000,'Anniversaries stay anchored to original month end');
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
  const quote=computeQuote({modelSlug:'edpower',period:period(start,'2026-12-01'),quantity,pickupSlug:'showroom',returnSlug:'showroom',discountIdr:100000});
  assert.equal(quote.baseIdr,2800000*quantity);
  const snapshot={vehicle_model:'edpower',rental_days:quote.days,quantity,rate_per_day_idr:quote.ratePerDayIdr,base_idr:quote.baseIdr,area_fee_idr:quote.areaFeeIdr,discount_idr:quote.discountIdr,discount_code:'TEST'};
  const items=bookingPaymentItems(snapshot,'Wedison EdPower');
  assert.equal(items.reduce((sum,item)=>sum+item.price*item.quantity,0),quote.totalIdr,'Midtrans items must equal the saved total, including packages and discounts');
  assert.ok(items.every(item=>Number.isInteger(item.price)));
  // Existing bookings retain the original price snapshot when payment is reopened.
  snapshot.base_idr=2799990*quantity;
  assert.equal(bookingPaymentItems(snapshot,'Wedison EdPower')[0].price,2799990);
  snapshot.base_idr=null;
  assert.equal(bookingPaymentItems(snapshot,'Wedison EdPower')[0].price,93333*30);
  count++;
}
console.log(`PASS: ${count} pricing/payment scenarios; exact calendar-month packages, extra days, unchanged tier boundaries/models, quantities, discounts and historical snapshots.`);
