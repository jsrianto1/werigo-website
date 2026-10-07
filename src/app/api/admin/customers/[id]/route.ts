import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { getCustomerDetail, setCustomerStatus } from "@/lib/customers";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  try {
    const detail = await getCustomerDetail(id);
    if (!detail) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...detail, canManage: admin.role === "super_admin" });
  } catch (err) {
    return storageFailed("admin_customer_detail", err);
  }
}

const statusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("active") }),
  z.object({ status: z.literal("suspended"), until: z.iso.datetime({ offset: true }), reason: z.string().trim().min(3).max(300) }),
  z.object({ status: z.literal("blocked"), reason: z.string().trim().min(3).max(300) }),
]);

/** Suspend, block or reactivate a customer (super admin). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin({ superOnly: true });
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", message: "Give a reason (3 to 300 characters) and, for a suspension, an end date." }, { status: 422 });
  }
  if (parsed.data.status === "suspended" && new Date(parsed.data.until).getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, error: "validation", message: "The suspension must end in the future." }, { status: 422 });
  }
  try {
    const result = await setCustomerStatus(id, parsed.data);
    await logAudit({ actor: admin, action: `customer.${parsed.data.status}`, entityType: "customer", entityId: id, meta: parsed.data, ip: requestIp(req) });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return storageFailed("admin_customer_status", err);
  }
}
