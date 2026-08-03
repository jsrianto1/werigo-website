/**
 * Central commercial configuration for booking add-ons: airport fees
 * and optional protection. Approved amounts only; do not change
 * without management approval.
 *
 * All add-on amounts are defined in USD. Arithmetic stays in USD;
 * the approximate IDR equivalent is derived only for display using
 * the existing cached exchange-rate service. Pure module (no
 * imports) so the automated tests run it directly under Node.
 */

/** USD 1.00 once per booking when pickup/delivery is an airport terminal. */
export const AIRPORT_DELIVERY_FEE_USD = 1.0;
/** USD 1.00 once per booking when return/collection is an airport terminal. */
export const AIRPORT_COLLECTION_FEE_USD = 1.0;
/** USD 0.50 per rental day, per booking. */
export const CANCELLATION_PROTECTION_USD_PER_DAY = 0.5;
/** USD 4.95 per motorcycle, per rental day. */
export const MOTORCYCLE_PROTECTION_USD_PER_DAY_PER_BIKE = 4.95;

export interface AddOnSelection {
  pickupIsAirport: boolean;
  returnIsAirport: boolean;
  days: number;
  quantity: number;
  cancellationProtection: boolean;
  motorcycleProtection: boolean;
}

export interface AddOnBreakdown {
  /** USD 1.00 or 0 — once per booking, never per bike or per day. */
  airportDeliveryUsd: number;
  /** USD 1.00 or 0 — once per booking, never per bike or per day. */
  airportCollectionUsd: number;
  cancellationProtectionUsd: number;
  motorcycleProtectionUsd: number;
  totalUsd: number;
}

/** Round to cents so floating point never leaks into display. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeAddOns(sel: AddOnSelection): AddOnBreakdown {
  const airportDeliveryUsd = sel.pickupIsAirport ? AIRPORT_DELIVERY_FEE_USD : 0;
  const airportCollectionUsd = sel.returnIsAirport ? AIRPORT_COLLECTION_FEE_USD : 0;
  const cancellationProtectionUsd = sel.cancellationProtection
    ? cents(CANCELLATION_PROTECTION_USD_PER_DAY * sel.days)
    : 0;
  const motorcycleProtectionUsd = sel.motorcycleProtection
    ? cents(MOTORCYCLE_PROTECTION_USD_PER_DAY_PER_BIKE * sel.days * sel.quantity)
    : 0;
  return {
    airportDeliveryUsd,
    airportCollectionUsd,
    cancellationProtectionUsd,
    motorcycleProtectionUsd,
    totalUsd: cents(
      airportDeliveryUsd +
        airportCollectionUsd +
        cancellationProtectionUsd +
        motorcycleProtectionUsd
    ),
  };
}

/** "US$4.95" — always two decimals for add-on amounts. */
export function formatUsdFee(usd: number): string {
  return `US$${usd.toFixed(2)}`;
}

/** Approximate IDR for a USD add-on amount; null when no rate. */
export function usdToIdr(
  usd: number,
  idrPerUsd: number | null | undefined
): number | null {
  if (!idrPerUsd || idrPerUsd <= 0) return null;
  return Math.round(usd * idrPerUsd);
}

/** Approved customer copy for the protection options. */
export const protectionCopy = {
  cancellation:
    "Add protection to your request for eligible cancellations. Conditions and refund eligibility will be confirmed before you approve your quote.",
  motorcycle:
    "Optional protection for the rented motorcycle. Coverage, exclusions and any applicable excess will be confirmed before you approve your quote.",
};
