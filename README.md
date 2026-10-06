# Werigo — werigo.co

Premium electric motorcycle & scooter rental in Bali. Production website
built with Next.js (App Router), TypeScript and Tailwind CSS.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Lucide icons, Fraunces + Inter via `next/font`
- Node.js **24.x** (see `.nvmrc` / `package.json` engines)
- PostgreSQL 16 on the Werigo VPS (`db.werigo.co`), accessed only from
  the Next.js server with the `pg` driver
- Better Auth for staff (and later customer) accounts
- Fonnte for WhatsApp notifications to the ops team

The whole application — pages, API routes, admin dashboard — runs on
Hostinger. The VPS hosts only the database (plus its backups and the
cron that retries notifications). There is no separate backend.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real values
createdb werigo              # or create it in pgAdmin (UTF8)
npm run db:migrate           # applies db/migrations/*.sql
npm run create-admin -- --email you@werigo.co --name "Your Name" --role super_admin
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply pending SQL migrations to `DATABASE_URL` |
| `npm run db:status` | Show applied / pending migrations |
| `npm run create-admin -- --email … --name … [--role admin\|super_admin]` | Create or reset a staff account |
| `npm run auth:generate` | Regenerate the Better Auth schema SQL after changing `src/lib/auth.ts` |

## Environment variables

Documented in [.env.example](.env.example) — copy to `.env.local`
locally or set in Hostinger hPanel → Environment variables. Never
commit real values, and never put server-only keys in a
`NEXT_PUBLIC_*` variable.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BOOKING_MODE` | public, build-time | `database` (store + admin + notifications) or `whatsapp` (direct WhatsApp, no database) |
| `NEXT_PUBLIC_SITE_URL` | public, build-time | Canonical origin, used for auth callbacks and links |
| `DATABASE_URL` | **server-only** | `postgresql://werigo:…@db.werigo.co:5432/werigo`; TLS is enforced for any host other than localhost |
| `BETTER_AUTH_SECRET` | **server-only** | Session signing secret (`openssl rand -base64 32`) |
| `FONNTE_TOKEN` | **server-only** | Fonnte device token for WhatsApp notifications |
| `ADMIN_WHATSAPP_NUMBERS` | **server-only** | Comma-separated recipients of booking notifications (`628…`) |
| `CRON_SECRET` | **server-only** | Bearer token for `/api/cron/*` (called from the VPS cron) |
| `MIDTRANS_SERVER_KEY` | **server-only** | Midtrans server key (`SB-Mid-server-…` in sandbox) |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_ENV` | public, build-time | Snap client key and `sandbox` / `production` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | **server-only** | Google sign-in for customers (optional; the button is hidden when unset) |
| `SMTP_PASSWORD` (+ optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM`) | **server-only** | Verification and password-reset email; defaults to `noreply@werigo.co` on `smtp.hostinger.com:465` |
| `SAGA_DATA_DIR` | **server-only** | Optional folder for the WERIGO SAGA counters and comments (default `~/.werigo-data`) |
| `SAGA_COMMENTS_ADMIN_KEY` | **server-only** | Secret for moderating saga comments |

`GET /api/health/db` returns a non-sensitive diagnostic —
`{ configured, reachable, schemaReady }` booleans only — for checking
the live database connection without exposing any configuration.

## Booking database and payment

The database is the source of truth for bookings. The flow in
`database` mode is: form → sign in or create an account (only at the
payment step; estimates need no account) → server validation
(`POST /api/bookings`, Zod) → **price computed on the server**
(`src/lib/quote.ts`: approved per-day rate × days × units + the
Rp 75,000 delivery & collection fee, waived on monthly rentals;
add-ons are free) → stock check and insert (status `pending_payment`)
→ Midtrans Snap transaction → payment popup → webhook / status check
marks the booking `paid` (status `new`) → WhatsApp confirmation to the
customer and the ops team → confirmation screen. The browser never
sends a price. If the payment provider cannot be reached, the booking
is released and the form is preserved for retry. localStorage holds
only temporary form drafts.

