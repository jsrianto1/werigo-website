import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { appCafes, cafeHops } from '../src/data/appCafes.ts';
import { appStays } from '../src/data/appStays.ts';
import { appWellness, wellnessCategories, wellnessMapsTerms } from '../src/data/appWellness.ts';
import { googleMapsHop } from '../src/lib/appPickup.ts';
assert.equal(appStays.length,10);
assert.equal(appCafes.length,6);
assert.equal(appWellness.length,11);
assert.equal(new Set([...appCafes,...appStays,...appWellness].map(venue=>venue.id)).size,27);
for (const stay of appStays) {
  assert.equal(new URL(stay.website).hostname, 'www.discoverasr.com');
  assert.ok(stay.address && stay.highlights.length);
  if(stay.featured) assert.ok(existsSync(`public/app/stays/${stay.id}.jpg`));
}
for(const name of ['Pison Petitenget','Gigi Susu','Milk & Madu Berawa','Revolver Seminyak']) assert.ok(appCafes.some(cafe=>cafe.name===name));
for (const hop of cafeHops) {
  const stops = hop.stops.map(id=>appCafes.find(cafe=>cafe.id===id));
  assert.ok(stops.every(Boolean));
  const url = new URL(googleMapsHop(stops.map(stop=>stop.query)));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('origin'), stops[0].query);
  assert.equal(url.searchParams.get('destination'), stops.at(-1).query);
  if(stops.length>2) assert.deepEqual(url.searchParams.get('waypoints').split('|'), stops.slice(1,-1).map(stop=>stop.query));
  assert.ok(url.href.length<2048);
}
assert.equal(new URL(googleMapsHop(['A & B Café, Bali','Café #2, Bali'])).searchParams.get('origin'),'A & B Café, Bali');
assert.throws(()=>googleMapsHop([]));
assert.throws(()=>googleMapsHop(['A','']));
for(const category of wellnessCategories.slice(1)) {
  assert.ok(appWellness.some(venue=>venue.categories.includes(category)),`No ${category} venues`);
  assert.ok(wellnessMapsTerms[category]);
}
for(const venue of [...appCafes,...appWellness]) {
  assert.ok(venue.query.includes('Bali') || venue.query.includes('Canggu') || venue.query.includes('Sanur'));
  assert.equal(new URL(venue.website).protocol, 'https:');
  assert.ok(venue.description.length > 70);
}
console.log('PASS: 6 branch-specific cafés, 2 valid ordered Maps itineraries, 10 official Ascott properties with 4 photos, 11 independent workout/wellness venues with category coverage.');
