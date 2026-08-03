/**
 * Werigo service areas — data-driven location system.
 * Add a new area by appending to this array; navigation,
 * search selectors, delivery pages and the sitemap pick it up
 * automatically.
 */

export interface ServiceArea {
  name: string;
  slug: string;
  /** One-line character of the area, used on cards */
  vibe: string;
  /** Longer intro for the area detail page */
  description: string;
  /** Delivery fee in IDR — 0 renders as free delivery */
  deliveryFee: number;
  /** Typical delivery window shown to customers */
  deliveryWindow: string;
  /** Landmarks used for local SEO copy */
  landmarks: string[];
  /** Riding notes specific to the area */
  ridingNotes: string;
}

export const serviceAreas: ServiceArea[] = [
  {
    name: "Canggu",
    slug: "canggu",
    vibe: "Surf mornings, laptop afternoons and an easy way through the sunset traffic.",
    description:
      "Canggu is Werigo's home turf. Between Batu Bolong, Berawa and Pererenan, an electric scooter is the difference between watching the shortcut jam and gliding through it. Charge at your villa overnight and the whole coast is yours.",
    deliveryFee: 0,
    deliveryWindow: "Within 60 minutes, 08:00 to 20:00",
    landmarks: ["Batu Bolong Beach", "Berawa", "Pererenan", "La Brisa", "Tanah Lot (day trip)"],
    ridingNotes:
      "Short distances, heavy scooter traffic at peak hours. The quiet torque of an electric ride makes the shortcut lanes far more pleasant.",
  },
  {
    name: "Seminyak",
    slug: "seminyak",
    vibe: "Boutiques, beach clubs and dinner reservations on time.",
    description:
      "Seminyak rewards short, frequent rides between brunch spots, beach clubs and boutiques. Werigo delivers to your hotel lobby, and the compact fleet fits the narrow gang lanes that cars simply cannot.",
    deliveryFee: 0,
    deliveryWindow: "Within 60 minutes, 08:00 to 20:00",
    landmarks: ["Seminyak Beach", "Petitenget", "Eat Street", "Potato Head", "Double Six"],
    ridingNotes:
      "Dense one-way streets and valet-only parking at clubs. A scooter parks anywhere; an electric one does it without waking the whole street.",
  },
  {
    name: "Kuta",
    slug: "kuta",
    vibe: "Airport-close and beach-ready within minutes.",
    description:
      "Landing at the airport? Kuta is the fastest place to start riding. We deliver to hotels across Kuta and Legian, so you can skip taxi queues for the rest of your trip.",
    deliveryFee: 50000,
    deliveryWindow: "Within 90 minutes, 08:00 to 20:00",
    landmarks: ["Kuta Beach", "Legian", "Beachwalk Mall", "Waterbom Bali"],
    ridingNotes:
      "Busy arterials and confident local traffic. Stick to the beach roads early morning for the calmest riding.",
  },
  {
    name: "Ubud",
    slug: "ubud",
    vibe: "Jungle roads, rice terraces and temple mornings.",
    description:
      "Ubud is made for slow exploring and silent riding. Visit Tegallalang at sunrise, walk Campuhan Ridge before the heat and stop for a warung lunch in Penestanan. An electric motorcycle keeps the jungle soundtrack intact.",
    deliveryFee: 100000,
    deliveryWindow: "Within 2 hours, 08:00 to 18:00",
    landmarks: ["Tegallalang Rice Terrace", "Campuhan Ridge Walk", "Monkey Forest", "Goa Gajah"],
    ridingNotes:
      "Expect winding roads and short climbs, so we recommend the larger fleet models. The ranges shown comfortably cover a full Ubud day loop.",
  },
  {
    name: "Uluwatu",
    slug: "uluwatu",
    vibe: "Clifftop surf breaks and golden-hour temple runs.",
    description:
      "The Bukit's clifftop warungs, surf breaks and viewpoints spread out quickly, and that is exactly what a full battery is for. Ride Padang Padang to Melasti and still make the Kecak dance at sunset.",
    deliveryFee: 100000,
    deliveryWindow: "Within 2 hours, 08:00 to 18:00",
    landmarks: ["Uluwatu Temple", "Padang Padang", "Bingin", "Melasti Beach", "Suluban Cave"],
    ridingNotes:
      "Steep beach access roads. Athena or EdPower recommended for two riders with surfboards' worth of daypacks.",
  },
  {
    name: "Jimbaran",
    slug: "jimbaran",
    vibe: "Seafood sunsets and calm bay-side streets.",
    description:
      "Jimbaran's wide, calm streets are some of Bali's easiest riding, which makes them perfect for first-time electric riders. Have a seafood dinner on the sand, then glide quietly back along the bay.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00 to 20:00",
    landmarks: ["Jimbaran Bay", "Seafood Cafés", "GWK Cultural Park", "Tegal Wangi Beach"],
    ridingNotes:
      "Relaxed traffic and good road surfaces. An easy area to get comfortable before exploring the Bukit.",
  },
  {
    name: "Sanur",
    slug: "sanur",
    vibe: "Flat seaside promenade and the gateway to the islands.",
    description:
      "Sanur is flat, calm and organised, and a gentle place to ride. Cruise the beach path neighbourhoods, catch a ferry to Nusa Penida, and come back to a fully charged ride waiting at your hotel.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00 to 20:00",
    landmarks: ["Sanur Beach", "Sindhu Market", "Ferry Port", "Mertasari Beach"],
    ridingNotes:
      "This is the flattest riding in Bali, so you get maximum range from every charge. It is ideal for the Bees.",
  },
  {
    name: "Denpasar",
    slug: "denpasar",
    vibe: "The real city, with markets, temples and local flavour.",
    description:
      "Bali's capital is where the island actually lives. Ride to Badung Market at dawn, explore temple courtyards without tour buses, and eat where the locals queue. Electric torque makes city traffic simple.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00 to 20:00",
    landmarks: ["Badung Market", "Bajra Sandhi Monument", "Pura Jagatnatha", "Renon"],
    ridingNotes:
      "City traffic with plenty of charging opportunities. Great for longer stays based outside the tourist belt.",
  },
];

export function getArea(slug: string): ServiceArea | undefined {
  return serviceAreas.find((a) => a.slug === slug);
}

/* ================= Airport pickup points ================= */

/**
 * Ngurah Rai International Airport terminals: selectable pickup and
 * return points (handover by arrangement). They are pickup points,
 * not service areas, so they get no area page, no card on the
 * delivery-areas grid, and no delivery-fee field here; the approved
 * airport fees live in src/lib/addons.ts.
 */
export interface AirportPoint {
  slug: string;
  name: string;
  terminal: "domestic" | "international";
  isAirport: true;
}

export const airportPoints: AirportPoint[] = [
  {
    slug: "airport-domestic",
    name: "Ngurah Rai Airport, Domestic Terminal",
    terminal: "domestic",
    isAirport: true,
  },
  {
    slug: "airport-international",
    name: "Ngurah Rai Airport, International Terminal",
    terminal: "international",
    isAirport: true,
  },
];

export function isAirportSlug(slug: string): boolean {
  return airportPoints.some((a) => a.slug === slug);
}

/** Resolve any selectable pickup/return point (area or airport). */
export function getPickupPoint(
  slug: string
): { slug: string; name: string; isAirport: boolean } | undefined {
  const airport = airportPoints.find((a) => a.slug === slug);
  if (airport) return { slug: airport.slug, name: airport.name, isAirport: true };
  const area = getArea(slug);
  return area ? { slug: area.slug, name: area.name, isAirport: false } : undefined;
}
