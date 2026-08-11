# Werigo — werigo.co

Premium electric motorcycle & scooter rental in Bali. Production website
built with Next.js (App Router), TypeScript and Tailwind CSS.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Lucide icons, Fraunces + Inter via `next/font`
- Node.js **24.x** (see `.nvmrc` / `package.json` engines)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

Starting from an empty Supabase account? Follow
[SUPABASE-SETUP.md](SUPABASE-SETUP.md), and run `node scripts/db-setup.mjs`
at any point to see exactly which step is still missing.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Environment variables

Documented in [.env.example](.env.example) — copy to `.env.local`
locally or set in Hostinger hPanel → Environment variables. Never
commit real values, and never put server-only keys in a
`NEXT_PUBLIC_*` variable.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | public | Business WhatsApp number, international format, digits only |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (server also accepts `SUPABASE_URL`, which takes priority) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable/anon key, admin sign-in sessions only; RLS blocks all data access (server also accepts `SUPABASE_PUBLISHABLE_KEY`, which takes priority) |
| `SUPABASE_SECRET_KEY` | **server-only** | New-format secret key (`sb_secret_...`) used exclusively by API routes; takes priority over the service-role key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Legacy service-role JWT, used if `SUPABASE_SECRET_KEY` is not set |
| `ADMIN_EMAILS` | **server-only** | Comma-separated allowlist for /admin/bookings and /admin/customers |
| `LEAD_CAPTURE` | **server-only** | Set to `off` to stop storing form submissions. Any other value, including unset, keeps capture on |

All values are trimmed before use. A publishable key placed in a
server-key variable is rejected at startup, and server-side booking
inserts never use the publishable key.

`GET /api/health/db` returns a non-sensitive diagnostic —
`{ configured, reachable, schemaReady, customersReady }` booleans only —
for checking the live database connection without exposing any
configuration. `customersReady` covers the customer database tables.

## Booking database (Supabase)

The database is the source of truth for bookings. The flow is:
form → server validation (`POST /api/bookings`, Zod) → insert into
Supabase → unique `WRG-YYYYMMDD-XXXX` booking code → confirmation
screen → "Continue to WhatsApp" (same code + details). If the insert
fails, WhatsApp is never opened and the form data is preserved for
retry. localStorage holds only temporary form drafts.

### Supabase setup

Full walkthrough for a fresh account: **[SUPABASE-SETUP.md](SUPABASE-SETUP.md)**.
In short:

1. Create a project at https://supabase.com (region: Singapore is
   closest to Bali).
2. Run the SQL migrations, in filename order, from
   `supabase/migrations/` — either:
   - `node scripts/db-setup.mjs --sql | pbcopy`, then Supabase
     Dashboard → SQL Editor → paste and run, or
   - `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
3. Copy the project URL and keys (Dashboard → Settings → API) into
   the environment variables above.
4. Auth → Providers → Email: **disable "Allow new users to sign up"**
   (public registration must stay off).
5. `node scripts/db-setup.mjs` to confirm every step landed.

### First admin account

1. Supabase Dashboard → Authentication → Users → **Add user** →
   "Create new user": enter the staff email and a strong password
   (tick "Auto confirm user").
2. Add that same email to `ADMIN_EMAILS` in the server environment.
3. Sign in at `/admin/bookings`. A Supabase session alone is not
   enough — the server also checks the allowlist, so removing an
   email from `ADMIN_EMAILS` revokes access immediately.

### Hostinger deployment

1. hPanel → your Node.js app → Environment variables: add all five
   variables above (reuse any that already exist with these exact
   names).
2. Redeploy from `main` (Node 24, `npm ci`, `npm run build`,
   `npm run start`).
3. `NEXT_PUBLIC_*` values are baked in at build time — re-deploy
   after changing them.

### Backups / export

- Admin → `/admin/bookings` → **CSV** exports the currently filtered
  bookings (up to 5000 rows).
- Full backups: Supabase Dashboard → Database → Backups (daily on the
  free tier), or `npx supabase db dump -f backup.sql --linked` for an
  on-demand SQL dump.

### Importing historical WhatsApp bookings

Insert them with the service role (SQL Editor), marking the source:

```sql
insert into bookings
  (client_submission_id, full_name, whatsapp_number, email,
   pickup_area, return_area, start_at, end_at, vehicle_model,
   quantity, status, source_page, privacy_consent_at, customer_notes)
values
  (gen_random_uuid(), 'Customer Name', '+628123456789', 'x@y.com',
   'canggu', 'canggu', '2026-07-01T09:00+08', '2026-07-04T09:00+08',
   'victory', 1, 'completed', 'import:whatsapp', now(),
   'Imported from WhatsApp history');
