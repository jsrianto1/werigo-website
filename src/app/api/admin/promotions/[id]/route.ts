import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { PromotionCodeTakenError, updatePromotion } from "@/lib/promotions";
import { promotionExistsWithCodeOrReferral, promotionErrors } from "@/lib/promotionAdmin";
import { promotionInputSchema } from "@/lib/promotionRules";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Replace a promotion's settings (the form always sends every field). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = promotionInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", fieldErrors: promotionErrors(parsed.error) }, { status: 422 });
  }
  try {
    if (await promotionExistsWithCodeOrReferral(parsed.data.code, id)) {
      return NextResponse.json({ ok: false, error: "validation", fieldErrors: { code: "This code is already in use." } }, { status: 409 });
    }
    const promotion = await updatePromotion(id, parsed.data);
    if (!promotion) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    await logAudit({ actor: admin, action: "promotion.update", entityType: "promotion", entityId: promotion.code, meta: parsed.data, ip: requestIp(req) });
    return NextResponse.json({ ok: true, promotion });
  } catch (err) {
    if (err instanceof PromotionCodeTakenError) {
      return NextResponse.json({ ok: false, error: "validation", fieldErrors: { code: "This code is already in use." } }, { status: 409 });
    }
    logStorageError(storageErrorFromThrown("admin_update_promotion", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
