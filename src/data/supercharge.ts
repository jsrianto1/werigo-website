/**
 * Wedison Supercharge — fast-charging network data.
 * (Werigo is the rental service; Supercharge is Wedison's charging
 * technology, offered to Werigo riders on compatible models.)
 *
 * IMPORTANT: `stations` must contain ONLY verified, operational
 * charging points. Never publish planned or speculative locations.
 * Add a station by copying the template below with real details.
 *
 * `compatibleModelSlugs` is centrally editable — only add entries
 * confirmed by management.
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
 * Entries confirmed compatible with Wedison Supercharge
 * (management-approved 2026-07-26). Ids must match
 * src/data/vehicles.ts. Bees is NOT compatible until management
 * confirms it — do not add it here without confirmation.
 */
export const compatibleModelSlugs: string[] = [
  "victory",
  "victory-extended",
  "athena",
  "athena-extended",
  "edpower",
];

/** Headline performance message — applies to compatible Wedison models only. */
export const superchargePerformance = {
  headline: "Charge Fast. Ride Farther.",
  message: "Charge 15 Minutes. Ride 100+ KM.",
  chargeMinutes: "starting from 15 minutes",
  rangeBenefit: "approximately 10% to 80% charge",
  /** Mandated compatibility statement — use verbatim. */
  statement:
    "Compatible Wedison models can recharge from approximately 10% to 80% starting from 15 minutes at supported Wedison Supercharge locations.",
  caveat:
    "Charging performance applies to compatible Wedison electric motorcycle models. Actual charge time and range vary with battery level, model, load and riding conditions.",
};

export const superchargeSteps = [
  {
    title: "Ride in",
    text: "Bring your Wedison to any supported Supercharge location — no appointment needed. Your key tag identifies your motorcycle and rental.",
  },
  {
    title: "Plug in",
    text: "Our on-site team connects your motorcycle to the Wedison Supercharge system. You don't touch a cable unless you want to.",
  },
  {
    title: "Ride out",
    text: "Compatible models recharge from approximately 10% to 80% starting from 15 minutes. The session is logged to your rental — no payment at the point.",
  },
];

export const superchargeFaq = [
  {
    question: "What is Wedison Supercharge?",
    answer:
      "Supercharge is Wedison's fast-charging technology, available to Werigo riders on compatible Wedison models — dedicated locations where your motorcycle recharges from approximately 10% to 80% starting from 15 minutes, with our team handling the process.",
  },
  {
    question: "Which motorcycles can use Supercharge?",
    answer:
      "Confirmed compatible models are the Wedison Victory, Victory Extended, Athena, Athena Extended and EdPower. The Wedison Bees uses standard home charging. We confirm your exact configuration when you book.",
  },
  {
    question: "How long does a Supercharge session take?",
    answer:
      "Compatible Wedison models can recharge from approximately 10% to 80% starting from 15 minutes at supported Wedison Supercharge locations. Exact times vary with your battery level on arrival and your model's configuration.",
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
