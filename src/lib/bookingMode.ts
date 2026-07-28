/**
 * TEMPORARY booking mode switch.
 *
 * While the Supabase booking database is disconnected, the public
 * booking flow hands the request straight to WhatsApp: no database
 * insert, no /api/bookings call, no booking code. The Supabase
 * schema, store, API routes, and admin dashboard are kept intact but
 * dormant.
 *
 * To reactivate database storage, set this to false and restore the
 * Supabase environment variables (see README "Booking database").
 */
export const WHATSAPP_FIRST_BOOKING: boolean = true;
