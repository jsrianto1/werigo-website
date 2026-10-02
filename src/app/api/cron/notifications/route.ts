import { NextRequest, NextResponse } from "next/server";
import { deliverDue } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retry pending WhatsApp notifications. Called by the VPS cron every
 * few minutes with `Authorization: Bearer <CRON_SECRET>`. Returns only
 * counters.
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
  const result = await deliverDue(50);
  return NextResponse.json({ ok: true, ...result });
}

export const POST = GET;
