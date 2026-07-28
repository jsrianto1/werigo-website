import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  isPublishableKey,
  logStorageError,
  resolveSupabaseServerConfig,
  storageErrorFrom,
  storageErrorFromThrown,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-sensitive database health diagnostic.
 *
 * Returns exactly three booleans and nothing else — no environment
 * variable values, no URLs, no keys, no error strings:
 *   configured  — a Supabase URL and a genuine server key are set
 *   reachable   — Supabase answered and accepted the server key
 *   schemaReady — the bookings tables exist and can be queried
 */
export async function GET() {
  const { url, secretKey } = resolveSupabaseServerConfig();
  const configured = Boolean(url && secretKey && !isPublishableKey(secretKey));
  if (!configured) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      schemaReady: false,
    });
  }

  let reachable = false;
  let schemaReady = false;
  try {
    const client = createSupabaseAdminClient();
    const [bookings, events] = await Promise.all([
      client.from("bookings").select("id", { count: "exact", head: true }),
      client.from("booking_events").select("id", { count: "exact", head: true }),
    ]);
    const failed = bookings.error
      ? { error: bookings.error, status: bookings.status }
      : events.error
        ? { error: events.error, status: events.status }
        : null;
    if (!failed) {
      reachable = true;
      schemaReady = true;
    } else {
      const se = storageErrorFrom("health_check", failed.error, failed.status);
      // Schema and data-level errors mean Supabase itself responded.
      reachable =
        se.category === "schema_mismatch" ||
        se.category === "constraint_failed" ||
        se.category === "insert_failed";
      logStorageError(se);
    }
  } catch (err) {
    logStorageError(storageErrorFromThrown("health_check", err));
  }

  return NextResponse.json({ configured, reachable, schemaReady });
}
