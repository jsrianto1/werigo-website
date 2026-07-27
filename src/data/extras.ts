/**
 * Rental extras — options offered during booking step 4.
 * Extras carry no published prices: anything selected is added to the
 * WhatsApp quote and priced there, so no unapproved figures appear
 * on the site.
 */

export interface RentalExtra {
  id: string;
  name: string;
  description: string;
  /** How many can be added (e.g. extra helmets) */
  maxQuantity: number;
  /** Placeholder items are shown without selection until terms are published */
  placeholder?: boolean;
}

export const rentalExtras: RentalExtra[] = [
  {
    id: "extra-helmet",
    name: "Extra helmet",
    description:
      "Two helmets are already included. Add more for changing passengers. Priced in your quote.",
    maxQuantity: 2,
  },
  {
    id: "phone-holder",
    name: "Extra phone holder",
    description:
      "One holder is included on every ride. Add a second for a passenger. Priced in your quote.",
    maxQuantity: 1,
  },
  {
    id: "protection",
    name: "Damage protection",
    description:
      "Optional damage protection plan. Ask our team on WhatsApp for current terms and pricing. The full plan details are being added to this page.",
    maxQuantity: 1,
    placeholder: true,
  },
];

export function getExtra(id: string): RentalExtra | undefined {
  return rentalExtras.find((e) => e.id === id);
}
