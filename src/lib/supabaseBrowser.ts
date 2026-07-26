"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — used ONLY for admin authentication
 * (cookie-based session that the server verifies against the
 * ADMIN_EMAILS allowlist). Bookings are never read or written from
 * the browser; RLS denies it regardless.
 */
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
