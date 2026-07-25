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
locally or set in the hosting panel. Never commit real values.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Business WhatsApp number, international format, digits only |

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

Launch-prep prototype: bookings persist in the browser and are confirmed
manually over WhatsApp. Payment gateway, database, email and admin panel
are structured to be connected later. Placeholder brand colors, photos
and `[TBC]` policy answers are clearly marked throughout.
