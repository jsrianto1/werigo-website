/**
 * Delivery coverage entries that are arrangements rather than service
 * areas: the airport handover and hotel/villa delivery. The eight
 * Bali service areas live in src/data/locations.ts and keep their own
 * pages; these entries only appear in the homepage coverage section.
 *
 * Delivery labels are deliberately "by arrangement": no free-delivery
 * or around-the-clock promise may be added here until the delivery
 * policy is approved by management.
 */

export interface CoveragePoint {
  id: string;
  name: string;
  description: string;
  /** Honest delivery status label, approved wording only. */
  status: string;
  image: {
    src: string;
    alt: string;
    /** CSS object-position for intentional focal points. */
    focal: string;
    /** Attribution required by the image licence, shown on the card. */
    credit?: string;
  };
}

export const coveragePoints: CoveragePoint[] = [
  {
    id: "airport",
    name: "Ngurah Rai Airport",
    description:
      "Land, message us your arrival details, and pick up the ride near the terminal.",
    status: "Airport handover available by arrangement",
    image: {
      src: "/media/coverage/ngurah-rai-airport.webp",
      alt: "The Balinese stone gateway at the international terminal of I Gusti Ngurah Rai International Airport in Bali",
      focal: "50% 40%",
      credit: "Photo: Pinterpandai, Wikimedia Commons, CC BY-SA 3.0",
    },
  },
  {
    id: "hotel",
    name: "Hotel delivery",
    description:
      "Staying at a hotel or resort? We hand the motorcycle over at the entrance.",
    status: "Delivery available by arrangement",
    image: {
      src: "/media/coverage/bali-hotel.webp",
      alt: "Poolside coconut palms facing the ocean at a Seminyak Beach resort in Bali",
      focal: "50% 55%",
    },
  },
  {
    id: "villa",
    name: "Villa delivery",
    description:
      "Give us the villa name or a maps pin and the ride comes to your gate.",
    status: "Delivery available by arrangement",
    image: {
      src: "/media/coverage/bali-villa.webp",
      alt: "A private Balinese villa with its own pool surrounded by greenery in Ubud, Bali",
      focal: "50% 60%",
    },
  },
];
