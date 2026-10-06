import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireAdmin, storageFailed } from "@/lib/adminApi";
import { getPromotion, grantVoucher } from "@/lib/promotions";
import { getPool } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

const schema = z.object({ promotionId: z.uuid() });

/** Give one customer an assigned voucher (all staff). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  try {
    const promotion = await getPromotion(parsed.data.promotionId);
    if (!promotion || promotion.audience !== "assigned") {
      return NextResponse.json({ ok: false, error: "not_assigned", message: "Choose a voucher (audience: given to customers)." }, { status: 409 });
    }
    const u = await getPool().query('select email from "user" where id = $1', [id]);
    if (!u.rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const result = await grantVoucher(promotion.id, { kind: "emails", emails: [u.rows[0].email] }, admin.email);
    await logAudit({ actor: admin, action: "customer.voucher", entityType: "customer", entityId: id, meta: { code: promotion.code, granted: result.granted }, ip: requestIp(req) });
    return NextResponse.json({ ok: true, granted: result.granted, code: promotion.code });
  } catch (err) {
    return storageFailed("admin_customer_voucher", err);
  }
}