- Unpaid bookings expire after **60 minutes** (`PAYMENT_WINDOW_MINUTES`
  in `src/lib/payments.ts`); Midtrans expires the transaction at the
  same time and the VPS cron (`/api/cron/expire-bookings`) is the
  safety net. An expired booking can be paid again from the account or
  confirmation page if units are still free (new Snap order id
  `WRG-…-2`).
- `POST /api/payments/midtrans/notify` is the webhook. A notification
  is applied only when its `signature_key` verifies **and** the Get
  Status API confirms it; replays never downgrade a paid booking. Set
  it in the Midtrans dashboard as
  `https://werigo.co/api/payments/midtrans/notify`.
- **Rider documents** are mandatory before booking: identity document
  (passport or Indonesian KTP number) and driving licence number, entered
  in the registration form (email sign-up) or on `/account/complete`
  (after Google sign-in, and for accounts created before the rule).
  Stored in `customer_identity` (numbers only, never images), one account
  per document, locked once the customer has a paid booking, enforced by
  `POST /api/bookings` (`identity_required`), shown to staff in the
  booking detail only (not in lists or CSV).
- Customers see their bookings at `/account` (pay now, details,
  WhatsApp), edit their profile at `/account/profile`, and sign in at
  `/account/login` (email + password, or Google when
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set). Verification and
  password-reset emails go out through the Hostinger mailbox.
- **Stock** (`/admin/stock`): units per model. Blank = not tracked
  (never sells out). A booking holds units while paid, or pending and
  not expired, or confirmed by staff. Per-unit (plate) tracking is a
  later version.
