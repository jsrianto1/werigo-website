/**
 * Delivery-area photography — authentic, location-verified images
 * only. Full provenance (source page, photographer, licence,
 * verification, download date) lives in AREA-MEDIA-SOURCES.md.
 * All files are stored locally; nothing is hotlinked.
 */

export interface AreaMedia {
  /** Path under /public */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** object-position focal point for wide crops */
  focal: string;
  /** Short credit line (photographer · licence) */
  credit: string;
}

export const areaMedia: Record<string, AreaMedia> = {
  canggu: {
    src: "/media/areas/canggu/hero.webp",
    alt: "Surfer carrying a board across Canggu Beach at sunset, Bali",
    width: 2000,
    height: 3000,
    focal: "50% 35%",
    credit: "Hc Digital · Unsplash License",
  },
  seminyak: {
    src: "/media/areas/seminyak/hero.webp",
    alt: "Waves rolling onto Seminyak beach at sunset, Bali",
    width: 2000,
    height: 1500,
    focal: "50% 40%",
    credit: "Stefano Magini · Unsplash License",
  },
  kuta: {
    src: "/media/areas/kuta/hero.webp",
    alt: "Golden late-afternoon light on Kuta Beach, Bali",
    width: 2000,
    height: 1335,
    focal: "50% 45%",
    credit: "Jakub Hałun · CC BY-SA 4.0, Wikimedia Commons",
  },
  ubud: {
    src: "/media/areas/ubud/hero.webp",
    alt: "Tegallalang rice terraces near Ubud, Bali",
    width: 2000,
    height: 1260,
    focal: "50% 55%",
    credit: "Alana Harris · Unsplash License",
  },
  uluwatu: {
    src: "/media/areas/uluwatu/hero.webp",
    alt: "Uluwatu clifftop above the Indian Ocean at Pecatu, Bali",
    width: 2000,
    height: 1128,
    focal: "50% 45%",
    credit: "Ferdy Tjiptoraharjo · Unsplash License",
  },
  jimbaran: {
    src: "/media/areas/jimbaran/hero.webp",
    alt: "Sunset over Jimbaran Bay, Bali",
    width: 2000,
    height: 1333,
    focal: "50% 45%",
    credit: "Simon_sees · CC BY 2.0, Wikimedia Commons",
  },
  sanur: {
    src: "/media/areas/sanur/hero.webp",
    alt: "Traditional jukung boats at sunrise on Sanur Beach, Bali",
    width: 2000,
    height: 1500,
    focal: "50% 55%",
    credit: "Danangtrihartanto · CC BY-SA 4.0, Wikimedia Commons",
  },
  denpasar: {
    src: "/media/areas/denpasar/hero.webp",
    alt: "Bajra Sandhi Monument silhouetted against the sky in Denpasar, Bali",
    width: 2000,
    height: 1500,
    focal: "50% 50%",
    credit: "Wikimedia Commons contributor · CC BY-SA 4.0",
  },
};

export function getAreaMedia(slug: string): AreaMedia | undefined {
  return areaMedia[slug];
}
