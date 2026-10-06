import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/adminAuth";
import { processPayout } from "@/lib/referrals";
import { getPool } from "@/lib/db";
import { notifyPayoutPaid } from "@/lib/notifications";
import { logAudit, requestIp } from "@/lib/audit";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  action: z.enum(["paid", "rejected"]),
  note: z.string().trim().max(300).optional().transform((v) => v || null),
});

/**
 * Close a payout request after transferring the money manually
 * ("paid"), or reject it (earnings go back to the available balance).
 * Super admin only.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  if (parsed.data.action === "rejected" && !parsed.data.note) {
    return NextResponse.json({ ok: false, error: "validation", message: "Add a reason so the customer knows why." }, { status: 422 });
  }
  try {
    const payout = await processPayout(id, parsed.data.action, admin.email, parsed.data.note);
    if (!payout) return NextResponse.json({ ok: false, error: "not_open", message: "This request was already processed." }, { status: 409 });
    await logAudit({
      actor: admin,
      action: `payout.${parsed.data.action}`,
      entityType: "payout",
      entityId: payout.id,
      meta: { amountIdr: payout.amountIdr, customer: payout.customerEmail, note: parsed.data.note },
      ip: requestIp(req),
    });
    if (parsed.data.action === "paid") {
      const u = await getPool().query('select phone from "user" where id = $1', [payout.userId]).catch(() => null);
      await notifyPayoutPaid({
        whatsapp: u?.rows[0]?.phone ?? null,
        name: payout.customerName,
        amountIdr: payout.amountIdr,
        bankName: payout.bankName,
      });
    }
    return NextResponse.json({ ok: true, payout });
  } catch (err) {
    logStorageError(storageErrorFromThrown("admin_process_payout", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
