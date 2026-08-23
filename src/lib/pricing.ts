/**
 * Rental period and pricing logic.
 *
 * The IDR rates in this file are the management-approved rates
 * (source of truth, per motorcycle per day). Every surface that
 * shows a rate (cards, comparison, product details, search results,
 * checkout, summary, WhatsApp message) reads from here. Totals are
 * always estimates subject to availability and confirmation by the
 * Werigo team on WhatsApp.
 *
 * This module is intentionally free of path aliases and UI imports
 * so the automated pricing tests can run it directly under Node.
 */

/** Minimum rental length: management-approved minimum of 2 days. */
export const MIN_RENTAL_DAYS = 2;

export interface RentalPeriod {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
}

/** Whole rental days, rounded up. A 25-hour rental is 2 days. */
export function rentalDays(period: RentalPeriod): number {
  const ms = periodMs(period);
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function periodMs(period: RentalPeriod): number {
  const start = new Date(`${period.startDate}T${period.startTime}:00`);
  const end = new Date(`${period.endDate}T${period.endTime}:00`);
  return end.getTime() - start.getTime();
}

export function isValidPeriod(period: RentalPeriod): boolean {
  return rentalDays(period) >= MIN_RENTAL_DAYS;
}

/** Customer-facing message when a period is below the minimum. */
export const MIN_RENTAL_MESSAGE = "Minimum rental is 2 days.";

/* ================= Approved pricing tiers ================= */

export type PricingTierId =
  | "daily"
  | "weekly"
  | "twoWeeks"
  | "threeWeeks"
  | "monthly";

export interface PricingTier {
  id: PricingTierId;
  /** Customer-facing label. */
  label: string;
  /** Customer-facing duration description. */
  range: string;
}

export const pricingTiers: PricingTier[] = [
  { id: "daily", label: "Daily", range: "2 to 6 days" },
  { id: "weekly", label: "Weekly", range: "7 to 13 days" },
  { id: "twoWeeks", label: "2 Weeks", range: "14 to 20 days" },
  { id: "threeWeeks", label: "3 Weeks", range: "21 days to 1 month" },
  { id: "monthly", label: "Monthly", range: "1 month or longer" },
];

/**
 * Approved IDR per-day rates by customer-facing model slug.
 * Do not edit without management approval.
 *
 * 2026-08-19 rate card (from the published price flyer, totals
 * divided by duration: 2, 7, 14, 21 and 30 days):
 *   Bees    180k / 560k / 980k / 1,260k / 1,500k
 *   Victory 240k / 700k / 1,190k / 1,470k / 1,800k
 *   Athena  280k / 840k / 1,400k / 1,680k / 2,100k
 *   EdPower 380k / 1,050k / 1,750k / 2,100k / 2,800k
 */
export const ratesIdrPerDay: Record<string, Record<PricingTierId, number>> = {
  bees: { daily: 90000, weekly: 80000, twoWeeks: 70000, threeWeeks: 60000, monthly: 50000 },
  victory: { daily: 120000, weekly: 100000, twoWeeks: 85000, threeWeeks: 70000, monthly: 60000 },
  athena: { daily: 140000, weekly: 120000, twoWeeks: 100000, threeWeeks: 80000, monthly: 70000 },
  edpower: { daily: 190000, weekly: 150000, twoWeeks: 125000, threeWeeks: 100000, monthly: 93333 },
};

export const pricingApproved = true;
export const pricingUpdatedAt = "2026-08-19";

/**
 * Retail one-month totals exactly as printed on the 2026-08-19 flyer.
 * The booking flow prices monthly rentals per actual day (rate above
 * times calendar days), so these totals are for display comparisons
 * only, such as the fleet partner table on /partners.
 */
export const retailMonthlyIdr: Record<string, number> = {
  bees: 1500000,
  victory: 1800000,
  athena: 2100000,
  edpower: 2800000,
};

/* ================= Fleet partner (B2B) monthly rates ================= */

/**
 * Approved 2026-08-19: the previous retail monthly rates become the
 * fleet partner rate for rental companies that rent from Werigo on a
 * monthly basis. Conditions: minimum one month, minimum three units
 * taken together. Quoted per motorcycle per month in IDR; shown on
 * /partners only, never in the retail booking flow.
 */
export const FLEET_PARTNER_MIN_UNITS = 3;

export const fleetPartnerMonthlyIdr: Record<string, number> = {
  bees: 1200000,
  victory: 1400000,
  athena: 1650000,
  edpower: 2200000,
};

/**
 * Minimum rider age by model. Only EdPower has an approved
 * restriction; do not invent restrictions for other models.
 */
export const minRiderAge: Record<string, number> = {
  edpower: 25,
};

/**
 * True when the rental spans at least one calendar month:
 * start date plus one calendar month falls on or before the end
 * date-time. Uses real calendar math, never a 30-day assumption.
 */
export function isAtLeastOneCalendarMonth(period: RentalPeriod): boolean {
  const start = new Date(`${period.startDate}T${period.startTime}:00`);
  const end = new Date(`${period.endDate}T${period.endTime}:00`);
  const oneMonthOn = addCalendarMonth(start);
  return end.getTime() >= oneMonthOn.getTime();
}

/** Add one calendar month, clamping to the last day of shorter months. */
function addCalendarMonth(d: Date): Date {
  const r = new Date(d.getTime());
  const day = r.getDate();
  r.setMonth(r.getMonth() + 1);
  // JS overflows (e.g. Jan 31 + 1 month = Mar 3) — clamp back.
  if (r.getDate() !== day) r.setDate(0);
  return r;
}

/** Resolve the applicable tier for a period. Null below the minimum. */
export function resolveTier(period: RentalPeriod): PricingTier | null {
  const days = rentalDays(period);
  if (days < MIN_RENTAL_DAYS) return null;
  if (isAtLeastOneCalendarMonth(period)) {
    return pricingTiers.find((t) => t.id === "monthly")!;
  }
  const id: PricingTierId =
    days >= 21 ? "threeWeeks" : days >= 14 ? "twoWeeks" : days >= 7 ? "weekly" : "daily";
  return pricingTiers.find((t) => t.id === id)!;
}

export function rateFor(modelSlug: string, tierId: PricingTierId): number | null {
  return ratesIdrPerDay[modelSlug]?.[tierId] ?? null;
}

export interface RentalQuoteEstimate {
  days: number;
  tier: PricingTier;
  ratePerDayIdr: number;
  totalIdr: number;
}

/**
 * Estimated rental: applicable per-day rate multiplied by the actual
 * rental duration in days. Null when the period is invalid, below
 * the two-day minimum, or the model has no approved rate.
 */
export function estimateRental(
  modelSlug: string,
  period: RentalPeriod
): RentalQuoteEstimate | null {
  const tier = resolveTier(period);
  if (!tier) return null;
  const rate = rateFor(modelSlug, tier.id);
  if (rate === null) return null;
  const days = rentalDays(period);
  return { days, tier, ratePerDayIdr: rate, totalIdr: rate * days };
}

/** "Rp 70,000" style formatting (tabular-friendly, no decimals). */
export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("en-US")}`;
}
