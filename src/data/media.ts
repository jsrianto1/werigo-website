/**
 * Central media manifest — the single switchboard for real photography
 * and video across the site.
 *
 * HOW TO PUBLISH REAL MEDIA:
 * 1. Drop the file into /public at the exact `src` path below
 *    (see MEDIA-MANIFEST.md for dimensions and formats).
 * 2. Flip `available` to true.
 * Nothing else changes — every component reads from this manifest and
 * shows a labelled placeholder until `available` is true. Broken image
 * elements are never rendered.
 */

export interface MediaImageAsset {
  kind: "image";
  /** Path under /public */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Set true once the real file exists in /public */
  available: boolean;
}

export interface MediaVideoAsset {
  kind: "video";
  /** MP4 (H.264) path under /public */
  src: string;
  /** Poster image path under /public */
  poster: string;
  /** Accessible description of the video content */
  label: string;
  width: number;
  height: number;
  available: boolean;
}

export type MediaAsset = MediaImageAsset | MediaVideoAsset;

export const media = {
  // ---- Homepage hero ----
  "hero-photo": {
    kind: "image",
    src: "/media/hero/home-hero.jpg",
    alt: "Rider on a Wedison electric motorcycle on a Bali coastal road, rented through Werigo",
    width: 2560,
    height: 1440,
    available: false,
  },
  "hero-video": {
    kind: "video",
    src: "/media/hero/home-hero.mp4",
    poster: "/media/hero/home-hero-poster.jpg",
    label: "Wedison electric motorcycles from Werigo riding through Bali",
    width: 1920,
    height: 1080,
    available: false,
  },

  // ---- Fleet (per model: main, side, detail) ----
  "fleet-bees-main": { kind: "image", src: "/media/fleet/bees/main.webp", alt: "Wedison Bees electric scooter available for rent through Werigo in Bali, main product photo", width: 788, height: 852, available: true },
  "fleet-bees-side": { kind: "image", src: "/media/fleet/bees/side.jpg", alt: "Side view of the Wedison Bees", width: 1600, height: 1200, available: false },
  "fleet-bees-detail": { kind: "image", src: "/media/fleet/bees/detail.jpg", alt: "Detail view of the Wedison Bees", width: 1600, height: 1200, available: false },
  "fleet-victory-main": { kind: "image", src: "/media/fleet/victory/main.webp", alt: "Wedison Victory electric motorcycle available for rent through Werigo in Bali, main product photo", width: 847, height: 814, available: true },
  "fleet-victory-side": { kind: "image", src: "/media/fleet/victory/side.jpg", alt: "Side view of the Wedison Victory", width: 1600, height: 1200, available: false },
  "fleet-victory-detail": { kind: "image", src: "/media/fleet/victory/detail.jpg", alt: "Detail view of the Wedison Victory", width: 1600, height: 1200, available: false },
  "fleet-athena-main": { kind: "image", src: "/media/fleet/athena/main.webp", alt: "Wedison Athena electric motorcycle available for rent through Werigo in Bali, main product photo", width: 1101, height: 952, available: true },
  "fleet-athena-side": { kind: "image", src: "/media/fleet/athena/side.jpg", alt: "Side view of the Wedison Athena", width: 1600, height: 1200, available: false },
  "fleet-athena-detail": { kind: "image", src: "/media/fleet/athena/detail.jpg", alt: "Detail view of the Wedison Athena", width: 1600, height: 1200, available: false },
  "fleet-edpower-main": { kind: "image", src: "/media/fleet/edpower/main.webp", alt: "Wedison EdPower electric motorcycle available for rent through Werigo in Bali, main product photo", width: 1300, height: 914, available: true },
  "fleet-edpower-side": { kind: "image", src: "/media/fleet/edpower/side.jpg", alt: "Side view of the Wedison EdPower", width: 1600, height: 1200, available: false },
  "fleet-edpower-detail": { kind: "image", src: "/media/fleet/edpower/detail.jpg", alt: "Detail view of the Wedison EdPower", width: 1600, height: 1200, available: false },

  // ---- Lifestyle: customers riding in Bali ----
  "riding-01": { kind: "image", src: "/media/riding/riding-01.jpg", alt: "Customers riding Wedison electric motorcycles past Bali rice terraces", width: 1920, height: 1280, available: false },
  "riding-02": { kind: "image", src: "/media/riding/riding-02.jpg", alt: "Rider on a Wedison electric motorcycle at a Bali beach at sunset", width: 1920, height: 1280, available: false },
  "riding-03": { kind: "image", src: "/media/riding/riding-03.jpg", alt: "Two riders exploring Ubud on Wedison electric motorcycles", width: 1920, height: 1280, available: false },

  // ---- Delivery & handover ----
  "delivery-01": { kind: "image", src: "/media/delivery/handover-01.jpg", alt: "Werigo team delivering a Wedison electric motorcycle to a Bali villa", width: 1920, height: 1280, available: false },
  "delivery-02": { kind: "image", src: "/media/delivery/handover-02.jpg", alt: "Helmet fitting and riding briefing at a Werigo handover", width: 1920, height: 1280, available: false },

  // ---- Supercharge ----
  "supercharge-unit": { kind: "image", src: "/media/supercharge/supercharge-unit.png", alt: "Official Wedison Supercharge fast-charging unit", width: 1200, height: 1600, available: true },
  "supercharge-hero": { kind: "image", src: "/media/supercharge/hero.jpg", alt: "Wedison electric motorcycle at a Wedison Supercharge fast-charging point", width: 2560, height: 1440, available: false },
  "supercharge-video": { kind: "video", src: "/media/supercharge/supercharge.mp4", poster: "/media/supercharge/supercharge-poster.jpg", label: "A Wedison Supercharge session from arrival to ride-out", width: 1920, height: 1080, available: false },
  "supercharge-process-01": { kind: "image", src: "/media/supercharge/process-01.jpg", alt: "Rider arriving at a Wedison Supercharge location", width: 1600, height: 1200, available: false },
  "supercharge-process-02": { kind: "image", src: "/media/supercharge/process-02.jpg", alt: "Werigo team connecting a motorcycle to the fast charger", width: 1600, height: 1200, available: false },
  "supercharge-process-03": { kind: "image", src: "/media/supercharge/process-03.jpg", alt: "Rider leaving a Supercharge point with a full battery", width: 1600, height: 1200, available: false },

  // ---- About / team ----
  "about-team": { kind: "image", src: "/media/about/team.jpg", alt: "The Werigo team with the Wedison fleet in Bali", width: 1920, height: 1440, available: false },
} as const satisfies Record<string, MediaAsset>;

