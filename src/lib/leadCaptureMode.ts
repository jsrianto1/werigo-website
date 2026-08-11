/**
 * Customer database switch.
 *
 * Capture is ON by default and independent of NEXT_PUBLIC_BOOKING_MODE:
 * WhatsApp stays the way the conversation continues, while the person
 * who filled in the form is recorded either way. Set LEAD_CAPTURE=off
 * (server-only) to stop storing form submissions entirely.
 *
 * With Supabase not configured, capture degrades quietly: the API
 * answers normally, logs one warning, and nothing is stored.
 */
export const LEAD_CAPTURE_ENABLED: boolean =
  process.env.LEAD_CAPTURE?.trim().toLowerCase() !== "off";
