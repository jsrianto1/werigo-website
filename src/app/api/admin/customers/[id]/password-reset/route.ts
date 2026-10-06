import { NextRequest, NextResponse } from "next/server";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Email the customer a link to set a new password (super admin). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  try {
    const u = await getPool().query('select email from "user" where id = $1 and coalesce(role, $2) = $2', [id, "customer"]);
    if (!u.rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    await auth.api.requestPasswordReset({ body: { email: u.rows[0].email, redirectTo: "/account/reset-password" } });
    await logAudit({ actor: admin, action: "customer.password_reset", entityType: "customer", entityId: id, ip: requestIp(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailed("admin_customer_password_reset", err);
  }
}
