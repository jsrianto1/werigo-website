/**
 * Werigo Supercharge — fast-charging network data.
 *
 * IMPORTANT: `stations` must contain ONLY verified, operational
 * charging points. Never publish planned or speculative locations.
 * Add a station by copying the template below with real details.
 *
 * `compatibleModelSlugs` is centrally editable — confirm each model's
 * fast-charge support with operations before adding it here.
 */

export interface SuperchargeStation {
  /** Display name, e.g. "Werigo Hub Canggu" */
  name: string;
  /** URL-safe id */
  slug: string;
  /** Service area slug from src/data/locations.ts */
  areaSlug: string;
  /** Street or landmark description */
  address: string;
  /** Google Maps share link */
  mapsUrl: string;
  /** Opening hours, e.g. "Daily 08:00 – 20:00" */
  hours: string;
  /** Number of charging bays */
  bays: number;
  /** Live = operating today. Only live stations are ever published. */
  status: "live";
}

/**
 * Verified stations — EMPTY until operations confirms real locations.
 * The Supercharge page renders an honest "ask us for the nearest point"
 * state while this list is empty.
 *
 * Template:
 * {
 *   name: "Werigo Hub Canggu",
 *   slug: "hub-canggu",
 *   areaSlug: "canggu",
 *   address: "Jl. ..., Canggu",
 *   mapsUrl: "https://maps.app.goo.gl/...",
 *   hours: "Daily 08:00 – 20:00",
 *   bays: 4,
 *   status: "live",
 * },
 */
export const superchargeStations: SuperchargeStation[] = [];

/**
 * Models confirmed compatible with Werigo Supercharge.
 * PLACEHOLDER — verify with operations before adding slugs.
 * Slugs must match src/data/vehicles.ts.
 */
export const compatibleModelSlugs: string[] = [];

/** Headline performance message — applies to compatible models only. */
export const superchargePerformance = {
  headline: "Charge Fast. Ride Farther.",
  message: "Charge 15 Minutes. Ride 100+ KM.",
  chargeMinutes: "approximately 15 minutes",
  rangeBenefit: "100+ km of riding range",
  caveat:
    "Charging performance applies to compatible Werigo electric motorcycle models. Actual charge time and range vary with battery level, model, load and riding conditions.",
};

export const superchargeSteps = [
  {
    title: "Ride in",
    text: "Bring your Werigo to any Supercharge point — no appointment needed. Your key tag identifies your motorcycle and rental.",
  },
  {
    title: "Plug in or swap",
    text: "Our on-site team connects your motorcycle, or swaps the battery where your model supports it. You don't touch a cable unless you want to.",
  },
  {
    title: "Ride out",
    text: "In roughly the time it takes to order a coffee, you're back to full riding range. The session is logged to your rental — no payment at the point.",
  },
];

export const superchargeFaq = [
  {
    question: "What is Werigo Supercharge?",
    answer:
      "Supercharge is Werigo's fast-charging service for compatible fleet models — dedicated points where your motorcycle gets back to full riding range in a fraction of standard overnight charging time, with our team handling the process.",
  },
  {
    question: "Which motorcycles can use Supercharge?",
    answer:
      "Fast-charge support depends on the model and battery configuration. We confirm your motorcycle's Supercharge compatibility when you book — ask on WhatsApp and we'll tell you exactly what your model supports.",
  },
  {
    question: "How long does a Supercharge session take?",
    answer:
      "Approximately 15 minutes for 100+ km of riding range on compatible models. Exact times vary with your battery level on arrival and your model's configuration.",
  },
  {
    question: "How much does Supercharge cost?",
    answer:
      "Pricing is confirmed with your booking quote. Overnight charging at your accommodation always remains free — Supercharge is a convenience for big riding days, not a requirement.",
  },
  {
    question: "How do I find the nearest charging point?",
    answer:
      "Published locations are listed on this page with maps links. You can also message our team on WhatsApp mid-ride — we'll route you to the nearest available point in real time.",
  },
  {
    question: "What if something goes wrong while charging?",
    answer:
      "Our support line is live during all riding hours. If a charging point is busy or your session has any issue, message us — we'll fix it or route you to an alternative straight away.",
  },
];
