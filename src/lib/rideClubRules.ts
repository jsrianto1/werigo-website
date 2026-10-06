export const POINT_VALUE_IDR = 200;
export const MIN_REDEEM_POINTS = 100;
export const RIDE_TIERS = [
  { name: "Silver", spend: 0, multiplier: 1 },
  { name: "Gold", spend: 3_000_000, multiplier: 1.25 },
  { name: "Platinum", spend: 8_000_000, multiplier: 1.5 },
] as const;
export function redemptionPoints(balance: number, rentalIdr: number) {
  const points = Math.min(Math.max(0, Math.floor(balance)), Math.floor(rentalIdr / 2000));
  return points >= MIN_REDEEM_POINTS ? points : 0;
}
