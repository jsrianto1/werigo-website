import { NextRequest, NextResponse } from "next/server";
import { getBookingStore } from "@/lib/bookingStore";
import { getSessionUser } from "@/lib/session";
import { getAdmin } from "@/lib/adminAuth";
import { latestPayment } from "@/lib/paymentStore";
import { refreshPendingPayment } from "@/lib/payments";
import { toPublicBooking, toPublicPayment } from "@/lib/bookingView";
import { buildStoredBookingWhatsAppUrl } from "@/lib/whatsapp";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A customer's own booking by code (or any booking for staff). While
 * the payment is pending, the status is re-checked with Midtrans so a
 * missed webhook never leaves a paid booking showing as unpaid.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/bookings/[code]">) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const { code } = await ctx.params;
  const [user, admin] = await Promise.all([getSessionUser(), getAdmin()]);
  if (!user && !admin) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  try {
    const store = getBookingStore();
    let booking = await store.getByCode(code.toUpperCase());
    if (!booking || (!admin && booking.user_id !== user?.id)) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    booking = await refreshPendingPayment(booking);
    const payment = await latestPayment(booking.id);
    return NextResponse.json({
      ok: true,
      booking: toPublicBooking(booking),
      payment: toPublicPayment(booking, payment),
      whatsappUrl: buildStoredBookingWhatsAppUrl(booking),
    });
  } catch (err) {
    logStorageError(storageErrorFromThrown("get_booking_by_code", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
