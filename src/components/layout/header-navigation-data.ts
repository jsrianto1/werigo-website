export type HeaderGroupId = "ride" | "explore" | "more";
export const headerGroups = [
  {
    id: "ride" as const, label: "Rent a ride", eyebrow: "YOUR ISLAND. YOUR PACE.",
    title: "Meet your Wedison.", description: "Four electric models. Find the one for your Bali.",
    image: "/app/edpower-red.webp", imageAlt: "Red Wedison EdPower electric motorcycle",
    href: "/fleet", action: "Find your ride",
    links: [
      { href: "/fleet", label: "Our Fleet", description: "Compare your four electric rides." },
      { href: "/monthly-scooter-rental-bali", label: "Monthly Rentals", description: "A ride for your everyday Bali." },
      { href: "/delivery-areas", label: "Delivery Areas", description: "From our showroom to your stay." },
      { href: "/how-it-works", label: "How It Works", description: "Your booking, step by step." },
    ],
  },
  {
    id: "explore" as const, label: "Explore Bali", eyebrow: "A LITTLE MORE BALI",
    title: "Make it a Bali day.", description: "Good places. New favourites. Your own way there.",
    image: "/media/areas/canggu/hero.webp", imageAlt: "Surfer on Canggu beach at sunset",
    href: "/app/services", action: "Explore Bali",
    links: [
      { href: "/app/explore", label: "What to do?", description: "Surf, snorkel and explore." },
      { href: "/app/cafes", label: "Café hopping", description: "Coffee, brunch and one more stop." },
      { href: "/app/stays", label: "Where to stay?", description: "Find your Bali base." },
      { href: "/app/shop", label: "Where to shop?", description: "Markets and everyday essentials." },
      { href: "/app/wellness", label: "Workout & wellness", description: "Gym, Pilates, yoga and recovery." },
      { href: "/supercharge", label: "SuperCharge", description: "A charging stop along the way." },
    ],
  },
  {
    id: "more" as const, label: "More", eyebrow: "WERIGO SAGA",
    title: "Off the road. Into the story.", description: "Your next adventure is a chapter away.",
    image: "/media/saga/trailer/werigo-saga-ep1-motion-poster.webp", imageAlt: "WERIGO SAGA webtoon",
    href: "/saga", action: "Read WERIGO SAGA",
    links: [
      { href: "/about", label: "About Werigo", description: "Get to know your local team." },
      { href: "/saga", label: "WERIGO SAGA", description: "Take a break. Read a chapter." },
      { href: "/partners", label: "Partners", description: "Let’s make more of Bali together." },
      { href: "/help-center", label: "Help Center", description: "Good questions. Clear answers." },
      { href: "/contact", label: "Contact", description: "A real person, ready to help." },
    ],
  },
];
