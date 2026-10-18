/** Payment items use the saved quote, including exact monthly packages. */
export function bookingPaymentItems(booking: {
  vehicle_model: string; rental_days: number; quantity: number;
  rate_per_day_idr: number; base_idr: number | null;
  area_fee_idr: number; discount_idr: number; discount_code: string | null;
}, model: string) {
  const rentalTotal = booking.base_idr ?? booking.rate_per_day_idr * booking.rental_days * booking.quantity;
  const items = [{
    id: `rental-${booking.vehicle_model}`,
    price: rentalTotal / booking.quantity,
    quantity: booking.quantity,
    name: `${model}, ${booking.rental_days} days`,
  }];
  if (booking.area_fee_idr > 0) items.push({ id: "area-fee", price: booking.area_fee_idr, quantity: 1, name: "Delivery & collection" });
  if (booking.discount_idr > 0) items.push({ id: "discount", price: -booking.discount_idr, quantity: 1, name: `Discount ${booking.discount_code ?? ""}`.trim() });
  return items;
}
