# Werigo fleet and booking bridge

Ops owns physical units and allocation. The website owns customer accounts,
identity verification, the payment ledger and membership. The public availability
API returns only model names and available counts for the selected dates.

## Configuration without replacing Hostinger env

The website signs requests with a domain-separated Ed25519 key derived locally
from its existing server authentication secret. Only the public key is exposed at
`/api/integrations/ops/key`. No authentication secret is sent to Ops or logged.
Ops pins that public key in the new `WERIGO_WEBSITE_SYNC_PUBLIC_KEY` entry.

Ops similarly exposes its public signing identity at `/api/website-sync/key`,
derived locally from its existing dedicated sync secret. The website pins this
public key in migration 0018 settings. Both directions bind the signature to the
role, HTTP method, exact route, timestamp and body. Requests expire after five
minutes. Published public keys cannot sign requests.

All original Hostinger environment entries remain unchanged. Never use the full
replace environment operation with masked values. Legacy HMAC support remains
available for the already configured dedicated key; no key is rotated by this
release.

Unattended updates use one Hostinger cron job, once per minute, calling the Ops
`/api/website-sync/tick` endpoint with a new dedicated scheduler token stored as
`WERIGO_SYNC_CRON_TOKEN` in Sites. This token can only request a bounded sync tick;
it cannot change booking data or invoke administrative migrations. Ops signs the
subsequent request to the website, where the pinned public identity is verified.
Handover changes also request a tick immediately; the cron is the retry path.

## Controlled hosting activation

1. Deploy both apps with the integration still inactive. Read the real website
   public key and append only the new Ops public-key and scheduler-token entries.
2. Inspect existing cron jobs before creating the minute job. Preserve every
   existing environment entry and job.
3. In the exact existing werigo.co Node application, run the explicit
   `build:ops-activate` build script for one deployment. Normal `build` never runs
   migration/activation. This maintenance entry point checks the target domain,
   applies only migrations 0017 and 0018 with checksum and transaction guards,
   pins the Ops public key, and reports aggregate future commitments.
4. It verifies the signed connection and waits to observe the real authenticated
   scheduler before pausing new checkout. Existing website commitments are then
   reconciled through the same atomic Ops allocator. A conflict is reported by
   booking code and prevents activation; never invent stock or falsely mark a
   physical return to clear one.
5. Only an empty durable queue and a recent authenticated scheduler heartbeat
   allow activation. Read back live availability and both database health states.
   Keep normal stored build settings on `build`; the one-off script is supplied
   only to that explicit hosting build.

Schema preparation or key publication alone never activates reservations. There
is no automatic fallback to independent/unlimited stock after activation. A model
without a recorded physical rental unit correctly has zero availability.

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
  counts and a **Sync now** action; the authenticated scheduler provides unattended retries.
- A very late paid order whose released unit was allocated elsewhere is a visible
  conflict. Do not overwrite the other booking; staff must arrange another bike
  or the appropriate payment resolution.

## Verification

Website: `node scripts/ops-inventory-test.mjs`, TypeScript, lint, production build.
Ops: all `tests/*.test.ts`, TypeScript, Sites build helper. Integration tests use
local in-memory Postgres/SQLite and synthetic data; never real payment transactions.

Live activation is incomplete until public-key pins, historical reconciliation,
scheduler execution and the authenticated availability handshake are verified.
