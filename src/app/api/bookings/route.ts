import { NextRequest, NextResponse } from "next/server";
import { bookingSubmissionSchema } from "@/lib/bookingSchema";
import { getBookingStore } from "@/lib/bookingStore";
import { buildStoredBookingWhatsAppUrl } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * Public booking creation. The database insert must succeed BEFORE
 * any WhatsApp URL is returned — the client never opens WhatsApp
 * without a stored booking.
 *
 * Protections: Zod validation, honeypot, per-IP rate limiting,
 * idempotency via client_submission_id. No prices are accepted from
 * the browser. No personal data is logged.
 */

// Simple per-IP sliding window (single-instance deployment).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
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
  // opportunistic cleanup
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: "Invalid request." },
      { status: 400 }
    );
  }

  // Honeypot filled → pretend success without storing (checked before
  // validation so bots see a normal response, not a field error).
  if (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const parsed = bookingSubmissionSchema.safeParse(body);
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

  try {
    const store = getBookingStore();
    const { booking, duplicate } = await store.create(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        duplicate,
        booking: {
          bookingCode: booking.booking_code,
          fullName: booking.full_name,
          vehicleModel: booking.vehicle_model,
          quantity: booking.quantity,
          pickupArea: booking.pickup_area,
          pickupAddress: booking.pickup_address,
          returnArea: booking.return_area,
          returnAddress: booking.return_address,
          startAt: booking.start_at,
          endAt: booking.end_at,
          customerNotes: booking.customer_notes,
        },
        whatsappUrl: buildStoredBookingWhatsAppUrl(booking),
      },
      { status: duplicate ? 200 : 201 }
    );
  } catch (err) {
    const notConfigured =
      err instanceof Error && err.message === "storage_not_configured";
    // No personal data in logs — only the error class.
    console.error(
      `[bookings] storage error: ${notConfigured ? "not configured" : "unavailable"}`
    );
    return NextResponse.json(
      {
        ok: false,
        error: "storage_failed",
        message:
          "We couldn't save your booking just now. Your details are still on this page. Please try again in a moment, or contact us directly on WhatsApp.",
      },
      { status: 503 }
    );
  }
}
