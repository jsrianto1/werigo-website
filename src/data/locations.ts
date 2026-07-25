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
    vibe: "Surf mornings, laptop afternoons, sunset traffic — solved.",
    description:
      "Canggu is Werigo's home turf. Between Batu Bolong, Berawa and Pererenan, an electric scooter is the difference between watching the shortcut jam and gliding through it. Charge at your villa overnight and the whole coast is yours.",
    deliveryFee: 0,
    deliveryWindow: "Within 60 minutes, 08:00–20:00",
    landmarks: ["Batu Bolong Beach", "Berawa", "Pererenan", "La Brisa", "Tanah Lot (day trip)"],
    ridingNotes:
      "Short distances, heavy scooter traffic at peak hours. The quiet torque of an electric ride makes the shortcut lanes far more pleasant.",
  },
  {
    name: "Seminyak",
    slug: "seminyak",
    vibe: "Boutiques, beach clubs and dinner reservations on time.",
    description:
      "Seminyak rewards short, frequent rides — brunch to beach club to boutique. Werigo delivers to your hotel lobby, and the compact fleet fits the narrow gang lanes that cars simply cannot.",
    deliveryFee: 0,
    deliveryWindow: "Within 60 minutes, 08:00–20:00",
    landmarks: ["Seminyak Beach", "Petitenget", "Eat Street", "Potato Head", "Double Six"],
    ridingNotes:
      "Dense one-way streets and valet-only parking at clubs. A scooter parks anywhere; an electric one does it without waking the whole street.",
  },
  {
    name: "Kuta",
    slug: "kuta",
    vibe: "Airport-close and beach-ready within minutes.",
    description:
      "Landing at DPS? Kuta is the fastest place to start riding. We deliver to hotels across Kuta and Legian, so you can skip taxi queues for the rest of your trip.",
    deliveryFee: 50000,
    deliveryWindow: "Within 90 minutes, 08:00–20:00",
    landmarks: ["Kuta Beach", "Legian", "Beachwalk Mall", "Waterbom Bali"],
    ridingNotes:
      "Busy arterials and confident local traffic. Stick to the beach roads early morning for the calmest riding.",
  },
  {
    name: "Ubud",
    slug: "ubud",
    vibe: "Jungle roads, rice terraces and temple mornings.",
    description:
      "Ubud is made for slow exploring — and silent riding. Tegallalang at sunrise, Campuhan Ridge before the heat, a warung lunch in Penestanan. An electric motorcycle keeps the jungle soundtrack intact.",
    deliveryFee: 100000,
    deliveryWindow: "Within 2 hours, 08:00–18:00",
    landmarks: ["Tegallalang Rice Terrace", "Campuhan Ridge Walk", "Monkey Forest", "Goa Gajah"],
    ridingNotes:
      "Winding roads and short climbs — mid-fleet models and up recommended. Ranges shown comfortably cover a full Ubud day loop.",
  },
  {
    name: "Uluwatu",
    slug: "uluwatu",
    vibe: "Clifftop surf breaks and golden-hour temple runs.",
    description:
      "The Bukit's clifftop warungs, surf breaks and viewpoints spread out fast — exactly what a full battery is for. Ride Padang Padang to Melasti and still make the Kecak dance at sunset.",
    deliveryFee: 100000,
    deliveryWindow: "Within 2 hours, 08:00–18:00",
    landmarks: ["Uluwatu Temple", "Padang Padang", "Bingin", "Melasti Beach", "Suluban Cave"],
    ridingNotes:
      "Steep beach access roads. Athena or EdPower recommended for two riders with surfboards' worth of daypacks.",
  },
  {
    name: "Jimbaran",
    slug: "jimbaran",
    vibe: "Seafood sunsets and calm bay-side streets.",
    description:
      "Jimbaran's wide, calm streets are some of Bali's easiest riding — perfect for first-time electric riders. Seafood dinner on the sand, then a quiet glide back along the bay.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00–20:00",
    landmarks: ["Jimbaran Bay", "Seafood Cafés", "GWK Cultural Park", "Tegal Wangi Beach"],
    ridingNotes:
      "Relaxed traffic and good road surfaces. An easy area to get comfortable before exploring the Bukit.",
  },
  {
    name: "Sanur",
    slug: "sanur",
    vibe: "Flat seaside promenade and the gateway to the islands.",
    description:
      "Sanur is flat, calm and organised — a gentle place to ride. Cruise the beach path neighbourhoods, catch a ferry to Nusa Penida, and come back to a fully charged ride waiting at your hotel.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00–20:00",
    landmarks: ["Sanur Beach", "Sindhu Market", "Ferry Port", "Mertasari Beach"],
    ridingNotes:
      "The flattest riding in Bali — maximum range from every charge. Ideal for the Bees.",
  },
  {
    name: "Denpasar",
    slug: "denpasar",
    vibe: "The real city — markets, temples and local flavour.",
    description:
      "Bali's capital is where the island actually lives. Ride to Badung Market at dawn, explore temple courtyards without tour buses, and eat where the locals queue. Electric torque makes city traffic simple.",
    deliveryFee: 75000,
    deliveryWindow: "Within 90 minutes, 08:00–20:00",
    landmarks: ["Badung Market", "Bajra Sandhi Monument", "Pura Jagatnatha", "Renon"],
    ridingNotes:
      "City traffic with plenty of charging opportunities. Great for longer stays based outside the tourist belt.",
  },
];

export function getArea(slug: string): ServiceArea | undefined {
  return serviceAreas.find((a) => a.slug === slug);
}
