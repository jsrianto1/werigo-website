import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { createPromotion, listPromotions, PromotionCodeTakenError } from "@/lib/promotions";
import { promotionExistsWithCodeOrReferral, promotionErrors } from "@/lib/promotionAdmin";
import { promotionInputSchema } from "@/lib/promotionRules";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, promotions: await listPromotions() });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_list_promotions", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = promotionInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", fieldErrors: promotionErrors(parsed.error) }, { status: 422 });
  }
  try {
    if (await promotionExistsWithCodeOrReferral(parsed.data.code)) {
      return NextResponse.json({ ok: false, error: "validation", fieldErrors: { code: "This code is already in use." } }, { status: 409 });
    }
    const promotion = await createPromotion(parsed.data, admin.email);
    await logAudit({ actor: admin, action: "promotion.create", entityType: "promotion", entityId: promotion.code, meta: parsed.data, ip: requestIp(req) });
    return NextResponse.json({ ok: true, promotion }, { status: 201 });
  } catch (err) {
    if (err instanceof PromotionCodeTakenError) {
      return NextResponse.json({ ok: false, error: "validation", fieldErrors: { code: "This code is already in use." } }, { status: 409 });
    }
    logStorageError(storageErrorFromThrown("admin_create_promotion", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
