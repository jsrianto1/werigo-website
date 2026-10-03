import { NextRequest, NextResponse } from "next/server";
import { getBookingStore } from "@/lib/bookingStore";
import { isDatabaseConfigured } from "@/lib/db";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Close payment windows that ran out (frees the reserved units).
 * Midtrans also notifies on expiry; this is the safety net. Called by
 * the VPS cron with `Authorization: Bearer <CRON_SECRET>`.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, expired: 0 });
  }
  try {
    const expired = await getBookingStore().expirePending();
    return NextResponse.json({ ok: true, expired: expired.length });
  } catch (err) {
    logStorageError(storageErrorFromThrown("expire_pending", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

export const POST = GET;
