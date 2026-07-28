import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getBookingStore, type BookingListQuery } from "@/lib/bookingStore";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";

export const runtime = "nodejs";

function parseQuery(req: NextRequest): BookingListQuery {
  const p = req.nextUrl.searchParams;
  return {
    search: p.get("search") ?? undefined,
    status: p.get("status") ?? undefined,
    model: p.get("model") ?? undefined,
    pickupArea: p.get("pickupArea") ?? undefined,
    source: p.get("source") ?? undefined,
    dateFrom: p.get("dateFrom") ?? undefined,
    dateTo: p.get("dateTo") ?? undefined,
    sort: p.get("sort") === "oldest" ? "oldest" : "newest",
    page: Number(p.get("page") ?? 1),
    pageSize: Number(p.get("pageSize") ?? 20),
  };
}

export async function GET(req: NextRequest) {
  if (WHATSAPP_FIRST_BOOKING) {
    return NextResponse.json({ ok: false, error: "storage_disabled" }, { status: 503 });
  }

  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await getBookingStore().list(parseQuery(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_list", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
