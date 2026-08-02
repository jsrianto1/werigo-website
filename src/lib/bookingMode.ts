/**
 * Booking mode configuration.
 *
 * NEXT_PUBLIC_BOOKING_MODE controls how booking requests are handled:
 *   "whatsapp"  (default) — the request goes straight to WhatsApp.
 *                No database insert, no /api/bookings call, no
 *                booking code, no storage errors. Safe default when
 *                the variable is missing entirely.
 *   "database"  — reserved for reactivating the dormant Supabase
 *                flow later (also requires the Supabase environment
 *                variables; see README "Booking database").
 *
 * The Supabase schema, store, API routes, and admin dashboard are
 * kept intact but dormant while WhatsApp mode is active.
 */
const mode = process.env.NEXT_PUBLIC_BOOKING_MODE?.trim().toLowerCase();

export const BOOKING_MODE: "whatsapp" | "database" =
  mode === "database" ? "database" : "whatsapp";

/** True while booking requests bypass every database code path. */
export const WHATSAPP_FIRST_BOOKING: boolean = BOOKING_MODE === "whatsapp";
