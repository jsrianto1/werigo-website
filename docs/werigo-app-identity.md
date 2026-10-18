# WERIGO PWA identity — 18 October 2026

## Direction

Island freedom, powered by WEDISON. A rental companion for visitors exploring Bali at their own pace.

The app uses Werigo's existing wing silhouette, an uppercase Outfit wordmark, electric teal, pale island greens and a deep teal dock. The red EdPower is the lead product. The original WEDISON endorsement remains an unmodified image. Route lines and ticket details connect rental, discovery and rewards without copying a ride-hailing interface.

## Design contract

- Scope: `/app` only. Marketing pages, hero video, SAGA, environment files, pricing, delivery rules and authentication behaviour stay unchanged.
- Every motorcycle photo uses `object-fit: contain` and its own bounded image region. No text or buttons cover the motorcycle.
- Home starts with the electric rental, followed by charging, Bali discoveries and Ride Club.
- Four labelled navigation stops: Home, Discover, My rides, Account. The dock and rental action bar reserve separate safe-area space.
- Login/sign-up stays the installed entry point. Identity documents are still collected only during rental.
- Actual balances, histories, fees and membership rules remain data-driven. No fake balances, ratings, benefits or time-limited discounts.
- Light and dark modes share the same identity and retain explicit foreground/background colours. Date fields stay stacked on mobile.

## Palette and type

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f5f8f5` | `#09282b` |
| Surface | `#ffffff` | `#113438` |
| Text | `#123b3e` | `#eef6ee` |
| Brand/action | `#006c63` | `#8ce7cb` |
| Hero | `#d9f3e9` | `#164442` |

Outfit is scoped to the PWA. Headers use deliberate tight tracking; controls use readable weights and tabular figures. Field text remains at least 16px on phones.

The install icon uses the same wing on deep teal, with artwork inside the maskable safe circle. Re-render its three PNG sizes with `node scripts/app-icons.mjs`. The manifest still opens `/app/login`; the offline page retains its original unmodified WEDISON endorsement and caches no customer content.

## Reference research

[Grab](https://www.grab.com/id/), [Gojek](https://www.gojek.com/en-id) and [Uber](https://www.uber.com/) were reviewed as examples of clear service hierarchy and consistent identity. Their layouts, proprietary typography, illustrations and promotion styles are not reused. Werigo's own motorcycles, Bali photography, wing symbol and Wedison relationship define this implementation.

## Review gate

Inspect home, login, sign-up, discover, rewards, account, charging, rental dates, model selection and checkout in both appearances. Check real rendered screens, image containment, page overflow, nav/action spacing, keyboard focus and reduced-motion behaviour. Build/type checks supplement visual inspection; they do not substitute for physical iPhone and Android installation tests.

## Implementation review

Reviewed in Chrome using responsive viewports at 320, 390/391, 430 and 1280 pixels. Home, login, account and rewards were reviewed in light/dark appearances; charging, discovery content, delivery map and ride history were reviewed in dark. The showroom rental path was driven through dates, model choice and checkout in light mode. No booking or payment was submitted. Motorcycle images loaded and used `contain`; tested pages had no horizontal overflow. On the 320px rental date screen, the floating action footer and navigation dock had 17px between their bounding boxes.

Production build, TypeScript, scoped ESLint, PWA tests and delivery-distance regression checks passed. Local previews intentionally do not load production database or auth credentials, so live Google sign-in/account creation and actual customer history were not exercised. Physical Android/iPhone installation remains a separate device check. A legacy Puppeteer journey script could not launch Chrome in this environment; the PWA rental path was checked manually with the connected browser instead.

Release gate: verify the hosted deployment and its live assets separately before reporting publication. Keep the public website and production environment configuration unchanged.
