import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { listPayouts, listReferralEntries } from "@/lib/referrals";
import { getReferralSettings, referralSettingsSchema, setReferralSettings } from "@/lib/settings";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

/** Referral settings, earnings log and payout requests (all staff can view). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const [settings, entries, payouts] = await Promise.all([getReferralSettings(), listReferralEntries(), listPayouts()]);
    return NextResponse.json({ ok: true, settings, entries, payouts, canManage: admin.role === "super_admin" });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_referrals", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

/** Change referral percentages and the minimum payout (super admin). */
export async function PUT(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const parsed = referralSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    const before = await getReferralSettings();
    const settings = await setReferralSettings(parsed.data, admin.email);
    await logAudit({ actor: admin, action: "referral.settings", entityType: "settings", entityId: "referral", meta: { before, after: settings }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_referral_settings", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
