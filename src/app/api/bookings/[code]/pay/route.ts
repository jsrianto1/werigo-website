import { NextRequest, NextResponse } from "next/server";
import { getBookingStore, StockUnavailableError } from "@/lib/bookingStore";
import { getSessionUser } from "@/lib/session";
import { latestPayment } from "@/lib/paymentStore";
import { openPayment, paymentDeadline, refreshPendingPayment } from "@/lib/payments";
import { isMidtransConfigured } from "@/lib/midtrans";
import { toPublicBooking, toPublicPayment } from "@/lib/bookingView";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { hasIdentity } from "@/lib/identity";

export const runtime = "nodejs";

/**
 * "Pay now" from the account or confirmation page. Returns the open
 * Snap token while the window is still open; after an expiry or a
 * failed attempt it re-checks stock and opens a new transaction.
 */
interface Ctx {
  params: Promise<{ code: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  if (!isMidtransConfigured()) {
    return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
  }
  const { code } = await ctx.params;
  const store = getBookingStore();
  try {
    if (!(await hasIdentity(user.id))) {
      return NextResponse.json({ ok: false, error: "identity_required" }, { status: 403 });
    }
    let booking = await store.getByCode(code.toUpperCase());
    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    booking = await refreshPendingPayment(booking);
    if (booking.payment_status === "paid" || booking.payment_status === "refunded") {
      return NextResponse.json({ ok: false, error: "already_paid" }, { status: 409 });
    }
    if (booking.status === "cancelled" || new Date(booking.start_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "not_payable" }, { status: 409 });
    }

    const windowOpen =
      booking.payment_status === "pending" &&
      booking.payment_expires_at !== null &&
      new Date(booking.payment_expires_at).getTime() > Date.now() + 60_000;
    let payment = windowOpen ? await latestPayment(booking.id) : null;

    if (!payment || !payment.snap_token) {
      try {
        booking = (await store.reopenPayment(booking.id, paymentDeadline())) ?? booking;
      } catch (err) {
        if (err instanceof StockUnavailableError) {
          return NextResponse.json(
            { ok: false, error: "sold_out", available: err.available, message: "This model is no longer available for these dates." },
            { status: 409 }
          );
        }
        throw err;
      }
      try {
        payment = await openPayment(booking, user.email);
      } catch (err) {
        console.error(`[payments] snap reopen failed for ${booking.booking_code}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
        await store.setPaymentState(booking.id, { payment_status: "failed", status: "expired" }, "system", "payment provider unavailable").catch(() => null);
        return NextResponse.json({ ok: false, error: "payment_unavailable" }, { status: 503 });
      }
    }

    return NextResponse.json({
      ok: true,
      booking: toPublicBooking(booking),
      payment: toPublicPayment(booking, payment),
    });
  } catch (err) {
    logStorageError(storageErrorFromThrown("reopen_payment", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
