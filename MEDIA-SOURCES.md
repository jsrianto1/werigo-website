# Media Sources

Provenance record for every externally-sourced media asset in the
repository. Only official Wedison sources are permitted — no stock
photos, marketplace listings, social media, or AI-generated product
images. All images are stored locally; nothing is hotlinked.

## Official Wedison colour-variant photography

Retrieved 2026-07-26 from the official Wedison product pages
(images only — no specifications, copy or code were taken; the
approved Werigo product data remains authoritative).

| Local file | Model | Colour | Original source |
|---|---|---|---|
| `public/media/fleet/bees/colors/red.webp` (+`red-thumb.webp`) | Wedison Bees | Red — confirmed by official alt text "Red Bees" and image | `https://wedison.co/bees/` → `https://wedison.co/bees/bees-product-overview.webp` |
| `public/media/fleet/bees/colors/white.webp` (+`white-thumb.webp`) | Wedison Bees | White — confirmed by official alt text "Red Bees and White Bees" and image | `https://wedison.co/bees/` → `https://wedison.co/bees/bees-product-hero.webp` |
| `public/media/fleet/athena/colors/green.webp` (+`green-thumb.webp`) | Wedison Athena | Green — confirmed by official alt text "Green Athena" and image | `https://wedison.co/athena/` → `https://wedison.co/athena/athena-product-overview.webp` |
| `public/media/fleet/victory/colors/grey.webp` (+`grey-thumb.webp`) | Wedison Victory | Grey — confirmed by official alt text "Gray Victory" and image | `https://wedison.co/victory/` → `https://wedison.co/victory/victory-product-overview.webp` |

Assets were downloaded at their largest published resolution
(1920px wide) and re-encoded as optimized WebP (quality 88) with
320px swatch thumbnails. The motorcycles are unmodified — no
recoloring, redesign or distortion.

## Known but unavailable colours (do not substitute)

| Model | Colour | Status |
|---|---|---|
| Wedison Athena | Pink | Referenced in official page text ("Pink Athena") but no downloadable official product image exists — awaiting official asset |
| Wedison Athena | Yellow | Referenced in official page text ("Yellow Athena") but no downloadable official product image exists — awaiting official asset |
| Wedison EdPower | — | Official pages publish EdPower imagery without a colour name — colour naming awaiting confirmation; no variants published |

## Direct-from-management assets

See `MEDIA-MANIFEST.md`. Supplied directly by management:

- 2026-07-26: four fleet `main.webp` product photos with the official
  Werigo watermark ("<Model> Werigo watermark.png") — the current
  primary product images. Composition, watermark and shadow preserved;
  WebP re-encode only.
- 2026-07-26: Supercharge unit PNG from `Data Aset motor`.
- 2026-07-26: official Werigo master logo ("Werigo Logo.png") —
  derivatives in `public/brand/` (full, compact, symbol, OG banner)
  and app icons in `src/app/` were produced by background removal and
  cropping only; no redrawing, recoloring or rearrangement.
