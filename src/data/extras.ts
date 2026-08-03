/**
 * Optional add-ons: the management-approved, request-only list.
 * Neither add-on has an approved public price; customers can request
 * them and the price and availability are confirmed on WhatsApp.
 * Do not add items or prices here without management approval.
 */

export interface RentalExtra {
  id: string;
  name: string;
  description: string;
  /** How many can be requested. */
  maxQuantity: number;
}

export const rentalExtras: RentalExtra[] = [
  {
    id: "rain-poncho",
    name: "Rain poncho",
    description:
      "Optional rain poncho for wet-season rides. Not included automatically. Availability and price are confirmed on WhatsApp.",
    maxQuantity: 2,
  },
];

export function getExtra(id: string): RentalExtra | undefined {
  return rentalExtras.find((e) => e.id === id);
}

/**
 * In-house bike damage protection status. Pending management
 * approval: it may be requested but must never be charged, priced,
 * or described as active coverage. It is not third-party insurance
 * and never covers personal injury, medical costs, belongings,
 * third-party liability, or theft.
 */
export const bikeDamageProtection = {
  enabled: false,
  requestOnly: true,
  priceIdr: null as number | null,
  liabilityCapUsd: null as number | null,
  coverageStatus: "pending-management-approval" as const,
};
