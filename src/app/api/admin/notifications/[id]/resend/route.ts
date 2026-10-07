import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { resendNotification } from "@/lib/notifications";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  try {
    const ok = await resendNotification(id);
    if (!ok) return NextResponse.json({ ok: false, error: "not_resendable", message: "Already sent or not found." }, { status: 409 });
    await logAudit({ actor: admin, action: "notification.resend", entityType: "notification", entityId: id, ip: requestIp(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailed("admin_notification_resend", err);
  }
}
