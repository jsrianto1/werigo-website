import { NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { listNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

/** Last 50 WhatsApp messages and their delivery status (super admin). */
export async function GET() {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ ok: true, notifications: await listNotifications(50) });
  } catch (err) {
    return storageFailed("admin_notifications", err);
  }
}
