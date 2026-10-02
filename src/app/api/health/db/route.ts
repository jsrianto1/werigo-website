import { NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-sensitive database health diagnostic.
 *
 * Returns exactly three booleans and nothing else — no environment
 * variable values, no URLs, no error strings:
 *   configured  — DATABASE_URL is set
 *   reachable   — PostgreSQL answered and accepted the credentials
 *   schemaReady — the bookings tables exist and can be queried
 */
export async function GET() {
  const configured = isDatabaseConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, reachable: false, schemaReady: false });
  }

  let reachable = false;
  let schemaReady = false;
  try {
    const pool = getPool();
    await pool.query("select 1");
    reachable = true;
    await pool.query("select 1 from bookings limit 0");
    await pool.query("select 1 from booking_events limit 0");
    schemaReady = true;
  } catch (err) {
    logStorageError(storageErrorFromThrown("health_check", err));
  }

  return NextResponse.json({ configured, reachable, schemaReady });
}
