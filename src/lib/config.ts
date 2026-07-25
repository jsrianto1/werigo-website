/**
 * Central site configuration.
 * Everything a future admin panel would manage lives here for now.
 */

export const site = {
  name: "Werigo",
  domain: "werigo.co",
  baseUrl: "https://werigo.co",
  tagline: "Premium electric motorcycle rental in Bali",
  description:
    "Rent a premium electric motorcycle or scooter in Bali. Free hotel delivery across Canggu, Seminyak, Ubud and more. Book online in minutes, ride silent, ride clean.",

  /**
   * Business WhatsApp number in international format, digits only.
   * PLACEHOLDER — replace via env var NEXT_PUBLIC_WHATSAPP_NUMBER
   * or by editing the fallback below.
   */
  whatsappNumber:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "620000000000",

  /** PLACEHOLDER contact email until the official inbox exists. */
  contactEmail: "hello@werigo.co",

  /** Operating hours shown on contact surfaces (local Bali time, GMT+8). */
  operatingHours: "Daily 08:00 – 20:00 WITA",

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
