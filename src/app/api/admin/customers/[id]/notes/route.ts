import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { addCustomerNote } from "@/lib/customers";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

const schema = z.object({ body: z.string().trim().min(1, "Write something.").max(2000) });

/** Internal note about a customer (all staff). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    const note = await addCustomerNote(id, admin.email, parsed.data.body);
    await logAudit({ actor: admin, action: "customer.note", entityType: "customer", entityId: id, ip: requestIp(req) });
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (err) {
    return storageFailed("admin_customer_note", err);
  }
}
