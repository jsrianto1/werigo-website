import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { BOOKING_STATUSES, getBookingStore } from "@/lib/bookingStore";
import { logAudit, requestIp } from "@/lib/audit";
import { identityForBooking } from "@/lib/identity";
import { syncReferralForBooking } from "@/lib/referrals";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  internal_notes: z.string().max(5000).optional(),
  assigned_to: z.string().max(200).optional(),
  follow_up_at: z.iso.datetime({ offset: true }).nullable().optional(),
  /**
   * Staff-recorded payment outcome. "refunded" after a manual refund in
   * the Midtrans dashboard, "paid" for a payment received outside the
   * site (bank transfer). Super admin only.
   */
  payment_status: z.enum(["refunded", "paid"]).optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const result = await getBookingStore().get(id);
    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    // Renter documents for the handover check (staff only, detail view only).
    const identity = await identityForBooking(id).catch(() => null);
    return NextResponse.json({ ok: true, ...result, identity });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_get", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (parsed.data.payment_status && admin.role !== "super_admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const booking = await getBookingStore().update(id, parsed.data, admin.email);
    if (!booking) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    // Completed → referral earnings become available; cancelled/refunded → void.
    await syncReferralForBooking(booking);
    await logAudit({
      actor: admin,
      action: "booking.update",
      entityType: "booking",
      entityId: booking.booking_code,
      meta: parsed.data,
      ip: requestIp(req),
    });
    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_update", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
