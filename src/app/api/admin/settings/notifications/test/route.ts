import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { isFonnteConfigured, sendTestMessage } from "@/lib/notifications";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ target: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{9,15}$/, "Use digits only, e.g. 628123456789.")) });

/** Send one test WhatsApp message now (super admin). */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  if (!isFonnteConfigured()) return NextResponse.json({ ok: false, error: "not_configured", message: "FONNTE_TOKEN is not set on the server." }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", message: parsed.error.issues[0]?.message }, { status: 422 });
  try {
    const result = await sendTestMessage(parsed.data.target, admin.email);
    await logAudit({ actor: admin, action: "settings.notifications.test", entityType: "settings", entityId: "notifications", meta: { target: parsed.data.target, ...result }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return storageFailed("admin_notification_test", err);
  }
}