- **Discounts** (`src/lib/discounts.ts`): one per booking. Every option
  the customer qualifies for is listed with its rupiah value (automatic
  campaigns, vouchers given to them, a promo code they typed, or a
  friend's referral code); the biggest is applied automatically and the
  customer can choose another one, or none, on the review step. The
  booking API recomputes the same list, so the charged amount always
  matches. Discounts apply to the rental amount only.
- **Promotions** (`/admin/promotions`, table `promotions`): promo codes
  (anyone with the code), automatic campaigns (every eligible customer)
  and vouchers (only customers they are given to, `voucher_grants`).
  Options: percent or fixed, maximum discount, minimum rental, first
  booking only, models, start/end, total and per-customer limits. The
  promotion marked *featured* drives the site pop-up and top bar
  (`/api/promotions/featured`); the former hard-coded WELCOME20 is now a
  row in this table.
- **Referrals** (`/admin/referrals`): each customer has a code and a
  share link (`/book?ref=CODE`) on `/account/referral`. The friend gets
  `refereeDiscountPercent`, the owner earns `referrerFeePercent` of the
  rental amount the friend paid (after the discount, without the
  delivery fee), snapshotted on the booking. Ledger
  (`referral_ledger`): pending when paid, available when the booking is
  marked completed, void if cancelled/refunded. Customers request a
  payout of the available balance once it reaches `minPayoutIdr`; a
  super admin transfers manually and marks it transferred (customer is
  told on WhatsApp). Defaults 10% / 10% / Rp 500,000, editable by a super
  admin (table `settings`, key `referral`).
- **Refunds** are done in the Midtrans dashboard; a super admin then
  records "Mark refunded" on the booking. "Mark paid manually" records
  a payment received outside the site. Both are written to `audit_log`.

### Midtrans environments

`NEXT_PUBLIC_MIDTRANS_ENV=sandbox` (default) uses the sandbox hosts and
`SB-Mid-*` keys; set it to `production` together with the production
keys when going live, and register the production notification URL.
Sandbox test card: `4811 1111 1111 1114`, any future expiry, CVV `123`,
OTP `112233`.

### Schema and migrations

SQL migrations live in `db/migrations/` and are applied in filename
order by `npm run db:migrate`, which records each file in
`schema_migrations` (re-running is safe). Never edit an applied file;
add a new one.

- `0001_bookings.sql` — `bookings`, `booking_events`, booking-code
  generator, status audit trigger, `booking_status_counts()`
- `0002_auth.sql` — Better Auth tables (`user`, `session`, `account`,
  `verification`); regenerate with `npm run auth:generate` into a new
  file when the auth config changes
- `0003_notification_outbox.sql` — WhatsApp outbox with retries
- `0004_booking_email_optional.sql` — email optional on the form
- `0005_payment_enums.sql` — `pending_payment`/`expired` statuses, `payment_status`
- `0006_accounts_payments_stock.sql` — customer profile fields, price
  snapshot and payment state on bookings, `payments`, `vehicle_stock`,
  `audit_log`
- `0007_customer_identity.sql` — rider documents (`customer_identity`)
- `0008_promotions_referrals.sql` — `settings`, `promotions`,
  `voucher_grants`, referral codes / ledger / payout requests, discount
  columns on bookings, WELCOME20 moved into the database
- `0009_ride_club.sql` — Ride Club membership tiers and rental points
- `0010_admin_management.sql` — `user.mustChangePassword`,
  `user.lastLoginAt`, `customer_notes`, notification settings row

For a database where `0001` was applied by hand, record it first:
`node scripts/db-migrate.mjs --baseline 0001_bookings.sql`.

### VPS database (production)

PostgreSQL 16 runs natively on the Werigo VPS. Only the `werigo` role
may connect from outside, only to the `werigo` database, only over TLS
(`hostssl … scram-sha-256` in `pg_hba.conf`); the firewall additionally
limits port 5432 to Hostinger's network. The server certificate is the
Let's Encrypt certificate for `db.werigo.co`, copied into
`/etc/postgresql/16/main/ssl/` by `/usr/local/sbin/werigo-pg-cert-sync`
(also run automatically on renewal). Daily backups:
`/usr/local/sbin/werigo-db-backup` → `/var/backups/werigo/` (14 days).

The VPS cron calls `GET /api/cron/notifications` (retry undelivered
WhatsApp messages) and `GET /api/cron/expire-bookings` (close payment
windows) every 5 minutes with `Authorization: Bearer $CRON_SECRET`
(see `/etc/cron.d/werigo-cron`).

### Staff accounts and the admin dashboard

`/admin` is the staff home: what needs attention (new bookings,
awaiting payment, follow-ups due, rentals starting within 7 days,
revenue this month for super admins), the latest bookings, stock, and
the module menu. Every admin page shares the same navigation
(`src/components/admin/modules.ts` lists the modules). All `/admin`
pages require a signed-in account whose role is `admin` or
`super_admin`; staff who open `/account` are sent to `/admin`. Public sign-up is disabled; create or reset staff
accounts with:

```bash
npm run create-admin -- --email ops@werigo.co --name "Ops Team" --role admin
```

The password is asked for interactively (or taken from
`ADMIN_PASSWORD` for scripts). Running it again for an existing email
resets the password and role and signs that account out everywhere.
Roles and their permissions are defined in `src/lib/permissions.ts`.

Day to day, staff are managed in the dashboard instead:

- **Staff** (`/admin/staff`, super admin): create an account with a
  temporary password (shown once, hand it over in person), change
  roles, deactivate/reactivate, set a new temporary password, sign
  someone out everywhere. An account with a temporary password is sent
  to `/admin/profile?change=1` and cannot use the rest of the dashboard
  until it sets its own password. You cannot demote or deactivate
  yourself, and the last active super admin is protected.
- **My profile** (`/admin/profile`, click your email): change name and
  password (other devices are signed out), see signed-in devices.
- **Customers** (`/admin/customers`): search by name, email or
  WhatsApp; a customer page shows bookings, rider documents (every
  admin can view, only a super admin can correct them), vouchers (and
  give one), referral balance, internal staff notes and sessions. A
  super admin can **suspend** (until a date) or **block** (permanent)
  a customer: both sign them out and stop sign-in and new bookings;
  existing paid bookings are not cancelled automatically. Sessions are
  checked against the database on every request (no cookie cache), so
  suspensions, deactivations and role changes take effect at once.
- **Audit log** (`/admin/audit`, super admin): every staff action and
  sign-in, filterable by staff, action and date, CSV export. Entries
  are append-only.
- **Settings** (`/admin/settings`, super admin): WhatsApp recipients
  and per-event switches (table `settings`, key `notifications`), a
  test message, and the delivery log with manual resend. The Fonnte
  token itself stays in `FONNTE_TOKEN` on the server.

### WhatsApp notifications (Fonnte)

Every new booking queues one message per staff number (the list saved
in `/admin/settings`, or `ADMIN_WHATSAPP_NUMBERS` when that list is
empty) into `notification_outbox`, then delivery is
attempted immediately. Failures are retried with increasing back-off
(1 min → 8 h, up to 10 attempts) by the cron endpoint; a notification
can never fail or delay a booking. Use a dedicated WhatsApp number for
the Fonnte device, not the main business number.

### Hostinger deployment

1. hPanel → your Node.js app → Environment variables: set every
   variable in the table above that applies (at least
   `NEXT_PUBLIC_BOOKING_MODE`, `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `FONNTE_TOKEN`, `ADMIN_WHATSAPP_NUMBERS`,
   `CRON_SECRET`). Remove the old `SUPABASE_*` and `ADMIN_EMAILS`
   variables.
2. Redeploy from `main` (Node 24, `npm ci`, `npm run build`,
   `npm run start`).
3. `NEXT_PUBLIC_*` values are baked in at build time — re-deploy
   after changing them.
4. Check `https://werigo.co/api/health/db` returns all three `true`.

### Backups / export

- Admin → `/admin/bookings` → **CSV** exports the currently filtered
  bookings (up to 5000 rows).
- Full backups: daily `pg_dump` on the VPS (see above). On demand:
  `ssh root@db.werigo.co /usr/local/sbin/werigo-db-backup`.

### Local testing without a database

`BOOKING_STORE=memory ALLOW_MEMORY_STORE=1 npm run start` switches
the API to an in-memory store so `scripts/db-flow-test.mjs` can
verify the whole flow (validation, booking codes, idempotency,
failure handling, WhatsApp gating) without credentials. Never set
these in production.

## WERIGO SAGA comments

Every chapter page (`/saga/chapter-N`; old `/saga/episode-N` links 308 to it)
ends with a comment section. Comments are keyed by the chapter number and
view/reaction counts by the stable key `episode-N`, so the URL change kept them.
Comments go through `/api/saga/comments` and are stored in
`saga-comments.json` in the same folder as the saga counters
(`SAGA_DATA_DIR`, else `~/.werigo-data`). That folder is outside the
repo and the app folder, so deploys never wipe it and it is never
committed. Writes are atomic (temp file + rename).

- `GET /api/saga/comments?episode=N&limit=50&offset=0`: visible
  comments, newest first (limit up to 200).
- `POST /api/saga/comments` with `{ episode, name, text, lang }`:
  name 1 to 40 characters, text 1 to 600. Links and a short
  profanity list (`src/lib/sagaCommentFilter.ts`) are rejected, HTML
  is stripped, and each IP may post once every 30 seconds and 10
  times an hour. The hidden `website` field is a honeypot.
- Only name, text, language and time are stored. No IP or email.

Moderation needs `SAGA_COMMENTS_ADMIN_KEY` set on the server (while
it is unset, moderation calls are refused). Send it as the
`x-admin-key` header:

```bash
KEY=your-secret; URL=https://werigo.co/api/saga/comments
# list every comment of episode 3, hidden ones included (shows ids)
curl -H "x-admin-key: $KEY" "$URL?episode=3&all=1&limit=200"
# hide (kept on disk, no longer shown) or unhide
curl -X POST -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
  -d '{"action":"hide","id":"COMMENT_ID"}' $URL
# delete permanently
curl -X DELETE -H "x-admin-key: $KEY" "$URL?id=COMMENT_ID"
```

Editing `saga-comments.json` by hand also works (set `"hidden": true`
or remove the entry); the server notices the newer file on the next
request.

## Where things live

- **Design tokens (brand colors, type)** — `src/app/globals.css` (`:root`) + `DESIGN-SYSTEM.md`
- **Fleet data** — `src/data/vehicles.ts`
- **Service areas** — `src/data/locations.ts`
- **Rental extras** — `src/data/extras.ts` (free of charge; availability confirmed on WhatsApp)
- **Help Center content** — `src/data/faqs.ts`
- **Site config (contact, socials, locales)** — `src/lib/config.ts`
- **Pricing engine** — `src/lib/pricing.ts`
- **Database pool** — `src/lib/db.ts`; **booking storage** — `src/lib/bookingStore.ts`
- **Auth** — `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (browser), `src/lib/permissions.ts` (roles)
- **Notifications** — `src/lib/notifications.ts`
- **WhatsApp message builder** — `src/lib/whatsapp.ts`

## Roadmap

- **Phase 1** (this release) — customer accounts (email + Google),
  Midtrans payment at checkout, stock per model, customer WhatsApp
  confirmation, audit log foundation
- **Phase 2** (this release) — promo codes, automatic campaigns,
  vouchers, referral program with payouts, customer Vouchers and
  Referral pages
- **Phase 3** (this release) — customer management (suspend/block,
  notes, documents, vouchers), staff management with temporary
  passwords, audit log viewer, notification settings and delivery log,
  staff profile

## [LEGAL REVIEW REQUIRED] checklist

Items below still need management or legal approval before wording can
be strengthened or published. Never invent these on the website.

- [ ] Full Terms and Conditions text (`/terms`) — Indonesian counsel
- [ ] Privacy policy full text (`/privacy`)
- [ ] Cancellation and refund policy (deadlines, refunds) — required
      before online payment goes live; the checkout and confirmation
      copy that replaced "nothing is charged" also needs sign-off
- [ ] Deposit policy — no deposit wording published
- [ ] Bike damage protection — request-only; price, coverage,
      exclusions, and liability cap all pending
      (`src/data/extras.ts` `bikeDamageProtection`,
      `coverageStatus: "pending-management-approval"`). The USD150 cap
      seen in competitor material is a benchmark only, never publish it
      without approval
- [ ] KYC / identity workflow — since 2026-10-05 the site collects
      passport / KTP and driving licence **numbers** (mandatory before
      booking). The privacy policy must say so (purpose, retention,
      who can see them). Document **images** must still not be collected
      until secure storage, retention, access, and deletion processes
      are approved
- [ ] Liability wording anywhere on the site
- [ ] Delivery fee policy (airport / hotel / villa remain
      "by arrangement")

## Marketing tracking

The root layout installs GTM `GTM-5RC9TGR4` and Meta Pixel
`27824990167174730` on every page. Both bootstrap scripts run from the
initial HTML head; their external libraries load asynchronously. GTM's
noscript iframe is first in the body, followed by Meta's noscript beacon.

Meta sends one `PageView` on a full load. `MetaPageViews` handles subsequent
App Router pathname/query changes, skipping hydration and repeated renders.
GTM tags and History Change triggers are managed in the GTM container.
Do not also initialize the same Meta Pixel through GTM: this installation
already owns its base code and PageView events. No booking conversion or
purchase event is added by this change.

### Sitemap history snapshot for hosting releases

After a local production build from a full-history checkout, run node scripts/sitemap-dates.mjs --write-cache and commit scripts/sitemap-dates-cache.json with the release. This preserves verified Git dates on shallow hosting clones without a second large history fetch. The content fingerprint covers tracked source, public assets, build scripts and Next configuration, normalizing text line endings; any content change invalidates the snapshot and restores the full-history requirement. Refresh the snapshot after each release change.
