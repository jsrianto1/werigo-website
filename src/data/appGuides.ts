/** Area guides are editorial content, not approved merchant or charging listings. */
export const appGuides = [
  { slug: "canggu", category: "Beach", title: "A slower kind of surf day", area: "Canggu", image: "/media/areas/canggu/hero.webp", summary: "Coastal stops around Batu Bolong, Berawa and Pererenan.", tip: "Keep the day local. Park in designated spaces and explore the beach on foot.", stops: ["Batu Bolong", "Berawa", "Pererenan"] },
  { slug: "ubud", category: "Nature", title: "Take the green way", area: "Ubud", image: "/media/areas/ubud/hero.webp", summary: "Rice terraces, walking trails and a little more time outside.", tip: "Plan your battery before leaving. Distances and hills affect your range; bring the correct charger when appropriate.", stops: ["Campuhan area", "Central Ubud", "Tegallalang area"] },
  { slug: "uluwatu", category: "Culture", title: "Follow the coast south", area: "Uluwatu", image: "/media/areas/uluwatu/hero.webp", summary: "Ocean views and the clifftop setting of Uluwatu Temple.", tip: "Respect temple dress rules and local customs. Check current entry arrangements with the venue.", stops: ["Jimbaran", "Pecatu", "Uluwatu Temple"] },
  { slug: "sanur", category: "Beach", title: "Make room for sunrise", area: "Sanur", image: "/media/areas/sanur/hero.webp", summary: "A seaside morning around Sindhu and Mertasari.", tip: "Leave your motorcycle in designated parking. Beach promenades are for exploring on foot.", stops: ["Sindhu", "Sanur coast", "Mertasari"] },
] as const;
export type AppGuide = typeof appGuides[number];
