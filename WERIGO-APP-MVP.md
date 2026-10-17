# Werigo PWA — first implementation

Private preview at `/app`. No env changes, production migration, new payment integration or deployment required for the preview. The existing marketing homepage, hero video and Saga remain intact.

## Implemented

- Mobile app shell: Explore, Rent, Charge, Rewards and Account; desktop layout included.
- Four editorial area guides with search, category filters, device-local bookmarks, stop suggestions and external Maps links. Guides are not merchant approvals or charging listings.
- Real Wedison fleet photos and existing source-of-truth rental rates; links into existing booking flow, including current delivery policy.
- Existing authenticated Ride Club balance and account links; explicit unavailable state, never fabricated points. Existing booking history remains under `/account`.
- PWA manifest, install affordance, iPhone installation guidance and scoped service worker. Network failures show an offline page. No account, order, payment, API response or guide page is cached by this worker. Bookmarks are only saved on the current device.
- Charging guidance, clearly unavailable station directory, and non-purchasable charging pass concept. Bees remains home-charge only.

## Release boundaries

This is the first customer-app foundation, not a launched charging subscription or merchant network. It is noindex while in preview. Account and checkout routes retain their existing website navigation outside the PWA scope. No paid transaction, real booking, pass entitlement or merchant voucher is created by preview tests. Cards/QRIS use the existing Midtrans flow where eligible; tourist delivery enquiries are confirmed on WhatsApp and are not automatically paid orders.

## Next production work

1. Merchant onboarding and admin moderation: business identity, owner permission, physical identification sign, location, licensed photos/video, factual highlights, opening hours and review date. Require an actual visit before a recommendation badge. Keep editorial selection separate from sponsorship; label sponsored placements and disclose vouchers.
2. Verified stations: connector/model compatibility, service hours, GPS, operator, availability source and support. Do not label a destination as a station without validation.
3. Charging passes: approve differences between Rp35,000/Rp50,000 plans, validity/timezone, fair-use rules, eligible stations/models, cancellation/refunds and tax. A pass must bind to authenticated account + assigned rental bike and be validated server-side per charging session. Prevent concurrent/share use. Add an audited entitlement ledger and signed short-lived station QR session.
4. Merchant accounts and vouchers: merchant-specific terms, issue/redeem ledger, booking/visit attribution, QR/referral codes, anti-replay controls, settlement and optional merchant subscription after pricing approval.
5. One-way pickup/return alliances: per-station inventory, unit transfers, staff handover, bike/battery checklists, return capacity and relocation fees before customer commitment.
6. Fleet growth planning: 100 → 250 → 1,000 by mid-2027 → 3,000 is a planning target, not current fleet capacity. Validate warehouse space, charging capacity, staffing, utilisation, maintenance and financing for each gate.

## Curated badge criteria (proposal)

Use **Werigo Recommended**, separate from Michelin branding. Evaluate visitor experience, cleanliness, service, consistent quality, local relevance, access/parking and verified business details. Physical logo/sign identifies a participating location; it does not itself earn a quality recommendation. Re-review complaints and remove recommendations when criteria fail. Confirm Pepito, gyms and other named partners individually before claiming an alliance, charging service or voucher benefit.

Use “ALL NEW BIKES” only after confirming that every vehicle covered by the claim is new; the current preview uses the verified Wedison fleet description instead.

Guide reference: [Indonesia Travel — Uluwatu Temple](https://www.indonesia.travel/gb/en/travel-ideas/pilgrimage/pura-uluwatu). Other area descriptions and all photography reuse the existing Werigo service-area content; these references do not establish a merchant partnership.
