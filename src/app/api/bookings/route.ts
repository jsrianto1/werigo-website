import { NextRequest, NextResponse } from "next/server";
import { bookingSubmissionSchema } from "@/lib/bookingSchema";
import { getBookingStore, StockUnavailableError } from "@/lib/bookingStore";
import { buildStoredBookingWhatsAppUrl } from "@/lib/whatsapp";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { getSessionUser } from "@/lib/session";
import { computeQuote, periodFromIso } from "@/lib/quote";
import { isMidtransConfigured, MidtransError } from "@/lib/midtrans";
import { openPayment, paymentDeadline } from "@/lib/payments";
import { latestPayment } from "@/lib/paymentStore";
import { toPublicBooking, toPublicPayment } from "@/lib/bookingView";
import { pickDiscount, resolveDiscounts } from "@/lib/discounts";
import { hasIdentity } from "@/lib/identity";

export const runtime = "nodejs";

/**
 * Public booking creation (signed-in customers).
 *
 * Order of operations: validate → price on the server → reserve units
 * and insert the booking (pending payment) → open a Midtrans Snap
 * transaction → return the token. The browser never sends a price.
 * If the payment provider cannot be reached, the booking is released
 * again and the customer keeps their form to retry.
 *
 * Protections: session required, Zod validation, honeypot, per-IP
 * rate limiting, idempotency via client_submission_id, stock check
 * inside the insert transaction. No personal data is logged.
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
  // WhatsApp-only mode: the public flow never calls this route;
  // direct calls are refused before any store access.
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json(
      { ok: false, error: "storage_disabled", message: "Booking storage is temporarily disabled. Please use the WhatsApp booking flow on the website." },
      { status: 503 }
    );
  }

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

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "auth_required", message: "Please sign in to complete your booking." },
      { status: 401 }
    );
  }
  // Renting needs an identity document and a driving licence on file.
  try {
    if (!(await hasIdentity(user.id))) {
      return NextResponse.json(
        { ok: false, error: "identity_required", message: "Add your passport or ID number and driving licence number to continue." },
        { status: 403 }
      );
    }
  } catch (err) {
    logStorageError(storageErrorFromThrown("check_identity", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
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
  const submission = { ...parsed.data, email: parsed.data.email || user.email };

  // The server prices the booking from approved data only: first the
  // rental, then the one discount (best available, or the customer's
  // own choice among the valid ones).
  const pricingInput = {
    modelSlug: submission.vehicleModel,
    period: periodFromIso(submission.startAt, submission.endAt),
    quantity: submission.quantity,
    pickupSlug: submission.pickupArea,
    returnSlug: submission.returnArea,
  };
  const undiscounted = computeQuote(pricingInput);
  let discount = null;
  if (undiscounted) {
    try {
      const resolution = await resolveDiscounts({
        userId: user.id,
        modelSlug: submission.vehicleModel,
        rentalIdr: undiscounted.baseIdr,
        code: submission.promoCode || null,
      });
      discount = pickDiscount(resolution, submission.discountKey || null);
    } catch (err) {
      logStorageError(storageErrorFromThrown("resolve_discounts", err));
      return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
    }
  }
  const quote = undiscounted
    ? computeQuote({ ...pricingInput, discountIdr: discount?.discountIdr ?? 0, discountCode: discount?.code ?? null })
    : null;
  if (!quote) {
    return NextResponse.json(
      { ok: false, error: "quote_unavailable", message: "These dates cannot be priced. Please check the rental period (minimum 2 days)." },
      { status: 422 }
    );
  }
  if (!isMidtransConfigured()) {
    return NextResponse.json(
      { ok: false, error: "payment_unavailable", message: "Online payment is not available right now. Please contact us on WhatsApp." },
      { status: 503 }
    );
  }

  const store = getBookingStore();
  let booking;
  let duplicate = false;
  try {
    ({ booking, duplicate } = await store.create(submission, {
      userId: user.id,
      payment: { quote, expiresAt: paymentDeadline() },
      discount: discount
        ? {
            kind: discount.kind,
            promotionId: discount.promotionId,
            referralOwnerId: discount.referralOwnerId,
            referralFeePercent: discount.referralFeePercent,
          }
        : null,
    }));
  } catch (err) {
    if (err instanceof StockUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          error: "sold_out",
          available: err.available,
          message:
            err.available > 0
              ? `Only ${err.available} unit${err.available === 1 ? "" : "s"} of this model ${err.available === 1 ? "is" : "are"} left for these dates.`
              : "This model is fully booked for these dates. Try different dates or another model.",
        },
        { status: 409 }
      );
    }
    // Typed, categorized, redacted logging — never credentials,
    // payloads, or personal data.
    logStorageError(storageErrorFromThrown("create_booking", err));
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

  // A replayed submission (network retry) returns the existing booking
  // and its open payment; a new one gets a fresh Snap transaction.
  let payment = duplicate ? await latestPayment(booking.id) : null;
  const windowOpen =
    booking.payment_status === "pending" &&
    booking.payment_expires_at !== null &&
    new Date(booking.payment_expires_at).getTime() > Date.now();

  if (!payment && booking.payment_status === "pending" && windowOpen) {
    try {
      payment = await openPayment(booking, user.email);
    } catch (err) {
      const message = err instanceof MidtransError ? err.message : err instanceof Error ? err.message : String(err);
      console.error(`[payments] snap create failed for ${booking.booking_code}: ${message.slice(0, 200)}`);
      // Release the units: the customer keeps the form and can retry.
      await store.setPaymentState(booking.id, { payment_status: "failed", status: "expired" }, "system", "payment provider unavailable").catch(() => null);
      return NextResponse.json(
        {
          ok: false,
          error: "payment_unavailable",
          message: "We couldn't start the payment just now. Your details are still on this page. Please try again in a moment, or contact us on WhatsApp.",
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      duplicate,
      booking: toPublicBooking(booking),
      payment: toPublicPayment(booking, payment),
      whatsappUrl: buildStoredBookingWhatsAppUrl(booking),
    },
    { status: duplicate ? 200 : 201 }
  );
}
