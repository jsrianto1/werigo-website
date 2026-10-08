# Werigo renewal

Audience: international visitors and people staying a month or longer in Bali. English is the default language. The homepage, monthly landing, fleet, shared navigation and booking interface have Indonesian and Russian translations, selected through persistent desktop/mobile controls. Existing editorial/legal pages and SAGA comic artwork retain their authored languages. These are visitor display preferences on existing URLs, not new indexed locale routes. The redesign keeps the Werigo logo and the relationship "Powered by Wedison".

## Design decisions

Design dials: variation 7/10, motion 3/10, density 4/10. White and pale mint surfaces, deep navy text, one deep teal action colour. Manrope headings, Inter body. The original Canggu riding video opens the homepage with an overlaid marketing headline without an overlaid pause button. Reduced-motion visitors see its original poster frame. This is followed by the date search, model comparison, monthly proposition, included essentials, delivery coverage and practical FAQs.

WERIGO SAGA remains a prominent entertainment section after monthly rentals, with chapter covers, first/latest chapter links and access to the complete archive. Saga is also in desktop and mobile navigation.

The generated hero, fleet and monthly section images were composition studies. Their useful layout cues were a 48/52 hero split, large left-aligned headline, compact proof strip, equal-width product columns and clear monthly rate rows. Generated motorcycle silhouettes were rejected after product comparison. No generated motorcycle image is shipped.

Every displayed rental product uses an existing Wedison photograph or product cutout. The four catalogue files were copied byte-for-byte from the local Wedison Bali assets. See verified-product-assets.json for hashes and original paths. Source geometry, colours, mirrors, lights, wheels, seat, logo and plate were not altered. Object-fit contain preserves the complete silhouette. Model availability and colour remain subject to confirmation.

Checked against https://wedison.co/, https://wedison-bali.com/, https://www.instagram.com/wedison.id/ and https://www.instagram.com/wedison.bali/ on 30 September 2026. Original management-supplied product photos remain in the repository.

## Commercial message

Use the customer's practical situation: holiday plans, coffee runs, coworking commutes and a longer Bali routine. Support the message with actual services: official Wedison motorcycles, two sanitised helmets, an installed phone holder, at least 80% battery at handover, a briefing, arranged hotel/villa delivery and local WhatsApp support from 08:00 to 20:00 WITA.

Do not imply free airport handover, guaranteed stock, instant confirmation, insurance, unlimited range or a completed online sale. Rates come from src/lib/pricing.ts. Daily pricing starts at Rp90,000 for Bees for 2 to 6 days; the monthly tier starts at Rp50,000/day for one calendar month or longer. The quote follows actual dates. Existing fee and rider-age rules remain authoritative.

## Search and campaign destinations

| Audience / intent | Destination |
| --- | --- |
| General Bali electric scooter rental | https://werigo.co/ |
| Compare vehicles and rates | https://werigo.co/fleet |
| Monthly / long-stay rental | https://werigo.co/monthly-scooter-rental-bali |
| Model-specific ad | https://werigo.co/fleet/bees (or victory, athena, edpower) |
| Location-specific search or ad | https://werigo.co/delivery-areas/canggu (or an existing service area) |

Each edited landing page has its own title, description, canonical URL and social metadata. The new monthly route is in the sitemap and navigation. Visible FAQs match the FAQ structured data. Structured data does not promise a Google rich result. Search ranking and ad return are not guaranteed.

Recommended campaign URL pattern:

`https://werigo.co/monthly-scooter-rental-bali?utm_source=facebook&utm_medium=paid_social&utm_campaign=bali_monthly&utm_content=creative_a`

Use distinct utm_content for each creative. Point the ad to the page matching its offer and rental duration. No Ads Manager campaign, budget, audience or conversion setting has been changed by this website task.

## Measurement

GTM container GTM-5RC9TGR4 and Meta Pixel 27824990167174730 are loaded from the root layout only after cookie consent (see README, Marketing tracking). The events below are sent only with the matching consent: dataLayer events need analytics or marketing consent, Meta events need marketing consent.

| Action | dataLayer event | Meta event | Meaning |
| --- | --- | --- | --- |
| Product page viewed | werigo_view_vehicle | ViewContent | Vehicle interest |
| Checkout opened | werigo_begin_checkout | InitiateCheckout | Checkout reached |
| WhatsApp link clicked | werigo_whatsapp_click | Contact | Contact attempt |
| Valid booking form opens WhatsApp | werigo_booking_handoff | BookingHandoff, custom | Prepared booking request handed to WhatsApp |

A handoff does not prove the visitor sent the message or completed a rental. No Lead or Purchase event is fabricated. Custom payloads contain model, rental days and quantity where relevant, never the customer's name, phone, email, hotel/address, form text or WhatsApp URL. Normal platform page tracking still follows the installed GTM/Pixel behaviour. Do not add the same Meta base Pixel inside GTM or duplicate these events without a deduplication plan.

GTM custom-event triggers and Ads Manager conversion selection require account-side configuration. Verify receipt using the platform's Test Events before choosing a campaign optimisation event. Official SEO reference: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
