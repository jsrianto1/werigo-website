/**
 * Rental extras — options offered during booking step 4.
 * Prices in IDR. `perDay` items multiply by rental days.
 */

export interface RentalExtra {
  id: string;
  name: string;
  description: string;
  price: number;
  perDay: boolean;
  /** How many can be added (e.g. extra helmets) */
  maxQuantity: number;
  /** Placeholder items are shown without a price until terms are published */
  placeholder?: boolean;
}

export const rentalExtras: RentalExtra[] = [
  {
    id: "extra-helmet",
    name: "Extra helmet",
    description: "Two helmets are already included — add more for changing passengers.",
    price: 15000,
    perDay: true,
    maxQuantity: 2,
  },
  {
    id: "phone-holder",
    name: "Extra phone holder",
    description: "One holder is included on every ride. Add a second for a passenger.",
    price: 10000,
    perDay: true,
    maxQuantity: 1,
  },
  {
    id: "protection",
    name: "Damage protection",
    description:
      "Optional damage protection plan. Ask our team on WhatsApp for current terms and pricing — the full plan details are being added to this page.",
    price: 0,
    perDay: true,
    maxQuantity: 1,
    placeholder: true,
  },
];

export function getExtra(id: string): RentalExtra | undefined {
  return rentalExtras.find((e) => e.id === id);
}
