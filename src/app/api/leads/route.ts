import { NextRequest, NextResponse } from "next/server";
import { leadSubmissionSchema, normalizeLead, isContactable } from "@/lib/leadSchema";
import { getCustomerStore, customerStoreConfigured } from "@/lib/customerStore";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";
import { BOOKING_MODE } from "@/lib/bookingMode";
import { LEAD_CAPTURE_ENABLED } from "@/lib/leadCaptureMode";

export const runtime = "nodejs";

/**
 * Customer database capture. Every booking request and contact
 * message submitted on werigo.co is stored here, whichever way the
 * conversation continues afterwards.
 *
 * This route never blocks the customer: the forms call it without
 * waiting, and a storage problem is reported to the server log while
 * the visitor still reaches WhatsApp. Protections mirror the booking
 * API: Zod validation, honeypot, per-IP rate limiting, idempotency on
 * client_submission_id. Prices are recomputed server-side and no IP
 * address is stored.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

let warnedUnconfigured = false;

export async function POST(req: NextRequest) {
  if (!LEAD_CAPTURE_ENABLED) {
    return NextResponse.json({ ok: true, stored: false, reason: "disabled" });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot filled → answer as if stored, store nothing.
  if (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ ok: true, stored: false, ignored: true });
  }

  const parsed = leadSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: "validation", fieldErrors },
      { status: 422 }
    );
  }

  const record = normalizeLead(parsed.data, BOOKING_MODE);
  if (!isContactable(record)) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation",
        fieldErrors: { whatsapp: "A WhatsApp number or an email address is required." },
      },
      { status: 422 }
    );
  }

  // No Supabase on this deployment: the visitor's journey continues
  // untouched, and the gap is visible in the server log only.
  if (!customerStoreConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[werigo] customer capture skipped: Supabase URL or server key is not set."
      );
    }
    return NextResponse.json({ ok: true, stored: false, reason: "not_configured" });
  }

  try {
    const { submission, duplicate } = await getCustomerStore().capture(record);
    return NextResponse.json(
      {
        ok: true,
        stored: true,
        duplicate,
        reference: submission.reference_code,
      },
      { status: duplicate ? 200 : 201 }
    );
  } catch (err) {
    logStorageError(storageErrorFromThrown("capture_submission", err));
    return NextResponse.json(
      { ok: false, stored: false, error: "storage_failed" },
      { status: 503 }
    );
  }
}
