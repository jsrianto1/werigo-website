/**
 * Optional add-ons: the management-approved, request-only list.
 * Add-ons are free of charge (management decision, 2026-10-02);
 * customers request them and availability is confirmed on WhatsApp.
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
    id: "helmet",
    name: "Helmets",
    description:
      "Choose 0 to 2 helmets for this booking. No helmets are added automatically. No additional charge.",
    maxQuantity: 2,
  },
];

export function getExtra(id: string): RentalExtra | undefined {
  return rentalExtras.find((e) => e.id === id);
}

/** Old drafts cannot restore withdrawn extras or quantities above the current limit. */
export function sanitizeExtraQuantities(requests: { id: string; quantity: number }[]): Record<string, number> {
  return Object.fromEntries(requests.filter(request => getExtra(request.id) && Number.isFinite(request.quantity) && request.quantity > 0).map(request => [request.id, Math.min(Math.floor(request.quantity), getExtra(request.id)!.maxQuantity)]));
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
