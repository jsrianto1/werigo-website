import { estimateRental, type PricingTierId, type RentalPeriod } from "@/lib/pricing";
import { getArea } from "@/data/locations";

/**
 * The amount a booking is charged, computed from approved data only.
 *
 * Used by BOTH the checkout UI (to display) and POST /api/bookings (to
 * charge), so the customer always pays exactly what they saw. The
 * browser never sends a price; the server recomputes everything from
 * model, dates, quantity and pickup/return points.
 *
 * Rules (management-approved, see pricing.ts and locations.ts):
 *   base      = per-day rate of the applicable tier × rental days × quantity
 *   area fee  = one Rp 75,000 per booking when either point is a service
 *               area, waived on monthly rentals (distance waivers are
 *               applied by the team, never assumed here)
 *   add-ons   = free of charge; protection options are requests only
 *               and are never charged online
 *   total     = base + area fee − discount (discounts arrive in Phase 2)
 */

export interface QuoteInput {
  modelSlug: string;
  period: RentalPeriod;
  quantity: number;
  pickupSlug: string;
  returnSlug: string;
}

export interface Quote {
  days: number;
  tierId: PricingTierId;
  tierLabel: string;
  tierRange: string;
  ratePerDayIdr: number;
  /** Rental only, all units. */
  baseIdr: number;
  areaFeeIdr: number;
  areaFeeWaivedMonthly: boolean;
  discountIdr: number;
  totalIdr: number;
}

export function computeQuote(input: QuoteInput): Quote | null {
  const quantity = Math.floor(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) return null;
  const estimate = estimateRental(input.modelSlug, input.period);
  if (!estimate) return null;

  const pickupArea = getArea(input.pickupSlug);
  const returnArea = getArea(input.returnSlug);
  const touchesServiceArea = Boolean(pickupArea || returnArea);
  const monthly = estimate.tier.id === "monthly";
  const areaFeeWaivedMonthly = monthly && touchesServiceArea;
  const areaFeeIdr = monthly
    ? 0
    : Math.max(pickupArea?.deliveryFee ?? 0, returnArea?.deliveryFee ?? 0);

  const baseIdr = estimate.totalIdr * quantity;
  const discountIdr = 0;
  return {
    days: estimate.days,
    tierId: estimate.tier.id,
    tierLabel: estimate.tier.label,
    tierRange: estimate.tier.range,
    ratePerDayIdr: estimate.ratePerDayIdr,
    baseIdr,
    areaFeeIdr,
    areaFeeWaivedMonthly,
    discountIdr,
    totalIdr: baseIdr + areaFeeIdr - discountIdr,
  };
}

/**
 * Rebuild the checkout's RentalPeriod (Bali wall-clock date and time)
 * from the ISO timestamps a submission carries, so the server prices
 * the same calendar days the customer selected.
 */
export function periodFromIso(startAt: string, endAt: string): RentalPeriod {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = (iso: string) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    const hour = p.hour === "24" ? "00" : p.hour;
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
  };
  const s = parts(startAt);
  const e = parts(endAt);
  return { startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time };
}
