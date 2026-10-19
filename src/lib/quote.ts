import { deliveryFeeIdr } from "@/lib/deliveryPricing";
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
 *   base      = the shared daily rental estimate × quantity
 *   area fee  = one delivery-and-collection fee from a verified road distance;
 *               monthly and <=5 km routes are waived. Area defaults are estimates
 *               only; the booking API blocks payment without required route proof.
 *   add-ons   = free of charge; protection options are requests only
 *               and are never charged online
 *   discount  = at most one per booking, chosen by the discount engine
 *               (src/lib/discounts.ts); never more than the rental amount
 *   total     = base + area fee − discount
 */

export interface QuoteInput {
  modelSlug: string;
  period: RentalPeriod;
  quantity: number;
  pickupSlug: string;
  returnSlug: string;
  /** Rupiah off the rental amount (not the area fee), from the discount engine. */
  discountIdr?: number;
  discountCode?: string | null;
  /** Trusted server-verified road distance, not a client-supplied price. */
  deliveryDistanceMeters?: number;
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
  discountCode: string | null;
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
    : input.deliveryDistanceMeters !== undefined ? deliveryFeeIdr(input.deliveryDistanceMeters) : Math.max(pickupArea?.deliveryFee ?? 0, returnArea?.deliveryFee ?? 0);

  const baseIdr = estimate.totalIdr * quantity;
  const discountIdr = Math.max(0, Math.min(Math.round(input.discountIdr ?? 0), baseIdr));
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
    discountCode: discountIdr > 0 ? (input.discountCode ?? null) : null,
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
