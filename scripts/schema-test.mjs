import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

// Resolve the app's own aliases while running its real TS modules under Node 24.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const source = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
  return nextResolve(specifier, context);
} });
const { siteIdentitySchema, homePageSchema, fleetCollectionSchema, vehicleSchema, breadcrumbSchema, faqSchema, jsonLd } = await import('../src/lib/schema.ts');
const { site } = await import('../src/lib/config.ts');
const { getPrimaryCards } = await import('../src/data/vehicles.ts');
const { ratesIdrPerDay, MIN_RENTAL_DAYS, pricingTiers } = await import('../src/lib/pricing.ts');
const { marketingFaqs } = await import('../src/data/marketingFaqs.ts');
const identity = siteIdentitySchema();
assert.equal(identity['@graph'].length, 2);
const [business, website] = identity['@graph'];
assert.equal(business.telephone, '+628157011969');
assert.equal(business.address.streetAddress, site.address.streetAddress);
assert.deepEqual(business.geo, { '@type':'GeoCoordinates', ...site.geo });
assert.equal(business.openingHoursSpecification[0].opens, '08:00');
assert.equal(business.openingHoursSpecification[0].closes, '20:00');
assert.equal(business.openingHoursSpecification[0].dayOfWeek.length, 7);
assert.match(business.priceRange, /90,000–190,000.*2–6/);
assert.equal(website.publisher['@id'], business['@id']);
assert.equal(homePageSchema().isPartOf['@id'], website['@id']);
assert.equal(website.potentialAction, undefined, 'No invented public site-search endpoint');
const cards = getPrimaryCards();
const collection = fleetCollectionSchema(cards);
assert.equal(collection.mainEntity.numberOfItems, 4);
assert.deepEqual(collection.mainEntity.itemListElement.map(item=>item.url), cards.map(card=>`${site.baseUrl}/fleet/${card.modelSlug}`));
assert.match(pricingTiers.find(tier=>tier.id==='daily').range, /2 to 6 days/);
for (const card of cards) {
  const product = vehicleSchema(card);
  assert.equal(product.brand.name, 'Wedison');
  assert.equal(product.offers.price, ratesIdrPerDay[card.modelSlug].daily);
  assert.equal(product.offers.priceCurrency, 'IDR');
  assert.match(product.offers.businessFunction, /LeaseOut$/);
  assert.equal(product.offers.eligibleDuration.minValue, MIN_RENTAL_DAYS);
  assert.equal(product.offers.eligibleDuration.maxValue, 6, 'Daily price must not imply a weekly/monthly rate');
  assert.equal(product.offers.priceSpecification.referenceQuantity.unitCode, 'DAY');
  assert.equal(product.offers.seller['@id'], business['@id']);
  assert.equal(product.offers.availability, undefined, 'Live date availability is not established');
  assert.equal(product.aggregateRating, undefined);
  assert.equal(product.review, undefined);
  assert.ok(existsSync(fileURLToPath(new URL(`../public${new URL(product.image).pathname}`, import.meta.url))));
}
const breadcrumbs = breadcrumbSchema([{ name:'Home',path:'/' },{ name:'Our Fleet',path:'/fleet' }]);
assert.equal(breadcrumbs['@id'], collection.breadcrumb['@id']);
assert.deepEqual(breadcrumbs.itemListElement.map(item=>item.position), [1,2]);
assert.equal(faqSchema(marketingFaqs).mainEntity[0].acceptedAnswer.text, marketingFaqs[0].answer);
const dangerous = { name:'</script><script>alert(1)</script>' };
assert.ok(!jsonLd(dangerous).includes('<'));
assert.deepEqual(JSON.parse(jsonLd(dangerous)), dangerous);
console.log('PASS: connected site/business identity, approved NAP/hours/rates, rental duration and units, fleet list, breadcrumbs, visible FAQ content, JSON-LD injection safety.');
