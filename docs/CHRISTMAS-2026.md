# Christmas rental offers

Booking/checkout window: 20 November 2026 00:00 through 31 December 2026 23:59:59 WITA. The database end is exclusive: 1 January 2027 00:00 +08:00. This is the booking date window, not a restriction on rental travel dates.

| Code | Rental discount | Eligibility | Usage |
| --- | --- | --- | --- |
| NEWCHRISTMAS | 25% | First booking; no prior paid/refunded or confirmed/active/completed rental | Once per account; an open payment hold prevents a second first-booking redemption |
| CHRISTMAS26 | 20% | Previous paid/refunded or confirmed/active/completed booking | May be used on subsequent eligible bookings during the campaign |

- Applies to the motorcycle rental amount across the existing duration rates. Delivery/collection fees are excluded. No additional discount cap, model restriction, campaign quota or minimum spend was specified; ordinary rental minimums still apply.
- One discount per booking. Cannot stack with referral, another voucher or Ride Points. Checkout and booking creation use the same resolver; database guards recheck dates, usage, audience, eligibility and exact amount under the shared booking lock.
- Ops confirmed/active/completed bookings and imported Done/Delivered/Collect rentals count when the Ops customer email matches the verified account email. No matching by name or unverified phone. Staff may need to verify/update the Ops customer email for an old walk-in customer.
- Existing paid invoices/booking snapshots are preserved. Expired or paused selected promotions stop a fresh booking with a refresh message rather than silently charging an undiscounted total.
- `/admin/promotions`: a super admin activates the release once using **Activate Christmas offers**. This applies migration 0021 and creates only the two named promotions in one transaction, with an audit entry. It is idempotent and will not overwrite later admin changes. Ordinary promotion edit/pause controls remain available.
- Website/PWA offer panels fetch active campaign data; pausing a code removes it on the next refresh. The opening video, SAGA, original brand/product assets and existing environment variables are unchanged.

Checks: `npm run test:promotions`, `npm run test:booking-payment`, TypeScript, lint and production build in CI. Local tests use disposable PGlite, not customer data or payment transactions.
