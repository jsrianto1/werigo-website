/**
 * Wedison fleet — the single verified data source for every card,
 * comparison, product page, booking step, WhatsApp message and schema.
 *
 * Brand relationship: Wedison is the motorcycle product brand;
 * Werigo is Wedison's electric motorcycle rental and mobility
 * service in Bali. Products are always "Wedison <Model>", never
 * "Werigo <Model>".
 *
 * All specifications below are APPROVED official Wedison product
 * information (2026-07-26). Do not add specs that are not listed —
 * fields intentionally left undefined are not yet approved.
 * Rental prices are intentionally absent: rates are provided on
 * request until approved figures exist.
 */

export type VariantName = "Standard" | "Extended";

export interface WedisonEntry {
  /** Unique data id: bees | victory | victory-extended | athena | athena-extended | edpower */
  id: string;
  /** Route slug — variants share their model's page, e.g. /fleet/victory */
  modelSlug: string;
  /** Product brand — always Wedison */
  brand: "Wedison";
  /** Model name without brand, e.g. "Victory" */
  model: string;
  /** Variant, when the model has more than one configuration */
  variant: VariantName | null;
  /** Full product name, e.g. "Wedison Victory Extended" */
  displayName: string;
  /** True for the four entries shown as primary fleet cards */
  primaryCard: boolean;
  positioning: string;
  description: string;
  /** Motor power in watts */
  motorW: number;
  /** Top speed in km/h — always presented as "up to" */
  topSpeedKmh: number;
  /** LFP battery capacity in Wh */
  batteryWh: number;
  /** Claimed range in km — always presented as "up to" */
  claimedRangeKm: number;
  /** Approved home-charging description; undefined = not approved yet */
  homeCharging?: string;
  /** Confirmed Wedison Supercharge support */
  supercharge: boolean;
  /** Approved physical specs — undefined means not approved, never invent */
  dimensionsMm?: string;
  tiresFront?: string;
  tiresRear?: string;
  seatHeightMm?: number;
  wheelbaseMm?: number;
  weightKgApprox?: number;
  brakes?: string;
  /** Notable technology features */
  features?: string[];
  /** Werigo rental service inclusions (service-level, not product spec) */
  includedEquipment: string[];
  /** Listing toggle — availability is always confirmed by request */
  listed: boolean;
  featured: boolean;
}

export const wedisonFleet: WedisonEntry[] = [
  {
    id: "bees",
    modelSlug: "bees",
    brand: "Wedison",
    model: "Bees",
    variant: null,
    displayName: "Wedison Bees",
    primaryCard: true,
    positioning: "Compact and lightweight urban electric scooter",
    description:
      "The Wedison Bees is the light, nimble way around town — an urban electric scooter made for short hops between beach clubs, coworking spots and warungs. Easy to park, effortless in traffic, and quiet enough to hear the ocean on the way.",
    motorW: 1200,
    topSpeedKmh: 55,
    batteryWh: 1600,
    claimedRangeKm: 80,
    homeCharging:
      "Approximately 4–6 hours from a 220V outlet with the official Wedison charger",
    supercharge: false,
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: true,
  },
  {
    id: "victory",
    modelSlug: "victory",
    brand: "Wedison",
    model: "Victory",
    variant: "Standard",
    displayName: "Wedison Victory",
    primaryCard: true,
    positioning: "The everyday all-rounder with real highway pace",
    description:
      "The Wedison Victory balances comfort and punch — a relaxed riding position and confident acceleration that makes exploring from Seminyak to Uluwatu simple. Supports home charging and Wedison Supercharge for fast top-ups on big days.",
    motorW: 3000,
    topSpeedKmh: 80,
    batteryWh: 2534,
    claimedRangeKm: 110,
    supercharge: true,
    tiresFront: "14-inch",
    tiresRear: "14-inch",
    brakes: "Disc brakes with CBS",
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: true,
  },
  {
    id: "victory-extended",
    modelSlug: "victory",
    brand: "Wedison",
    model: "Victory",
    variant: "Extended",
    displayName: "Wedison Victory Extended",
    primaryCard: false,
    positioning: "The Victory with a bigger battery for longer days",
    description:
      "The Victory Extended pairs the same 3,000 W drive with a larger 3,456 Wh battery — up to 120 km of claimed range for riders who want the whole coast in one charge. Supports home charging and Wedison Supercharge.",
    motorW: 3000,
    topSpeedKmh: 80,
    batteryWh: 3456,
    claimedRangeKm: 120,
    supercharge: true,
    tiresFront: "14-inch",
    tiresRear: "14-inch",
    brakes: "Disc brakes with CBS",
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: false,
  },
  {
    id: "athena",
    modelSlug: "athena",
    brand: "Wedison",
    model: "Athena",
    variant: "Standard",
    displayName: "Wedison Athena",
    primaryCard: true,
    positioning: "The refined cruiser for comfortable island days",
    description:
      "The Wedison Athena is the comfortable choice for full island days — a low 770 mm seat, front and rear disc brakes and a roughly 3-hour home charge. Supercharge support means a coffee stop is all it takes to keep going.",
    motorW: 2500,
    topSpeedKmh: 80,
    batteryWh: 2534,
    claimedRangeKm: 110,
    homeCharging: "Approximately 3 hours",
    supercharge: true,
    dimensionsMm: "1,850 × 750 × 1,155 mm",
    tiresFront: "100/80-12",
    tiresRear: "100/80-12",
    seatHeightMm: 770,
    wheelbaseMm: 1300,
    weightKgApprox: 105,
    brakes: "Front and rear disc brakes",
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: true,
  },
  {
    id: "athena-extended",
    modelSlug: "athena",
    brand: "Wedison",
    model: "Athena",
    variant: "Extended",
    displayName: "Wedison Athena Extended",
    primaryCard: false,
    positioning: "The Athena with extended range for the long way home",
    description:
      "The Athena Extended keeps the same comfortable chassis and adds a 3,456 Wh battery — up to 120 km of claimed range, roughly 3-hour home charging, and Wedison Supercharge support.",
    motorW: 2500,
    topSpeedKmh: 80,
    batteryWh: 3456,
    claimedRangeKm: 120,
    homeCharging: "Approximately 3 hours",
    supercharge: true,
    dimensionsMm: "1,850 × 750 × 1,155 mm",
    tiresFront: "100/80-12",
    tiresRear: "100/80-12",
    seatHeightMm: 770,
    wheelbaseMm: 1300,
    weightKgApprox: 105,
    brakes: "Front and rear disc brakes",
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: false,
  },
  {
    id: "edpower",
    modelSlug: "edpower",
    brand: "Wedison",
    model: "EdPower",
    variant: null,
    displayName: "Wedison EdPower",
    primaryCard: true,
    positioning: "Premium flagship with the longest range and most complete technology",
    description:
      "The Wedison EdPower is the flagship — up to 200 km of claimed range from a 5,068 Wh battery, a TFT display with Apple CarPlay and Android Auto, and Supercharge support. The most complete technology in the fleet, for riders who want the whole island.",
    motorW: 3000,
    topSpeedKmh: 90,
    batteryWh: 5068,
    claimedRangeKm: 200,
    homeCharging: "Approximately 3 hours",
    supercharge: true,
    dimensionsMm: "2,000 × 710 × 1,200 mm",
    tiresFront: "100/80-14",
    tiresRear: "120/70-14",
    seatHeightMm: 760,
    wheelbaseMm: 1350,
    weightKgApprox: 120,
    brakes: "Front and rear disc brakes",
    features: ["TFT display", "Apple CarPlay", "Android Auto"],
    includedEquipment: ["2 helmets", "Phone holder", "Rain poncho"],
    listed: true,
    featured: true,
  },
];

