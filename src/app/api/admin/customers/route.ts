import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getCustomerStore } from "@/lib/customerStore";
import { parseCustomerQuery } from "@/lib/adminQuery";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Customer list for /admin/customers. Not gated by the booking mode:
 * form capture runs whichever way bookings are handled.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await getCustomerStore().listCustomers(
      parseCustomerQuery(req.nextUrl.searchParams)
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_list_customers", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
