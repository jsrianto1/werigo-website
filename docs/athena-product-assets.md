# Athena product assets, 17 November 2026

Website, PWA and Ops use the owner's reviewed five-colour Athena masters: olive green, white, black, pink and yellow. The black front display plate, side-body WEDISON emblem and WEDISON mark/wordmark on the lower center-front lamp must remain visible in future product artwork.

The source masters are 3840 x 3320 transparent PNG and lossless WebP files. They are retouched/upscaled assets, not new native-4K photography. Deployment derivatives preserve aspect ratio with `contain`, retain transparency and safe margins, and use appropriately sized WebP files instead of sending full 4K PNGs to every browser.

Current image URLs use the suffix `v20261117` to avoid stale image caches. Older Athena aliases have also been refreshed for existing links. `athena-asset-release-2026-11-17.json` records the source checksums and deployment derivative checksums.

Consumers:

- Website catalog, booking and about: `src/data/media.ts`.
- Website gallery: all five colour photos and thumbnails in `src/data/media.ts`; the gallery changes only its displayed photo.
- PWA rental/model display: `src/data/appBikes.ts`, using the same new Athena catalog derivative.
- Ops unit photos: `src/ops/lib/fleet-colors.ts`; existing English/Indonesian colour aliases select the corresponding new photo.
- SAGA product card: `src/data/saga.ts`.
- Existing Athena marketing cutout: `src/components/marketing/WelcomeOffer.tsx`.

Opening video/poster, SAGA story panels, other motorcycle models, actual unit/booking photos, stock, rates, booking/payment logic and environment settings are outside this asset release.
