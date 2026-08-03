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
 */
export const ratesIdrPerDay: Record<string, Record<PricingTierId, number>> = {
  bees: { daily: 70000, weekly: 60000, twoWeeks: 55000, threeWeeks: 50000, monthly: 40000 },
  victory: { daily: 90000, weekly: 80000, twoWeeks: 65000, threeWeeks: 60000, monthly: 46667 },
  athena: { daily: 120000, weekly: 100000, twoWeeks: 85000, threeWeeks: 70000, monthly: 55000 },
  edpower: { daily: 150000, weekly: 130000, twoWeeks: 115000, threeWeeks: 95000, monthly: 73333 },
};

export const pricingApproved = true;
export const pricingUpdatedAt = "2026-07-30";

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
