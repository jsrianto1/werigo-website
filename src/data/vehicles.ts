/**
 * Werigo fleet — central vehicle database.
 * Edit this file to update models, pricing, specs and availability.
 *
 * Images: PLACEHOLDER paths. Drop official product photos into
 * /public/fleet/<slug>/ and update the arrays below.
 */

export interface Vehicle {
  /** Display model name */
  name: string;
  /** URL slug, e.g. /fleet/bees */
  slug: string;
  /** Short positioning line shown on cards */
  positioning: string;
  /** Longer description for the detail page */
  description: string;
  /** Image paths relative to /public. Placeholders until official photos arrive. */
  images: string[];
  /** Pricing in IDR */
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  /** Real-world range on one charge, km */
  rangeKm: number;
  /** Top speed, km/h */
  topSpeedKmh: number;
  /** Battery spec */
  battery: string;
  /** Full charge time */
  chargingTime: string;
  /** Rider + passenger */
  seatCapacity: number;
  /** What comes with every rental of this model */
  includedEquipment: string[];
  /** Toggle to hide a model from search results without deleting it */
  available: boolean;
  /** Shown in the homepage featured strip */
  featured: boolean;
}

export const vehicles: Vehicle[] = [
  {
    name: "Bees",
    slug: "bees",
    positioning: "The nimble city hopper for cafés and coastlines",
    description:
      "The Bees is our lightest ride — an agile electric scooter made for short hops between beach clubs, coworking spots and warungs. Easy to park, effortless in traffic, and quiet enough to hear the ocean on the way.",
    images: ["/fleet/bees/placeholder-1.svg", "/fleet/bees/placeholder-2.svg"],
    pricePerDay: 120000,
    pricePerWeek: 700000,
    pricePerMonth: 2200000,
    rangeKm: 65,
    topSpeedKmh: 60,
    battery: "72V 32Ah lithium, swappable",
    chargingTime: "4–5 hours (standard outlet)",
    seatCapacity: 2,
    includedEquipment: ["2 helmets", "Phone holder", "USB charging port", "Rain poncho"],
    available: true,
    featured: true,
  },
  {
    name: "Victory",
    slug: "victory",
    positioning: "The everyday all-rounder with room for two",
    description:
      "Victory balances comfort and punch. A relaxed riding position, wide seat and steady mid-range torque make it the pick for couples exploring from Seminyak to Uluwatu without thinking twice about the battery.",
    images: ["/fleet/victory/placeholder-1.svg", "/fleet/victory/placeholder-2.svg"],
    pricePerDay: 150000,
    pricePerWeek: 875000,
    pricePerMonth: 2750000,
    rangeKm: 80,
    topSpeedKmh: 70,
    battery: "72V 38Ah lithium, swappable",
    chargingTime: "5–6 hours (standard outlet)",
    seatCapacity: 2,
    includedEquipment: ["2 helmets", "Phone holder", "USB charging port", "Rain poncho", "Under-seat storage"],
    available: true,
    featured: true,
  },
  {
    name: "Athena",
    slug: "athena",
    positioning: "The premium cruiser for long island days",
    description:
      "Athena is the long-distance choice: a bigger battery, plusher suspension and confident braking for full-day loops — rice terraces in the morning, cliff temples at golden hour, and enough charge left for dinner in between.",
    images: ["/fleet/athena/placeholder-1.svg", "/fleet/athena/placeholder-2.svg"],
    pricePerDay: 185000,
    pricePerWeek: 1080000,
    pricePerMonth: 3400000,
    rangeKm: 100,
    topSpeedKmh: 80,
    battery: "72V 45Ah dual lithium, swappable",
    chargingTime: "6–7 hours (standard outlet)",
    seatCapacity: 2,
    includedEquipment: ["2 premium helmets", "Phone holder", "USB charging port", "Rain poncho", "Top box storage"],
    available: true,
    featured: true,
  },
  {
    name: "EdPower",
    slug: "edpower",
    positioning: "The performance flagship with maximum presence",
    description:
      "EdPower is the flagship of the Werigo fleet — sharp acceleration, sport styling and the strongest range figure we offer. For riders who want the electric future to feel fast, not just clean.",
    images: ["/fleet/edpower/placeholder-1.svg", "/fleet/edpower/placeholder-2.svg"],
    pricePerDay: 225000,
    pricePerWeek: 1320000,
    pricePerMonth: 4100000,
    rangeKm: 120,
    topSpeedKmh: 90,
    battery: "72V 50Ah dual lithium, swappable",
    chargingTime: "6–8 hours (standard outlet)",
    seatCapacity: 2,
    includedEquipment: ["2 premium helmets", "Phone holder", "USB charging port", "Rain poncho", "Top box storage", "Disc lock"],
    available: true,
    featured: true,
  },
];

export function getVehicle(slug: string): Vehicle | undefined {
  return vehicles.find((v) => v.slug === slug);
}

export function getFeaturedVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.featured);
}

export function getAvailableVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.available);
}
