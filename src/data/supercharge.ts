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

/**
 * Approved performance wording (management, 2026-07-26) — use these
 * strings verbatim. Charging speed and total range are two SEPARATE
 * facts: never combine them into one claim.
 */
export const superchargePerformance = {
  headline: "Charge Fast. Ride Farther.",
  /** Primary charging statement */
  statement:
    "Compatible Wedison models have been tested to charge from 30% to 90% in approximately 10 minutes at supported Wedison SuperCharge locations.",
  /** Separate range statement */
  rangeStatement:
    "Selected Wedison models offer more than 100 km of total claimed riding range.",
  /** Compact highlights (always shown with the disclosure) */
  highlightCharge: "30% to 90% in approx. 10 min*",
  highlightRange: "100+ km total range on selected models*",
  /** Readable disclosure — must accompany the highlights */
  disclosure:
    "*Based on internal Wedison testing under specific conditions. Actual charging time and riding range may vary depending on model, battery condition, battery temperature, starting charge level, load, riding style, charger availability, and operating conditions. SuperCharge is available only for compatible Wedison models at supported locations.",
};

export const superchargeSteps = [
  {
    title: "Ride in",
    text: "Bring your Wedison to any supported SuperCharge location. No appointment is needed. Your key tag identifies your motorcycle and rental.",
  },
  {
    title: "Plug in",
    text: "Our on-site team connects your motorcycle to the Wedison Supercharge system. You don't touch a cable unless you want to.",
  },
  {
    title: "Ride out",
    text: "Compatible Wedison models have been tested to charge from 30% to 90% in approximately 10 minutes. The session is logged to your rental, so there is no payment at the point.",
  },
];

export const superchargeFaq = [
  {
    question: "What is Wedison SuperCharge?",
    answer:
      "SuperCharge is Wedison's fast-charging technology, available to Werigo riders on compatible Wedison models at dedicated locations, with our team handling the process. Compatible Wedison models have been tested to charge from 30% to 90% in approximately 10 minutes at supported Wedison SuperCharge locations.",
  },
  {
    question: "Which motorcycles can use SuperCharge?",
    answer:
      "Confirmed compatible models are the Wedison Victory, Athena and EdPower. The Wedison Bees uses standard home charging. We confirm your exact configuration when you book.",
  },
  {
    question: "How long does a SuperCharge session take?",
    answer:
      "Compatible Wedison models have been tested to charge from 30% to 90% in approximately 10 minutes at supported Wedison SuperCharge locations. Actual charging time varies with your model, battery condition and starting charge level.",
  },
  {
    question: "How much does Supercharge cost?",
    answer:
      "Pricing is confirmed with your booking quote. Overnight charging at your accommodation always remains free. SuperCharge is a convenience for big riding days, not a requirement.",
  },
  {
    question: "How do I find the nearest charging point?",
    answer:
      "Published locations are listed on this page with maps links. You can also message our team on WhatsApp during your ride and we'll direct you to the nearest available point.",
  },
  {
    question: "What if something goes wrong while charging?",
    answer:
      "Our support line is live during all riding hours. If a charging point is busy or your session has any issue, message us. We'll fix it or direct you to an alternative straight away.",
  },
];
