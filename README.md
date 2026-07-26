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
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable/anon key (admin sign-in sessions only; RLS blocks all data access) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Full-access key used exclusively by API routes |
| `ADMIN_EMAILS` | **server-only** | Comma-separated allowlist for /admin/bookings |

## Booking database (Supabase)

The database is the source of truth for bookings. The flow is:
form → server validation (`POST /api/bookings`, Zod) → insert into
Supabase → unique `WRG-YYYYMMDD-XXXX` booking code → confirmation
screen → "Continue to WhatsApp" (same code + details). If the insert
fails, WhatsApp is never opened and the form data is preserved for
retry. localStorage holds only temporary form drafts.

### Supabase setup

1. Create a project at https://supabase.com (region: Singapore is
   closest to Bali).
2. Run the SQL migrations, in filename order, from
   `supabase/migrations/` — either:
   - Supabase Dashboard → SQL Editor → paste each file and run, or
   - `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
3. Copy the project URL and keys (Dashboard → Settings → API) into
   the environment variables above.
4. Auth → Providers → Email: **disable "Allow new users to sign up"**
   (public registration must stay off).

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

## Status

Live site, first iteration: bookings persist in the browser and are
confirmed personally over WhatsApp. Payment gateway, database, email and
admin panel are structured to be connected later. Placeholder brand
colors and photo slots are centrally managed — see `DESIGN-SYSTEM.md`
and `MEDIA-MANIFEST.md`. Supercharge stations and model compatibility
are published only from verified data in `src/data/supercharge.ts`.
