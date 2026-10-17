import assert from 'node:assert/strict';
import { serviceAreas, getArea, getPickupPoint, needsDeliveryConfirmation } from '../src/data/locations.ts';

for (const area of serviceAreas) {
  assert.equal(area.deliveryFee, area.slug === 'denpasar' ? 75000 : 100000, area.slug);
  assert.equal(needsDeliveryConfirmation(area.slug, area.slug, false), true, area.slug);
  assert.equal(needsDeliveryConfirmation(area.slug, area.slug, true), false, 'Monthly waiver remains');
}
assert.equal(needsDeliveryConfirmation('denpasar', 'ubud', false), true);
assert.equal(needsDeliveryConfirmation('canggu', 'denpasar', false), true);
assert.equal(needsDeliveryConfirmation('denpasar', 'denpasar', false), true);
assert.equal(needsDeliveryConfirmation('airport-domestic', 'airport-international', false), true);
assert.equal(getPickupPoint('showroom').isAirport, false);
assert.equal(getArea('showroom'), undefined, 'Showroom is not a delivery area');
assert.equal(needsDeliveryConfirmation('showroom', 'showroom', false), false);
assert.equal(needsDeliveryConfirmation('showroom', 'ubud', false), true);
assert.equal(Math.max(getArea('canggu').deliveryFee, getArea('ubud').deliveryFee), 100000, 'One fee covers both legs');
console.log('Delivery base fees and manual confirmation gates passed.');

assert.equal(needsDeliveryConfirmation('canggu','canggu',false,18000),false);
assert.equal(needsDeliveryConfirmation('canggu','ubud',false,18000),true);
