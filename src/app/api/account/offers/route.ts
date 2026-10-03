import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { offersForUser } from "@/lib/offers";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Promotions the signed-in customer is eligible for (drives the checkout price). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, offers: await offersForUser(user.id) });
  } catch (err) {
    logStorageError(storageErrorFromThrown("offers", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
