import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { clearMustChangePassword, listOwnSessions, revokeOtherSessions } from "@/lib/staff";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

async function currentToken(): Promise<string | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s?.session.token ?? null;
}

/** The signed-in staff member: profile and active sessions. */
export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ ok: true, me: admin, sessions: await listOwnSessions(admin.id, await currentToken()) });
  } catch (err) {
    return storageFailed("admin_me", err);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  /** Set by the profile page right after a successful password change. */
  passwordChanged: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    if (parsed.data.name) await getPool().query('update "user" set name = $2 where id = $1', [admin.id, parsed.data.name]);
    if (parsed.data.passwordChanged) {
      await clearMustChangePassword(admin.id);
      await logAudit({ actor: admin, action: "admin.password_changed", entityType: "staff", entityId: admin.email, ip: requestIp(req) });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailed("admin_me_update", err);
  }
}

/** Sign out every other device. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    const revoked = await revokeOtherSessions(admin.id, await currentToken());
    await logAudit({ actor: admin, action: "admin.sessions_revoked", entityType: "staff", entityId: admin.email, meta: { revoked }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, revoked });
  } catch (err) {
    return storageFailed("admin_me_sessions", err);
  }
}
