import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { StaffError, updateStaff } from "@/lib/staff";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  role: z.enum(["admin", "super_admin"]).optional(),
  active: z.boolean().optional(),
  tempPassword: z.string().min(10).max(128).optional(),
  revokeSessions: z.boolean().optional(),
});

const MESSAGES: Record<StaffError["reason"], string> = {
  self: "You cannot deactivate or demote your own account.",
  last_super_admin: "Keep at least one active super admin.",
  not_found: "Staff member not found.",
  not_staff: "This account is not a staff account.",
  email_taken: "Email already in use.",
};

/** Change role, deactivate/activate, set a temporary password, sign out everywhere (super admin). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    const staff = await updateStaff(id, admin.id, parsed.data);
    const { tempPassword, ...meta } = parsed.data;
    await logAudit({ actor: admin, action: "staff.update", entityType: "staff", entityId: staff.email, meta: { ...meta, passwordReset: Boolean(tempPassword) }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, staff });
  } catch (err) {
    if (err instanceof StaffError) {
      return NextResponse.json({ ok: false, error: err.reason, message: MESSAGES[err.reason] }, { status: err.reason === "not_found" ? 404 : 409 });
    }
    return storageFailed("admin_staff_update", err);
  }
}