/** Mandated specification disclaimer — use wherever specs appear. */
export const specDisclaimer =
  "Specifications are based on official Wedison product information. Actual riding range varies depending on riding style, passenger load, terrain, traffic, and weather.";

/** One entry by unique data id (e.g. "victory-extended"). */
export function getEntry(id: string): WedisonEntry | undefined {
  return wedisonFleet.find((e) => e.id === id);
}

/** Primary entry for a model page slug (e.g. "victory" → Standard). */
export function getModel(modelSlug: string): WedisonEntry | undefined {
  return wedisonFleet.find((e) => e.modelSlug === modelSlug && e.primaryCard);
}

/** All variants for a model page slug, Standard first. */
export function getVariants(modelSlug: string): WedisonEntry[] {
  return wedisonFleet.filter((e) => e.modelSlug === modelSlug);
}

/** The four primary fleet cards. */
export function getPrimaryCards(): WedisonEntry[] {
  return wedisonFleet.filter((e) => e.primaryCard);
}

export function getFeatured(): WedisonEntry[] {
  return wedisonFleet.filter((e) => e.featured);
}

/** Listed entries (availability itself is always confirmed by request). */
export function getListedEntries(): WedisonEntry[] {
  return wedisonFleet.filter((e) => e.listed);
}

export function getListedModels(): WedisonEntry[] {
  return wedisonFleet.filter((e) => e.listed && e.primaryCard);
}

/* ============================================================
   CUSTOMER-FACING CONSOLIDATION (management, 2026-07-26):
   exactly four rental models are shown — Bees, Victory, Athena,
   EdPower. Variant entries stay in the data (their specs are
   approved) but are never surfaced as separate rental options.
   ============================================================ */

/**
 * Resolve any entry id (including legacy variant ids from old
 * bookmarks or localStorage drafts) to the customer-facing model
 * entry.
 */
export function toCustomerEntry(id: string): WedisonEntry | undefined {
  const entry = getEntry(id);
  if (!entry) return undefined;
  return entry.primaryCard ? entry : getModel(entry.modelSlug);
}

/**
 * Value of a spec if it is identical across all variants of a model;
 * null when variants differ. Consolidated surfaces must hide
 * differing values rather than pick one (management: do not invent
 * replacement specifications).
 */
export function sharedSpec<K extends keyof WedisonEntry>(
  modelSlug: string,
  key: K
): WedisonEntry[K] | null {
  const variants = getVariants(modelSlug);
  if (variants.length === 0) return null;
  const first = variants[0][key];
  return variants.every((v) => v[key] === first) ? first : null;
}
