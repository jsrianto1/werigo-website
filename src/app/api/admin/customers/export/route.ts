import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import {
  getCustomerStore,
  type StoredCustomer,
  type StoredSubmission,
} from "@/lib/customerStore";
import { parseCustomerQuery, csvEscape } from "@/lib/adminQuery";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * CSV export of the customer database, honouring the filters shown in
 * the dashboard. `entity=customers` (default) exports one row per
 * person; `entity=submissions` exports one row per form fill,
 * including everything the visitor typed.
 */

const CUSTOMER_COLUMNS: (keyof StoredCustomer)[] = [
  "created_at", "last_seen_at", "status", "full_name", "email",
  "whatsapp_number", "nationality", "submissions_count",
  "booking_requests_count", "contact_messages_count", "first_source_page",
  "last_source_page", "utm_source", "utm_medium", "utm_campaign",
  "privacy_consent_at", "marketing_consent", "assigned_to", "internal_notes",
];

const SUBMISSION_COLUMNS: (keyof StoredSubmission)[] = [
  "reference_code", "created_at", "form_type", "status", "full_name",
  "email", "whatsapp_number", "nationality", "message", "vehicle_model",
  "quantity", "pickup_area", "pickup_address", "return_area", "hotel_name",
  "flight_number", "start_at", "end_at", "rental_days", "rate_per_day_idr",
  "estimated_total_idr", "promo_code", "extras", "terms_accepted",
  "battery_ack", "age_confirmed", "privacy_consent_at", "handoff_channel",
  "source_page", "referrer", "locale", "utm_source", "utm_medium",
  "utm_campaign", "details", "internal_notes",
];

function toCsv(columns: readonly string[], rows: Record<string, unknown>[]) {
  return [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => csvEscape(r[c])).join(",")),
  ].join("\r\n");
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const q = parseCustomerQuery(req.nextUrl.searchParams);
  const submissions = req.nextUrl.searchParams.get("entity") === "submissions";
  try {
    const store = getCustomerStore();
    const csv = submissions
      ? toCsv(
          SUBMISSION_COLUMNS as string[],
          (await store.exportSubmissions(q)) as unknown as Record<string, unknown>[]
        )
      : toCsv(
          CUSTOMER_COLUMNS as string[],
          (await store.exportCustomers(q)) as unknown as Record<string, unknown>[]
        );
    const name = submissions ? "submissions" : "customers";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="werigo-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_export_customers", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
