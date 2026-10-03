/**
 * Marketing promotions in effect. Phase 2 moves these into the admin
 * dashboard; until then the campaign is configured here and applied
 * by the server when a booking is priced.
 *
 * Welcome offer (management, 2026-10-03): 20% off the rental amount of
 * a customer's first paid booking, for newly registered accounts,
 * until 31 October 2026 (Bali time). The discount applies to the
 * rental only, never to the delivery & collection fee.
 */
export const welcomeOffer = {
  id: "WELCOME20",
  percent: 20,
  /** Last moment a booking can be created with the offer. */
  endsAt: "2026-10-31T23:59:59+08:00",
  endsLabel: "31 October 2026",
} as const;

export function welcomeOfferActive(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(welcomeOffer.endsAt).getTime();
}

/** Pure helper: the rupiah discount for a rental amount. */
export function welcomeDiscountIdr(baseIdr: number): number {
  return Math.round((baseIdr * welcomeOffer.percent) / 100);
}
