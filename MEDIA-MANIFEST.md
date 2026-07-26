# Werigo Media Manifest

Every photo/video slot on the site is driven by `src/data/media.ts`.
Until a real file exists, a clearly-labelled placeholder renders — no
broken images are ever published.

## How to publish real media (2 steps)

1. Copy the file into `/public` at the **exact path** listed below.
2. In `src/data/media.ts`, flip that entry's `available` to `true`.

That's it — the component swaps the placeholder for an optimized
`next/image` (or HTML5 video) automatically.

## Ground rules

- Only genuine Werigo/Wedison photography/video — no Bikago assets, no
  random copyrighted images, no misleading stock.
- **Motorcycle images must show the actual matching Wedison model** —
  never substitute or generated motorcycle designs.
- Products are always named "Wedison <Model>" in alt text (e.g.
  "Wedison Athena electric motorcycle available for rent through
  Werigo in Bali"), never "Werigo <Model>".
- JPG for photos (quality ~80); Next.js serves WebP/AVIF automatically.
- Keep individual photos under ~600 KB where possible.

## Required files

### 1. Homepage hero

| File | Dimensions | Ratio | Notes |
|---|---|---|---|
| `public/media/hero/home-hero.jpg` | 2560×1440 | 16:9 | Rider on a Wedison motorcycle, Bali coastal road, light/airy |
| `public/media/hero/home-hero.mp4` | 1920×1080 | 16:9 | H.264 MP4, 10–20 s loop, no audio needed, **≤ 12 MB** |
| `public/media/hero/home-hero-poster.jpg` | 1920×1080 | 16:9 | First-frame poster for the video |

Video takes precedence over the photo when both are available.

### 2. Fleet product photos (per model)

For each of `bees`, `victory`, `athena`, `edpower`:

| File | Dimensions | Ratio | Status |
|---|---|---|---|
| `public/media/fleet/<slug>/main.webp` | ~1500×1050 | ~3:2 | ✅ **Delivered** — official watermarked Werigo product photos (2026-07-26, superseding the plain studio shots) |
| `public/media/fleet/<slug>/side.jpg` | 1600×1200 | 4:3 | Awaiting — full side profile |
| `public/media/fleet/<slug>/detail.jpg` | 1600×1200 | 4:3 | Awaiting — battery / dash / seat detail |

Used on: homepage fleet cards, /fleet, vehicle detail galleries,
booking search results. The Victory photo serves both Victory
variants; the Athena photo serves both Athena variants. Product
photos render with `object-contain` — never cropped or stretched.
Source masters live outside the repo (Downloads/Data Aset motor);
web versions are downscale-only.

### 3. Customers riding in Bali

| File | Dimensions | Ratio |
|---|---|---|
| `public/media/riding/riding-01.jpg` | 1920×1280 | 3:2 |
| `public/media/riding/riding-02.jpg` | 1920×1280 | 3:2 |
| `public/media/riding/riding-03.jpg` | 1920×1280 | 3:2 |

Reserved slots (manifest entries `riding-01..03`) for future
lifestyle sections — rice terraces, beach sunset, Ubud streets.

### 4. Delivery & handover

| File | Dimensions | Ratio |
|---|---|---|
| `public/media/delivery/handover-01.jpg` | 1920×1280 | 3:2 |
| `public/media/delivery/handover-02.jpg` | 1920×1280 | 3:2 |

Delivery at a villa; helmet fitting / briefing moment.

### 5. Supercharge

| File | Dimensions | Ratio | Notes |
|---|---|---|---|
| `public/media/supercharge/supercharge-unit.png` | 1200×1600 | 3:4 | ✅ **Delivered** — official Wedison Supercharge unit (transparent PNG) |
| `public/media/supercharge/hero.jpg` | 2560×1440 | 16:9 | Motorcycle at a charging point |
| `public/media/supercharge/supercharge.mp4` | 1920×1080 | 16:9 | H.264 MP4, 15–30 s, **≤ 15 MB** — full session arrival→ride-out |
| `public/media/supercharge/supercharge-poster.jpg` | 1920×1080 | 16:9 | Video poster |
| `public/media/supercharge/process-01.jpg` | 1600×1200 | 4:3 | Ride in |
| `public/media/supercharge/process-02.jpg` | 1600×1200 | 4:3 | Plug in / swap |
| `public/media/supercharge/process-03.jpg` | 1600×1200 | 4:3 | Ride out |

### 6. Charging-station locations

One photo per **verified** station, added alongside its entry in
`src/data/supercharge.ts`:

| File pattern | Dimensions | Ratio |
|---|---|---|
| `public/media/stations/<station-slug>.jpg` | 1600×1200 | 4:3 |

### 7. About / team

| File | Dimensions | Ratio |
|---|---|---|
| `public/media/about/team.jpg` | 1920×1440 | 4:3 |

## Video encoding recommendation

- Container/codec: **MP4 / H.264** (widest support), AAC audio or none
- Resolution: 1080p (1920×1080)
- Bitrate: ~6–8 Mbps for hero loops
- Length: hero 10–20 s; supercharge explainer 15–30 s
- Always provide the matching `-poster.jpg` so a frame shows before playback
