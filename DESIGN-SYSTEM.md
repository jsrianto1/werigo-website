# Werigo Design System

Generated with UI/UX Pro Max + frontend-design review. All values live as
CSS custom properties in `src/app/globals.css` — **update tokens there,
never in components.**

## Brand direction

Premium electric mobility × Bali travel lifestyle. Light, warm, credible.
Signature motif: the **route line** — a slowly-riding dashed path
(`RouteLine` component) marking section transitions.

## Palette (PLACEHOLDER — swap when official brand colors arrive)

| Token | Value | Role |
|---|---|---|
| `--brand-primary` | `#0A5C55` | Laguna — deep reef teal, primary brand |
| `--brand-primary-strong` | `#07443F` | Hover / emphasis |
| `--brand-primary-soft` | `#E3F1EE` | Tinted washes |
| `--brand-accent` | `#C14A05` | Burnt sunset orange — CTA only (4.9:1 with white) |
| `--brand-accent-strong` | `#A83F04` | CTA hover |
| `--surface-page` | `#FBFAF7` | Sand-white page background |
| `--surface-deep` | `#0E2B27` | Deep laguna — footer / support band |
| `--ink` | `#182320` | Primary text (green-black) |

Neutrals are warm sand-based — never blue-gray. Semantic colors
(`--ok`, `--warn`, `--danger`) each have a `-soft` wash variant.

## Typography

- **Display:** Fraunces (variable; SOFT 40) — page titles + section
  headings only. Carries the tropical-premium personality.
- **Body/UI:** Inter — forms, navigation, running text.
- Prices/dates/durations always use `.tnum` (tabular numerals).
- Eyebrow labels: `.eyebrow` — 12px, 600, letter-spaced uppercase, laguna.

## Shape & spacing

- Cards: 14px radius (`--radius-card`)
- Controls: 10px radius (`--radius-control`)
- Section rhythm: `py-16 md:py-20 lg:py-24`, max width `max-w-7xl`
- Touch targets: min 44px (`min-h-11`)

## Motion

- Micro-interactions: 150–300ms, colors/transform only
- `rise-in` entrance on hero (staggered 80ms)
- Route line dash animation: 24s linear ambient
- Everything respects `prefers-reduced-motion`

## Rules (from ui-ux-pro-max audit)

- No emoji as icons — Lucide or original SVG only
- One primary CTA (sunset orange) per view; teal for secondary actions
- Focus rings never removed (`:focus-visible` global)
- Text contrast ≥ 4.5:1 on light surfaces
- No fake statistics, reviews, or awards — placeholders are labelled
