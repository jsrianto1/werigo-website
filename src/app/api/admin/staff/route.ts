import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fieldErrors, isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { createStaff, listStaff, StaffError } from "@/lib/staff";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  try {
    return NextResponse.json({ ok: true, staff: await listStaff(), me: admin.id });
  } catch (err) {
    return storageFailed("admin_staff_list", err);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the name.").max(100),
  email: z.email("Enter a valid email."),
  role: z.enum(["admin", "super_admin"]),
  tempPassword: z.string().min(10, "At least 10 characters.").max(128),
});

/** Create a staff account with a temporary password (super admin). */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) }, { status: 422 });
  try {
    const staff = await createStaff(parsed.data);
    await logAudit({ actor: admin, action: "staff.create", entityType: "staff", entityId: staff.email, meta: { role: staff.role }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, staff }, { status: 201 });
  } catch (err) {
    if (err instanceof StaffError && err.reason === "email_taken") {
      return NextResponse.json({ ok: false, error: "validation", fieldErrors: { email: "An account with this email already exists." } }, { status: 409 });
    }
    return storageFailed("admin_staff_create", err);
  }
}
