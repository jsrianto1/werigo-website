import assert from 'node:assert/strict';
import { serviceAreas, getArea, getPickupPoint } from '../src/data/locations.ts';

for (const area of serviceAreas) {
  assert.equal(area.deliveryFee, area.slug === 'denpasar' ? 75000 : 100000, area.slug);
}
assert.equal(getPickupPoint('showroom').isAirport, false);
assert.equal(getArea('showroom'), undefined, 'Showroom is not a delivery area');
assert.equal(Math.max(getArea('canggu').deliveryFee, getArea('ubud').deliveryFee), 100000, 'One fee covers both legs');
console.log('Delivery base fees passed.');
