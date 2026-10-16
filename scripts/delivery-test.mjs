import assert from 'node:assert/strict';
import { serviceAreas, getArea, needsDeliveryConfirmation } from '../src/data/locations.ts';

for (const area of serviceAreas) {
  assert.equal(area.deliveryFee, area.slug === 'denpasar' ? 75000 : 100000, area.slug);
  assert.equal(needsDeliveryConfirmation(area.slug, area.slug, false), area.slug !== 'denpasar', area.slug);
  assert.equal(needsDeliveryConfirmation(area.slug, area.slug, true), false, 'Monthly waiver remains');
}
assert.equal(needsDeliveryConfirmation('denpasar', 'ubud', false), true);
assert.equal(needsDeliveryConfirmation('canggu', 'denpasar', false), true);
assert.equal(needsDeliveryConfirmation('denpasar', 'denpasar', false), false);
assert.equal(needsDeliveryConfirmation('airport-domestic', 'airport-international', false), false);
assert.equal(Math.max(getArea('canggu').deliveryFee, getArea('ubud').deliveryFee), 100000, 'One fee covers both legs');
console.log('Delivery base fees and manual confirmation gates passed.');
