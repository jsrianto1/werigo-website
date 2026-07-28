import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getBookingStore, type BookingListQuery, type StoredBooking } from "@/lib/bookingStore";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";

const COLUMNS: (keyof StoredBooking)[] = [
  "booking_code", "created_at", "status", "full_name", "whatsapp_number",
  "email", "nationality", "vehicle_model", "quantity", "pickup_area",
  "pickup_address", "return_area", "return_address", "start_at", "end_at",
  "delivery_method", "customer_notes", "source_page", "utm_source",
  "utm_medium", "utm_campaign", "assigned_to", "internal_notes",
  "follow_up_at",
];

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const p = req.nextUrl.searchParams;
  const q: BookingListQuery = {
    search: p.get("search") ?? undefined,
    status: p.get("status") ?? undefined,
    model: p.get("model") ?? undefined,
    pickupArea: p.get("pickupArea") ?? undefined,
    source: p.get("source") ?? undefined,
    dateFrom: p.get("dateFrom") ?? undefined,
    dateTo: p.get("dateTo") ?? undefined,
    sort: p.get("sort") === "oldest" ? "oldest" : "newest",
  };
  try {
    const rows = await getBookingStore().exportRows(q);
    const lines = [
      COLUMNS.join(","),
      ...rows.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(",")),
    ];
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="werigo-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_export", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
