# Werigo Ride Club

Free customer membership: Silver, Gold (Rp3m completed net rental in the last 12 months), Platinum (Rp8m). One point per Rp10,000 × tier multiplier (1 / 1.25 / 1.5), rounded down once. 1 point = Rp200. Redeem at least 100 points, up to 10% of rental only; one discount per booking. Delivery, deposits and other charges excluded. Credits expire 12 calendar months after issue; earliest expiry used first.

The verified-email welcome bonus is 50 points after the first completed, paid rental. Existing customer accounts are enrolled at activation, but historical rentals do not earn points. Tier is evaluated from rolling completed rental spend; the tier at booking is snapshotted, so the qualifying booking does not earn the new multiplier. An extension is a new booking on the same account.

## Activation — existing env stays unchanged

No new env variables are required. Existing values are not modified or copied into this checkout. Migration 0009 is additive and leaves prior migrations untouched. Before activation, the discount engine excludes points and the member page reports that setup is pending; bookings/promotions remain usable.

A signed-in super admin can open `/admin/membership` and select **Activate Ride Club**. This applies the exact SQL from `db/migrations/0009_ride_club.sql` inside one transaction, with a migration advisory lock and checksum, and records the actor in audit_log. It requires existing migration tracking and the Phase 2 schema. Alternatively the database operator can run `npm run db:migrate` from the checkout with the existing DATABASE_URL. No credentials belong in Git. Do not expose the setup endpoint publicly without its session/role/origin checks.

`src/lib/rideClubSchema.ts` is generated from migration 0009. After editing SQL, run `python scripts/ride-club-schema.py`; the PostgreSQL test checks the two sources match.

## Settlement and corrections

Database triggers award only on completed + paid, and revoke when the rental is no longer completed/paid. Credits have unique booking/welcome keys, so retries never double-award. Refunds also remove qualifying tier spend. Points already spent from a refunded rental become debt, recovered from future credits rather than creating free points.

Checkout reserves credits inside the booking transaction under a member row lock. Replays return the existing booking. Cancelled/refunded/failed/expired unpaid bookings release their reservation without extending credit expiry. An expired payment retry cannot revive expired, revoked or reused points; the rider must make a fresh booking. Late paid provider settlements can make a balance negative if a released reservation was reused; the ledger preserves this debt and blocks further redemption until covered.

Super admins can add/deduct points with a reason and idempotency key. Corrections and activation are audited atomically; normal admins can inspect members/history but cannot alter balances. Positive corrections expire in 12 months; negative corrections consume valid credits and cannot exceed the available balance.

## Verification

`node scripts/ride-club-test.mjs` runs the actual SQL migrations/triggers in isolated PostgreSQL (PGlite), testing settlement, refund debt, welcome verification, rounding/caps, tier snapshots, expired/cancelled reservations and correction idempotency. It never connects to production. Also run TypeScript, lint and the production build.

Production acceptance: activate as super admin; confirm customer tier/balance, discounted rental redemption, completed rental earning and refund reversal with disposable sandbox bookings before using real payments. No test users/payments are automatically created on production.
