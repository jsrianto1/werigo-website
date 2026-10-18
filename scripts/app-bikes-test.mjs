import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('@/') ? new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href : specifier,context);
} });
const { getAppBikes } = await import('../src/data/appBikes.ts');
const { getListedModels, sharedSpec } = await import('../src/data/vehicles.ts');
const bikes = getAppBikes();
assert.equal(bikes.length,getListedModels().length);
assert.deepEqual(bikes.map(b=>b.id),['edpower','athena','victory','bees']);
assert.equal(bikes[0].image,'/app/edpower-red.webp');
assert.equal(bikes[0].minimumAge,25);
for(const bike of bikes) {
  assert.ok(existsSync(`public${bike.image}`));
  assert.ok(bike.character && bike.introduction && bike.bestFor);
  assert.equal(bike.highlights.length,4);
  assert.equal(new Set(bike.highlights.map(h=>h.title)).size,4);
  assert.ok(bike.highlights.every(h=>h.title && h.detail));
  assert.doesNotMatch(JSON.stringify(bike),/\bundefined\b|\bnull\b/);
  assert.ok(!('colors' in bike) && !('colours' in bike));
  if(sharedSpec(bike.modelSlug,'claimedRangeKm')===null) assert.ok(!bike.highlights.some(h=>/ km\b/.test(h.title)),'Do not pick a range for models whose variants differ');
}
const bees=bikes.find(b=>b.id==='bees');
assert.equal(bees.supercharge,false);
assert.ok(bees.highlights.some(h=>h.detail.includes('does not support SuperCharge')));
assert.ok(bikes[0].highlights.some(h=>h.detail.includes('Apple CarPlay') && h.detail.includes('Android Auto')));
console.log('PASS: four model-specific profiles use approved shared specs, EdPower red leads, rider age shown, Bees charging remains accurate, no colour selection.');
