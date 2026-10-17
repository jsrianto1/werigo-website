/** Independently researched activity ideas, checked against operators on 2026-10-18.
 * Photos show the named area/activity, not a specific operator or partnership.
 */
export interface AppActivity {
  name: string;
  area: string;
  category: string;
  description: string;
  query: string;
  website: string;
  tip: string;
  image: string;
  imageAlt: string;
  photoLabel: string;
  imagePosition?: string;
}

export const appActivities: AppActivity[] = [
  {
    name: "Your first waves at Kuta",
    area: "Kuta Beach",
    category: "Surfing",
    description: "Start with a coached surf lesson on Bali’s classic beach. A good starting point when you want an instructor beside you.",
    query: "Kuta Beach Bali",
    website: "https://kutasurf.com/surf-lessons-kuta-beach",
    tip: "Choose a lesson for your level. Let the instructor confirm the day’s conditions.",
    image: "/media/areas/kuta/hero.webp",
    imageAlt: "Kuta beach and traditional boats on the horizon",
    photoLabel: "Kuta area photo",
  },
  {
    name: "Blue Lagoon & Tanjung Jepun",
    area: "Padangbai, East Bali",
    category: "Snorkeling",
    description: "Make a day of East Bali with a guided boat trip to the snorkeling spots around Padangbai.",
    query: "Blue Lagoon Beach Padangbai Bali",
    website: "https://bluelagoonbalisnorkeling.com/",
    tip: "Boat excursion. Confirm your meeting point and sea conditions with the operator. Plan the longer ride and charging first.",
    image: "/app/activities/padangbai.jpg",
    imageAlt: "Aerial view of Padangbai harbour and its surrounding coves",
    photoLabel: "Padangbai area photo",
  },
  {
    name: "Above Tanjung Benoa",
    area: "Tanjung Benoa, Nusa Dua",
    category: "Parasailing",
    description: "See the south coast from a different angle with a boat-based parasailing adventure.",
    query: "Tanjung Benoa Bali",
    website: "https://www.water-sport-bali.com/parasailing-adventure-bali/",
    tip: "Reserve with an operator and confirm wind, participant requirements and your meeting point before leaving.",
    image: "/app/activities/tanjung-benoa-parasailing.jpg",
    imageAlt: "Parasailing over the sea at Tanjung Benoa, Bali",
    photoLabel: "Tanjung Benoa activity photo",
    imagePosition: "50% 47%",
  },
  {
    name: "Raft the Ayung River",
    area: "Ubud & the Ayung Valley",
    category: "Rafting",
    description: "Swap the road for a guided river adventure through the green Ayung valley. A different way to see Bali’s jungle scenery.",
    query: "Ayung River Ubud Bali",
    website: "https://masonadventures.com/rafting-kayaking/",
    tip: "Book a guided trip. Use the rafting meeting point confirmed by your operator, not the river pin.",
    image: "/app/activities/ayung-rafting.jpg",
    imageAlt: "A rafting group on a slower stretch of Bali’s Ayung River",
    photoLabel: "Ayung River activity photo",
    imagePosition: "50% 58%",
  },
  {
    name: "Learn to surf in Sanur",
    area: "Sanur",
    category: "Surfing",
    description: "Explore the east-coast surf scene with a lesson from Rip Curl School of Surf. Ask the school to match the session to your experience.",
    query: "Rip Curl School of Surf Sanur Bali",
    website: "https://ripcurlschoolofsurf.com/",
    tip: "Confirm the lesson location, tide and transport arrangements directly with the school.",
    image: "/media/areas/sanur/hero.webp",
    imageAlt: "The Sanur coastline in Bali",
    photoLabel: "Sanur area photo",
  },
  {
    name: "Uluwatu, then Kecak",
    area: "Pecatu, Uluwatu",
    category: "Culture",
    description: "Pair the clifftop setting of Uluwatu with an open-air Kecak performance. Make time for the south coast before the show.",
    query: "Pura Luhur Uluwatu Bali",
    website: "https://www.uluwatukecakdance.com/jadwal-show/",
    tip: "Check current tickets and show times. Follow temple dress rules and use designated parking.",
    image: "/media/areas/uluwatu/hero.webp",
    imageAlt: "The ocean and limestone cliffs at Uluwatu, Bali",
    photoLabel: "Uluwatu area photo",
  },
];
