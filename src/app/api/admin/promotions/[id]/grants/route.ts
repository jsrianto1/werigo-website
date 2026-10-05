import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { getPromotion, grantVoucher, type GrantTarget } from "@/lib/promotions";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("never_booked") }),
  z.object({ kind: z.literal("booked_at_least"), count: z.number().int().min(1).max(100) }),
  z.object({
    kind: z.literal("emails"),
    emails: z.array(z.email().trim().toLowerCase()).min(1).max(1000),
  }),
]);

/** Give an assigned voucher to a group of customers. */
export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = targetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", message: "Check the target. Emails must be valid addresses." }, { status: 422 });
  }
  try {
    const promotion = await getPromotion(id);
    if (!promotion) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (promotion.audience !== "assigned") {
      return NextResponse.json(
        { ok: false, error: "not_assigned", message: "Only vouchers (audience: given to customers) can be granted." },
        { status: 409 }
      );
    }
    const result = await grantVoucher(id, parsed.data as GrantTarget, admin.email);
    await logAudit({
      actor: admin,
      action: "promotion.grant",
      entityType: "promotion",
      entityId: promotion.code,
      meta: { target: parsed.data.kind, matched: result.matched, granted: result.granted },
      ip: requestIp(req),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_grant_voucher", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
