/** One fee per booking, covering delivery AND collection. Distance is one-way road metres. */
export function deliveryFeeIdr(distanceMeters: number, monthly = false): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || distanceMeters > 250000) throw new Error("Invalid delivery distance");
  if (monthly || distanceMeters <= 5000) return 0;
  if (distanceMeters < 10000) return 75000;
  return 100000 + Math.round(Math.max(0, distanceMeters - 15000) * 4);
}

export const deliveryTariff = "Delivery & collection: free up to 5 km; Rp75,000 above 5 km and below 10 km; Rp100,000 from 10–15 km; above 15 km add Rp4,000 per km (proportional to the extra distance). Distances follow the road route from the Wedison showroom on Jl. Gatot Subroto Tengah, Denpasar. Monthly rentals have no delivery fee. If a route cannot be calculated or the return location differs, our team confirms a quote before payment.";
