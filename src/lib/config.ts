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
    "Official Wedison electric motorcycles, available for rent through Werigo in Bali. Hotel and villa delivery across Canggu, Seminyak, Ubud and more. Book online in minutes, ride silent, ride clean.",
  /** Brand relationship line — use wherever the relationship is stated. */
  brandRelationship:
    "Werigo is Wedison's electric motorcycle rental and mobility service in Bali.",

  /**
   * Werigo Admin WhatsApp number, international format, digits only.
   * Overridable via NEXT_PUBLIC_WHATSAPP_NUMBER.
   */
  whatsappNumber:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "6282187441628",

  /** Human-readable form of whatsappNumber for display surfaces. */
  whatsappDisplay: "+62 821-8744-1628",

  /** PLACEHOLDER contact email until the official inbox exists. */
  contactEmail: "hello@werigo.co",

  /** Operating hours shown on contact surfaces (local Bali time, GMT+8). */
  operatingHours: "Daily 08:00 to 20:00 WITA",

  /**
   * Sentence form of operatingHours for support copy. Keep the two
   * in sync: this is the only approved statement of reply hours.
   */
  supportHoursSentence: "Our team replies daily from 08:00 to 20:00 WITA.",

  /** Social profiles — PLACEHOLDER URLs, update when accounts exist. */
  social: {
    instagram: "https://instagram.com/werigo.bali",
    facebook: "https://facebook.com/werigo.bali",
  },

  /** Languages prepared for the language selector. */
  locales: [
    { code: "en", label: "English", active: true },
    { code: "id", label: "Bahasa Indonesia", active: false },
  ],

  currency: {
    code: "IDR",
    symbol: "Rp",
  },
} as const;

export function formatIDR(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}
