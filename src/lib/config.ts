/**
 * Central site configuration.
 * Everything a future admin panel would manage lives here for now.
 */

export const site = {
  name: "Werigo",
  domain: "werigo.co",
  baseUrl: "https://werigo.co",
  tagline: "Werigo, Powered by Wedison",
  description:
    "Electric scooter rental in Bali with hotel and villa delivery. Compare daily, weekly and monthly rates on official Wedison motorcycles. Two helmets included.",
  /** Brand relationship line — use wherever the relationship is stated. */
  brandRelationship:
    "Werigo is Wedison's electric motorcycle rental and mobility service in Bali.",

  /**
   * Werigo Admin WhatsApp number, international format, digits only.
   * Hardcoded on purpose: a stale NEXT_PUBLIC_WHATSAPP_NUMBER in the
   * hosting environment previously overrode the approved number at
   * build time and sent bookings to a dead number. The env var is
   * intentionally ignored; change the number here only.
   */
  whatsappNumber: "628157011969",

  /** Human-readable form of whatsappNumber for display surfaces. */
  whatsappDisplay: "+62 815-7011-969",

  /** PLACEHOLDER contact email until the official inbox exists. */
  contactEmail: "hello@werigo.co",

  /** Operating hours shown on contact surfaces (local Bali time, GMT+8). */
  operatingHours: "Daily 08:00 to 20:00 WITA",

  /**
   * Sentence form of operatingHours for support copy. Keep the two
   * in sync: this is the only approved statement of reply hours.
   */
  supportHoursSentence: "Our team replies daily from 08:00 to 20:00 WITA.",

  /** Social profiles, confirmed by management 2026-08-23: @werigo.official. */
  social: {
    instagram: "https://instagram.com/werigo.official",
    tiktok: "https://www.tiktok.com/@werigo.official",
    handle: "@werigo.official",
  },

  /** Languages prepared for the language selector. */
  locales: [
    { code: "en", label: "English", active: true },
    { code: "id", label: "Bahasa Indonesia", active: true },
    { code: "ru", label: "Русский", active: true },
  ],

  /** Business location supplied by management via Google Maps on 1 October 2026. */
  address: {
    streetAddress: "Lantai 3, Jl. Gatot Subroto Tengah No.93, Dangin Puri Kaja",
    addressLocality: "Denpasar Utara, Kota Denpasar",
    addressRegion: "Bali",
    postalCode: "80118",
    addressCountry: "ID",
    display: "Lantai 3, Jl. Gatot Subroto Tengah No.93, Dangin Puri Kaja, Denpasar Utara, Kota Denpasar, Bali 80118",
  },
  mapsUrl: "https://www.google.com/maps?cid=7693854991597541277",
  geo: { latitude: -8.6359252, longitude: 115.2213422 },

  currency: {
    code: "IDR",
    symbol: "Rp",
  },
} as const;

export function formatIDR(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}
