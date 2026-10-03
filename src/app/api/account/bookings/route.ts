import { NextResponse } from "next/server";
import { getBookingStore } from "@/lib/bookingStore";
import { getSessionUser } from "@/lib/session";
import { refreshPendingPayment } from "@/lib/payments";
import { toPublicBooking } from "@/lib/bookingView";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in customer's bookings, newest first. */
export async function GET() {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  try {
    const rows = await getBookingStore().listForUser(user.id);
    // Pending payments are re-checked with Midtrans (at most a few rows).
    const refreshed = await Promise.all(
      rows.map((b) => (b.payment_status === "pending" ? refreshPendingPayment(b) : Promise.resolve(b)))
    );
    return NextResponse.json({ ok: true, bookings: refreshed.map(toPublicBooking) });
  } catch (err) {
    logStorageError(storageErrorFromThrown("list_user_bookings", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
