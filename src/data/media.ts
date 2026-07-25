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
    alt: "Rider on a Werigo electric motorcycle on a Bali coastal road",
    width: 2560,
    height: 1440,
    available: false,
  },
  "hero-video": {
    kind: "video",
    src: "/media/hero/home-hero.mp4",
    poster: "/media/hero/home-hero-poster.jpg",
    label: "Werigo electric motorcycles riding through Bali",
    width: 1920,
    height: 1080,
    available: false,
  },

  // ---- Fleet (per model: main, side, detail) ----
  "fleet-bees-main": { kind: "image", src: "/media/fleet/bees/main.jpg", alt: "Werigo Bees electric scooter — main product photo", width: 1600, height: 1200, available: false },
  "fleet-bees-side": { kind: "image", src: "/media/fleet/bees/side.jpg", alt: "Werigo Bees — side view", width: 1600, height: 1200, available: false },
  "fleet-bees-detail": { kind: "image", src: "/media/fleet/bees/detail.jpg", alt: "Werigo Bees — detail shot", width: 1600, height: 1200, available: false },
  "fleet-victory-main": { kind: "image", src: "/media/fleet/victory/main.jpg", alt: "Werigo Victory electric motorcycle — main product photo", width: 1600, height: 1200, available: false },
  "fleet-victory-side": { kind: "image", src: "/media/fleet/victory/side.jpg", alt: "Werigo Victory — side view", width: 1600, height: 1200, available: false },
  "fleet-victory-detail": { kind: "image", src: "/media/fleet/victory/detail.jpg", alt: "Werigo Victory — detail shot", width: 1600, height: 1200, available: false },
  "fleet-athena-main": { kind: "image", src: "/media/fleet/athena/main.jpg", alt: "Werigo Athena electric motorcycle — main product photo", width: 1600, height: 1200, available: false },
  "fleet-athena-side": { kind: "image", src: "/media/fleet/athena/side.jpg", alt: "Werigo Athena — side view", width: 1600, height: 1200, available: false },
  "fleet-athena-detail": { kind: "image", src: "/media/fleet/athena/detail.jpg", alt: "Werigo Athena — detail shot", width: 1600, height: 1200, available: false },
  "fleet-edpower-main": { kind: "image", src: "/media/fleet/edpower/main.jpg", alt: "Werigo EdPower electric motorcycle — main product photo", width: 1600, height: 1200, available: false },
  "fleet-edpower-side": { kind: "image", src: "/media/fleet/edpower/side.jpg", alt: "Werigo EdPower — side view", width: 1600, height: 1200, available: false },
  "fleet-edpower-detail": { kind: "image", src: "/media/fleet/edpower/detail.jpg", alt: "Werigo EdPower — detail shot", width: 1600, height: 1200, available: false },

  // ---- Lifestyle: customers riding in Bali ----
  "riding-01": { kind: "image", src: "/media/riding/riding-01.jpg", alt: "Customers riding Werigo electric motorcycles past Bali rice terraces", width: 1920, height: 1280, available: false },
  "riding-02": { kind: "image", src: "/media/riding/riding-02.jpg", alt: "Rider on a Werigo electric motorcycle at a Bali beach at sunset", width: 1920, height: 1280, available: false },
  "riding-03": { kind: "image", src: "/media/riding/riding-03.jpg", alt: "Two riders exploring Ubud on Werigo electric motorcycles", width: 1920, height: 1280, available: false },

  // ---- Delivery & handover ----
  "delivery-01": { kind: "image", src: "/media/delivery/handover-01.jpg", alt: "Werigo team delivering an electric motorcycle to a Bali villa", width: 1920, height: 1280, available: false },
  "delivery-02": { kind: "image", src: "/media/delivery/handover-02.jpg", alt: "Helmet fitting and riding briefing at a Werigo handover", width: 1920, height: 1280, available: false },

  // ---- Supercharge ----
  "supercharge-hero": { kind: "image", src: "/media/supercharge/hero.jpg", alt: "Werigo electric motorcycle at a Supercharge fast-charging point", width: 2560, height: 1440, available: false },
  "supercharge-video": { kind: "video", src: "/media/supercharge/supercharge.mp4", poster: "/media/supercharge/supercharge-poster.jpg", label: "A Werigo Supercharge session from arrival to ride-out", width: 1920, height: 1080, available: false },
  "supercharge-process-01": { kind: "image", src: "/media/supercharge/process-01.jpg", alt: "Rider arriving at a Werigo Supercharge point", width: 1600, height: 1200, available: false },
  "supercharge-process-02": { kind: "image", src: "/media/supercharge/process-02.jpg", alt: "Werigo team connecting a motorcycle to the fast charger", width: 1600, height: 1200, available: false },
  "supercharge-process-03": { kind: "image", src: "/media/supercharge/process-03.jpg", alt: "Rider leaving a Supercharge point with a full battery", width: 1600, height: 1200, available: false },

  // ---- About / team ----
  "about-team": { kind: "image", src: "/media/about/team.jpg", alt: "The Werigo team with the fleet in Bali", width: 1920, height: 1440, available: false },
} as const satisfies Record<string, MediaAsset>;

export type MediaId = keyof typeof media;

export function getMedia(id: MediaId): MediaAsset {
  return media[id];
}

/** Loose lookup for dynamically-built ids (e.g. `fleet-${slug}-main`). */
export function findMedia(id: string): MediaAsset | undefined {
  return (media as Record<string, MediaAsset>)[id];
}

/** Station photos follow /media/stations/<station-slug>.jpg — added per verified station. */
