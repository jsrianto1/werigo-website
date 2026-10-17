# Werigo PWA rental journey

Design applies to `/app/*` only: white surfaces, black primary actions, neutral grey controls, generous spacing and official Werigo/Wedison imagery. The public website retains its layout, video and SAGA; its withdrawn poncho/protection offers and automatic-helmet claims are removed as explicitly requested.

## Opening and navigation

Installed start URL: `/app/login`. Anonymous visitors see login/sign-up first. Existing sessions return to `/app/rent`. `/app` also resolves the session and redirects accordingly. Home has a central RENT action and bottom navigation: Home, Bookings, RENT, What to do?, Account. Account includes Ride Club rewards.

RENT -> showroom pick-up OR delivery -> delivery map (delivery only) -> dates -> priced model -> motorcycle quantity and 0–2 optional helmets -> rider details -> review and payment/request.

Showroom handover uses the real `showroom` pickup point. Both collection and return are at the Gatot Subroto showroom; no delivery fee. Server validation recognises the pickup point, and submitted deliveryMethod is `pickup`. Delivery retains existing fee rules and WhatsApp confirmation gates.

## Location

Google Maps Platform credentials are not available. Leaflet + OpenStreetMap supply the interactive map, with visible attribution and ordinary browser tile caching; tiles are never prefetched or cached by the service worker. Users can move the map, select a point with the keyboard, use GPS explicitly, or paste a Google Maps share link. Google Maps universal links open the selected point without an API key. No Google affiliation or Google-rendered-map claim.

The pin must be confirmed before continuing. Moving the map invalidates the previous confirmation. Location stays in sessionStorage for 30 minutes, must match the selected area, and expires before checkout entry if needed. Exact coordinates are not added to navigation URLs or analytics. The confirmed link pre-fills booking address details and is sent only through the existing explicitly submitted booking request. App address drafts are excluded from persistent localStorage. GPS permissions are enabled only for `/app/*`; no automatic GPS prompt or background tracking.

Sources: https://leafletjs.com/examples/quick-start/ ; https://operations.osmfoundation.org/policies/tiles/ ; https://developers.google.com/maps/documentation/urls/get-started

## Business rules and payment

Use the shared rental pricing engine and the existing booking/auth/payment services. No environment values changed. No new cancellation fee is invented: cancellation/refund terms are confirmed by the team because the central policy is not yet approved. Rain poncho, insurance and optional protection are not offered. Helmets default to zero, maximum two per booking, free when selected; motorcycle quantity is a separate control (1–4).

Existing database mode opens Midtrans for eligible quotes. Existing WhatsApp mode and delivery routes requiring distance confirmation must get a final quote before payment. Do not present these enquiries as paid or confirmed bookings. No test order, payment or real user location is submitted during QA.

## Other app services and installation

What to do? contains independent Bali venue ideas linked to their official sites and Google Maps; these are not contracted merchants, charging locations or star-rated partners. Existing area guides, real order history and Ride Club remain accessible.

Manifest scope `/app/`, standalone display, official 192/512/maskable icons. Android install prompt where supported, iPhone Safari Add to Home Screen instructions. Hide install control in standalone mode. Public HTTPS deployment is required for phone installation.

Service worker caches the generic offline notice only; it never caches customer, booking, payment or API responses. No offline payment/booking queue. Charging subscriptions, merchant vouchers and fleet dispatch are outside this release.
