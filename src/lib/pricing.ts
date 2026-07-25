import type { Vehicle } from "@/data/vehicles";
import type { RentalExtra } from "@/data/extras";
import { serviceAreas } from "@/data/locations";

/** Minimum rental length in hours */
export const MIN_RENTAL_HOURS = 24;

export interface RentalPeriod {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
}

export interface SelectedExtra {
  extra: RentalExtra;
  quantity: number;
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
  return periodMs(period) >= MIN_RENTAL_HOURS * 60 * 60 * 1000;
}

/**
 * Best-rate vehicle pricing:
 * months at monthly rate, remaining weeks at weekly, remaining days daily —
 * capped so a longer tier is used whenever it's cheaper.
 */
export function vehicleRentalPrice(vehicle: Vehicle, days: number): number {
  if (days <= 0) return 0;

  const months = Math.floor(days / 30);
  const afterMonths = days % 30;
  const weeks = Math.floor(afterMonths / 7);
  const remDays = afterMonths % 7;

  let total = months * vehicle.pricePerMonth;

  // Remaining block: compare paying by parts vs. jumping to the next tier
  const weekPart = weeks * vehicle.pricePerWeek;
  const dayPart = remDays * vehicle.pricePerDay;
  const partSum = weekPart + Math.min(dayPart, vehicle.pricePerWeek);
  // Never pay more for the remainder than one extra month
  total += Math.min(partSum, vehicle.pricePerMonth);

  return total;
}

export function extrasPrice(extras: SelectedExtra[], days: number): number {
  return extras.reduce((sum, { extra, quantity }) => {
    if (extra.placeholder) return sum;
    const unit = extra.perDay ? extra.price * days : extra.price;
    return sum + unit * quantity;
  }, 0);
}

export function deliveryFeeFor(locationSlug: string): number {
  return serviceAreas.find((a) => a.slug === locationSlug)?.deliveryFee ?? 0;
}

/** One-way fee when returning to a different area. Flat placeholder rate. */
export const ONE_WAY_FEE = 150000;

export interface PriceBreakdown {
  days: number;
  rentalSubtotal: number;
  extrasTotal: number;
  deliveryFee: number;
  oneWayFee: number;
  /** Promo placeholder — always 0 until promo engine exists */
  discount: number;
  total: number;
}

export function priceBreakdown(args: {
  vehicle: Vehicle;
  period: RentalPeriod;
  quantity: number;
  extras: SelectedExtra[];
  pickupSlug: string;
  returnSlug?: string;
}): PriceBreakdown {
  const days = rentalDays(args.period);
  const rentalSubtotal = vehicleRentalPrice(args.vehicle, days) * args.quantity;
  const extrasTotal = extrasPrice(args.extras, days);
  const deliveryFee = deliveryFeeFor(args.pickupSlug);
  const oneWayFee =
    args.returnSlug && args.returnSlug !== args.pickupSlug ? ONE_WAY_FEE : 0;
  const discount = 0;
  return {
    days,
    rentalSubtotal,
    extrasTotal,
    deliveryFee,
    oneWayFee,
    discount,
    total: rentalSubtotal + extrasTotal + deliveryFee + oneWayFee - discount,
  };
}
