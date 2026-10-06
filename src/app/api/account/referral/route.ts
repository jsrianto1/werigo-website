import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { referralSummary } from "@/lib/referrals";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in customer's referral code, earnings and payouts. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, referral: await referralSummary(user.id, user.name) });
  } catch (err) {
    logStorageError(storageErrorFromThrown("referral_summary", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
