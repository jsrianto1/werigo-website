import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { getNotificationSettings, notificationSettingsSchema, setNotificationSettings } from "@/lib/settings";
import { envAdminWhatsAppTargets, isFonnteConfigured } from "@/lib/notifications";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  try {
    const settings = await getNotificationSettings();
    const token = process.env.FONNTE_TOKEN?.trim() ?? "";
    return NextResponse.json({
      ok: true,
      settings,
      fonnte: { configured: isFonnteConfigured(), tokenHint: token ? `${token.slice(0, 4)}…${token.slice(-3)}` : null },
      envNumbers: envAdminWhatsAppTargets(),
    });
  } catch (err) {
    return storageFailed("admin_notification_settings", err);
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const raw = await req.json().catch(() => null);
  const cleaned = raw && typeof raw === "object"
    ? { ...raw, adminNumbers: Array.isArray(raw.adminNumbers) ? raw.adminNumbers.map((n: unknown) => String(n).replace(/\D/g, "")).filter(Boolean) : [] }
    : raw;
  const parsed = notificationSettingsSchema.safeParse(cleaned);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", message: "Numbers must be 9 to 15 digits (628…)." }, { status: 422 });
  try {
    const before = await getNotificationSettings();
    const settings = await setNotificationSettings(parsed.data, admin.email);
    await logAudit({ actor: admin, action: "settings.notifications", entityType: "settings", entityId: "notifications", meta: { before, after: settings }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return storageFailed("admin_notification_settings_update", err);
  }
}
