import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getCustomerStore } from "@/lib/customerStore";
import { parseCustomerQuery } from "@/lib/adminQuery";
import { logStorageError, storageErrorFromThrown } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/** Every form fill, newest first, for the Submissions tab. */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await getCustomerStore().listSubmissions(
      parseCustomerQuery(req.nextUrl.searchParams)
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_list_submissions", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
