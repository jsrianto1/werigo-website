# Werigo PWA rental journey

Design applies to `/app/*` only: porcelain surfaces (#f8f9f7), charcoal actions (#142b2b), mineral teal (#007d72), quiet green-grey controls, generous spacing and official Werigo/Wedison imagery. The public website retains its layout, video and SAGA; its withdrawn poncho/protection offers and automatic-helmet claims are removed as explicitly requested.

## Opening and navigation

Installed start URL: `/app/login`. Anonymous visitors see login/sign-up first. Existing sessions return to `/app/rent`. `/app` also resolves the session and redirects accordingly. Home has a central RENT action and bottom navigation: Home, Bookings, RENT, What to do?, Account. Account includes Ride Club rewards.

RENT -> showroom pick-up OR delivery -> delivery map (delivery only) -> dates -> priced model -> motorcycle quantity and 0–2 optional helmets -> rider details -> review and payment/request.

Showroom handover uses the real `showroom` pickup point. Both collection and return are at the Gatot Subroto showroom; no delivery fee. Server validation recognises the pickup point, and submitted deliveryMethod is `pickup`. Delivery uses a verified one-way road route from the showroom. The fee covers delivery and collection, once per booking: <=5 km free; >5 and <10 km Rp75,000; 10–15 km Rp100,000; >15 km adds Rp4 per extra metre (Rp4,000/km, proportional). Monthly rentals are free. Different return locations or an unavailable/unverified route require a manual quote before payment.

## Location

Google Maps Platform credentials are not available. Leaflet + OpenStreetMap supply the interactive map, with visible attribution and ordinary browser tile caching; tiles are never prefetched or cached by the service worker. Users can move the map, select a point with the keyboard, use GPS explicitly, or paste a Google Maps share link. Google Maps universal links open the selected point without an API key. No Google affiliation or Google-rendered-map claim.

The pin must be confirmed before continuing. Moving the map invalidates the previous confirmation. Location stays in sessionStorage for 30 minutes, must match the selected area, and expires before checkout entry if needed. Exact coordinates are not added to navigation URLs or analytics. The confirmed link pre-fills booking address details and is sent only through the existing explicitly submitted booking request. App address drafts are excluded from persistent localStorage. GPS permissions are enabled only for `/app/*` and `/book/*`; no automatic GPS prompt or background tracking.

Sources: https://leafletjs.com/examples/quick-start/ ; https://operations.osmfoundation.org/policies/tiles/ ; https://developers.google.com/maps/documentation/urls/get-started

## Business rules and payment

Use the shared rental pricing engine and the existing booking/auth/payment services. No environment values changed. No new cancellation fee is invented: cancellation/refund terms are confirmed by the team because the central policy is not yet approved. Rain poncho, insurance and optional protection are not offered. Helmets default to zero, maximum two per booking, free when selected; motorcycle quantity is a separate control (1–4).

Existing database mode opens Midtrans for eligible quotes. Existing WhatsApp mode and delivery routes requiring distance confirmation must get a final quote before payment. Do not present these enquiries as paid or confirmed bookings. No test order, payment or real user location is submitted during QA.

## Other app services and installation

What to do? contains independent Bali venue ideas linked to their official sites and Google Maps; these are not contracted merchants, charging locations or star-rated partners. Existing area guides, real order history and Ride Club remain accessible.

Manifest scope `/app/`, standalone display, official 192/512/maskable icons. Android install prompt where supported, iPhone Safari Add to Home Screen instructions. Hide install control in standalone mode. Public HTTPS deployment is required for phone installation.

Service worker caches the generic offline notice only; it never caches customer, booking, payment or API responses. No offline payment/booking queue. Charging subscriptions, merchant vouchers and fleet dispatch are outside this release.

## App brand and account changes · 17 October 2026

New app-only WERIGO wordmark with teal GO and a small destination dot. Matching W monogram for installation icons, including a maskable safe area. `AppBrand` is shared by the app header and login. The Powered by endorsement uses the original Wedison PNG, copied byte-for-byte from `instagram/brand-wedison/wedison-logo-trim.png`; its proportions, shape and colours are unchanged. Public website brand assets are untouched.

Registration only requests account/contact data. Google uses the existing Better Auth provider and existing environment configuration; local preview has no Google credentials and explicitly disables the button. Legacy /account/complete now redirects rather than collecting documents. Rental checkout requires passport/KTP/KITAS before either WhatsApp handoff or payment. Licence number is optional; the rider must acknowledge legal licence, fines and attributable-loss responsibilities. Migration 0012 must be activated once under super-admin Settings before KITAS/blank licence saves can work on an older database. No production migration has been applied during local QA.

Road routing: FOSSGIS OSRM car routes on OpenStreetMap data, serialized at <=1 request/second per app process, with pin cache, request limits and timeout. Location consent text links provider privacy. Quotes expire after 30 minutes and are signed using the existing BETTER_AUTH_SECRET. Server rejects modified, expired, wrong-area or missing route proofs before non-monthly delivery payment; the server computes the fee, never a client-supplied price. No straight-line fallback is billed. Local preview without the existing production signing secret shows estimates and safely keeps manual confirmation.

All four app motorcycle images use clean official catalog artwork with contain sizing and padding. Public hero video, SAGA and website presentation remain.

## Ride Club membership

The app shows distinct Silver, Gold and Platinum cards, using the existing live earning rules: 1x / 1.25x / 1.5x points respectively. Gold qualifies at Rp3m, Platinum at Rp8m in eligible completed rental charges over 12 months. Gold earns 25% more and Platinum 50% more than Silver; no invented delivery, insurance or merchant perks. The page shows a real account balance, tier and progress from rideSummary when available, plus point credits, redemptions and adjustments. Anonymous/unavailable accounts do not receive a fabricated tier or balance.
