# Werigo fleet and booking bridge

Ops owns physical units and allocation. The website owns customer accounts,
identity verification, the payment ledger and membership. The public availability
API returns only model names and available counts for the selected dates.

## New configuration (existing env values must remain unchanged)

Add one dedicated random secret of at least 32 characters to each production app:

- Website / Hostinger: `WERIGO_OPS_SYNC_SECRET`
- Ops / Sites: `WERIGO_WEBSITE_SYNC_SECRET`

Both values must match. Never use a staff password, auth secret, SIWC bypass
token or payment credential. Never commit the value. Messages use timestamped
HMAC signatures, idempotent IDs and monotonic revisions.

Configuration alone does not activate the integration. Deploy and validate both
apps first. In website **Admin > Stock > Werigo Ops connection**:

1. Prepare the database (super admin only). This installs migration 0017 and
   queues existing future website commitments. Preparation does not enable sync.
2. Review real units and open imported rentals in Ops. Sold/internal/inactive or
   maintenance units never count as available. A model missing physical units
   has zero availability; it must not be replaced with an unlimited count.
3. Reconcile bookings. This pauses new online payments while existing commitments
   are allocated. Repeat bounded batches until no updates remain. A conflict
   stays pending and prevents activation. Resolve exact source ownership with
   staff; do not falsely mark an active rental returned or invent another unit.
4. Activate only after reviewing existing website bookings against imported Ops
   rentals, and after verifying the existing authenticated expiry cron runs at
   least every minute. Keep its existing `CRON_SECRET` unchanged.
5. Verify `GET /api/cron/expire-bookings` with its existing bearer authentication:
   it polls expired pending Midtrans transactions, pulls signed Ops handover
   statuses into customer ride history, and retries five queue entries per run.
   A gateway outage keeps uncertain payment holds reserved.

Do not deactivate into the old independent stock pool while Ops holds exist.
There is deliberately no automatic fallback to unlimited stock on connection
failure. Existing vehicle_stock settings remain stored, but writes are blocked
after the bridge is active. Only explicit website booking IDs link customer
history; manual Ops bookings are not matched to accounts by name/email.

## Lifecycle and recovery

- Checkout reserves actual eligible units in Ops before opening a payment.
- Pending payments appear as **Awaiting website payment** and block overlapping
  manual bookings. The one-hour preparation buffer also applies across channels.
- A verified payment confirms the reservation. Staff confirmation of an unpaid
  booking is labelled as a reservation, not a verified payment receipt.
- Cancellation, verified payment failure/expiry or refund releases an uncollected
  unit. A bike already handed out stays blocked until its signed return.
- Ops handovers mark the corresponding paid website booking active/completed;
  existing membership rules continue to award points only on eligible completion.
- Receipt/payment ledger changes remain in website admin. Ops does not fabricate
  a cash receipt or refund. Staff verify the website payment before handover.
- A timed-out reservation is retried with the same booking ID. No payment is
  started when fleet confirmation is uncertain. Failed updates remain in the
  Postgres outbox with error codes only. Admin > Stock exposes pending/error
  counts and a **Sync now** action; the cron must provide unattended retries.
- A very late paid order whose released unit was allocated elsewhere is a visible
  conflict. Do not overwrite the other booking; staff must arrange another bike
  or the appropriate payment resolution.

## Verification

Website: `node scripts/ops-inventory-test.mjs`, TypeScript, lint, production build.
Ops: all `tests/*.test.ts`, TypeScript, Sites build helper. Integration tests use
local in-memory Postgres/SQLite and synthetic data; never real payment transactions.

Live activation is incomplete until credentials, historical reconciliation,
cron execution and the authenticated availability handshake are verified.