export type MediaId = keyof typeof media;

export function getMedia(id: MediaId): MediaAsset {
  return media[id];
}

/** Loose lookup for dynamically-built ids (e.g. `fleet-${slug}-main`). */
export function findMedia(id: string): MediaAsset | undefined {
  return (media as Record<string, MediaAsset>)[id];
}

/* ============================================================
   Colour variants — official Wedison colour photography only.
   Sources documented in MEDIA-SOURCES.md. Only add a colour when
   the model and colour are clearly confirmed by the official
   wedison.co page or asset. Colour availability is subject to
   confirmation — the selector states this to customers.
   ============================================================ */

export interface ColorVariant {
  /** Customer-facing colour name, confirmed by the official source */
  name: string;
  /** Full product image under /public */
  image: string;
  /** Small swatch thumbnail under /public */
  thumb: string;
  alt: string;
  width: number;
  height: number;
}

/** Keyed by model page slug. EdPower: colour naming awaiting
    official confirmation — no variants published yet. */
export const modelColors: Record<string, ColorVariant[]> = {
  bees: [
    {
      name: "Red",
      image: "/media/fleet/bees/colors/red.webp",
      thumb: "/media/fleet/bees/colors/red-thumb.webp",
      alt: "Red Wedison Bees electric scooter available for rent through Werigo in Bali",
      width: 1920,
      height: 706,
    },
    {
      name: "White",
      image: "/media/fleet/bees/colors/white.webp",
      thumb: "/media/fleet/bees/colors/white-thumb.webp",
      alt: "White Wedison Bees electric scooter available for rent through Werigo in Bali",
      width: 1920,
      height: 1080,
    },
  ],
  victory: [
    {
      name: "Grey",
      image: "/media/fleet/victory/colors/grey.webp",
      thumb: "/media/fleet/victory/colors/grey-thumb.webp",
      alt: "Grey Wedison Victory electric motorcycle available for rent through Werigo in Bali",
      width: 1920,
      height: 706,
    },
  ],
  athena: [
    {
      name: "Green",
      image: "/media/fleet/athena/colors/green.webp",
      thumb: "/media/fleet/athena/colors/green-thumb.webp",
      alt: "Green Wedison Athena electric motorcycle available for rent through Werigo in Bali",
      width: 1920,
      height: 706,
    },
    // Pink and Yellow are referenced on the official Athena page but
    // have no downloadable official product images yet — do not add
    // until official assets exist.
  ],
  edpower: [
    // Colour naming awaiting official confirmation.
  ],
};

export function getModelColors(modelSlug: string): ColorVariant[] {
  return modelColors[modelSlug] ?? [];
}

/** Station photos follow /media/stations/<station-slug>.jpg — added per verified station. */