```

The booking code is generated automatically. Only import data the
customer already provided for their booking.

### Local testing without Supabase

`BOOKING_STORE=memory ALLOW_MEMORY_STORE=1 npm run start` switches
the API to an in-memory store so `scripts/db-flow-test.mjs` can
verify the whole flow (validation, booking codes, idempotency,
failure handling, WhatsApp gating) without credentials. Never set
these in production.

## Customer database (every form submission)

Separate from the booking flow and **always on**: whoever fills in the
booking checkout or the contact form is recorded, whichever way the
conversation continues. In WhatsApp-first mode the request still goes
to WhatsApp exactly as before, and the details are stored alongside it,
so a lead is no longer lost when someone closes WhatsApp without
sending.

Two tables (`supabase/migrations/20260803090000_customers.sql`):

| Table | One row per | Notes |
|---|---|---|
| `customers` | person | Deduplicated on WhatsApp number first, then email. Keeps first/last seen, submission counters, first-touch attribution, consent timestamp, ops status and internal notes |
| `form_submissions` | form fill | Immutable record of what was typed: name, contact, message, ride, dates, areas, hotel, flight, extras, promo code, acknowledgements, plus a `details` JSON catch-all |

Bookings created through `POST /api/bookings` are linked to the person
with `bookings.customer_id` when a matching customer record exists.

### Flow

form → `POST /api/leads` (fire and forget, `keepalive`) → Zod validation →
`capture_submission()` → customer upsert + submission insert in one
transaction → `WRG-L-YYYYMMDD-XXXX` reference.

Capture never blocks the customer: the forms do not await the request,
and a storage failure is logged on the server while the visitor still
reaches WhatsApp. Rates and totals are recomputed server-side from
`src/lib/pricing.ts`, never taken from the browser. Submitted values
are never edited afterwards; only `status` and `internal_notes` are.

### Setup

1. Run `supabase/migrations/20260803090000_customers.sql` after the
   bookings migration (same two options as above).
2. Nothing else: the same Supabase URL, server key and `ADMIN_EMAILS`
   are used. Without Supabase configured, capture is skipped, one
   warning is logged, and the site behaves exactly as before.
3. Optional: set `LEAD_CAPTURE=off` to stop storing submissions.

### Admin

`/admin/customers` (same sign-in and allowlist as `/admin/bookings`).
Two tabs: **People** with search, status, date and sort filters, and
**Submissions** with an extra filter per form type. Opening a row shows
the person, their attribution and consent, and every submission they
ever sent, with a per-submission status (`new`, `contacted`, `handled`,
`spam`, `archived`). **CSV** exports the current filter: people by
default, or one row per submission from the Submissions tab, up to 5000
rows.

### Privacy

- No IP address, no cookie and no device fingerprint is stored, only
  the page, referrer and browser locale of the submission.
- Every submission records a `privacy_consent_at` timestamp, taken from
  the consent the visitor gave on the form.
- Deleting a customer row deletes their submissions with it
  (`on delete cascade`). Bookings survive with `customer_id` set to
  null and hold their own copy of the details, so a full erasure
  request also needs the matching `bookings` rows removed.

### Local testing without Supabase

```bash
npm run build
LEAD_STORE=memory ALLOW_MEMORY_STORE=1 npx next start -p 3001
LEAD_STORE=memory ALLOW_MEMORY_STORE=1 SIMULATE_DB_FAILURE=1 npx next start -p 3002
node scripts/lead-capture-test.mjs
```

Covers storage of both forms, idempotent retries, phone normalization,
validation, the honeypot, consent, the failure path, rate limiting and
the admin gate. Never set these variables in production.

## Where things live

- **Design tokens (brand colors, type)** — `src/app/globals.css` (`:root`) + `DESIGN-SYSTEM.md`
- **Fleet data** — `src/data/vehicles.ts`
- **Service areas** — `src/data/locations.ts`
- **Rental extras** — `src/data/extras.ts`
- **Help Center content** — `src/data/faqs.ts`
- **Site config (contact, socials, locales)** — `src/lib/config.ts`
- **Pricing engine** — `src/lib/pricing.ts`
- **Booking storage (prototype: localStorage)** — `src/lib/booking.ts`
- **WhatsApp message builder** — `src/lib/whatsapp.ts`
- **Customer database (schema, store, capture)** — `src/lib/leadSchema.ts`,
  `src/lib/customerStore.ts`, `src/app/api/leads/route.ts`
- **Form capture from the browser** — `src/lib/leadCapture.ts`

## Status

Live site, first iteration: bookings persist in the browser and are
confirmed personally over WhatsApp. Payment gateway, database, email and
admin panel are structured to be connected later. Placeholder brand
colors and photo slots are centrally managed — see `DESIGN-SYSTEM.md`
and `MEDIA-MANIFEST.md`. Supercharge stations and model compatibility
are published only from verified data in `src/data/supercharge.ts`.


## [LEGAL REVIEW REQUIRED] checklist

Items below still need management or legal approval before wording can
be strengthened or published. Never invent these on the website.

- [ ] Full Terms and Conditions text (`/terms`) — Indonesian counsel
- [ ] Privacy policy full text (`/privacy`). It must now also cover the
      customer database: what the booking checkout and the contact form
      store, how long submissions are kept, and how a customer requests
      deletion. The forms already state plainly that the details are
      saved, but the retention period is not published anywhere yet
- [ ] Cancellation policy (deadlines, refunds) — currently "confirmed
      with your quote"; no deadlines or percentages published
- [ ] Deposit policy — no deposit wording published
- [ ] Bike damage protection — request-only; price, coverage,
      exclusions, and liability cap all pending
      (`src/data/extras.ts` `bikeDamageProtection`,
      `coverageStatus: "pending-management-approval"`). The USD150 cap
      seen in competitor material is a benchmark only, never publish it
      without approval
- [ ] KYC / identity workflow — public site must not collect passport,
      ID, or licence images until secure storage, retention, access,
      and deletion processes are approved
- [ ] Liability wording anywhere on the site
- [ ] Delivery fee policy (airport / hotel / villa remain
      "by arrangement")
