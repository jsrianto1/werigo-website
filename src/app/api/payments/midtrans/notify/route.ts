import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchTransactionStatus, isMidtransConfigured, verifyNotificationSignature } from "@/lib/midtrans";
import { syncPaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Midtrans HTTP notification (webhook). Set in the Midtrans dashboard
 * as `${NEXT_PUBLIC_SITE_URL}/api/payments/midtrans/notify`.
 *
 * Trust model: the signature must match AND the status is re-fetched
 * from Midtrans before anything changes. Midtrans retries on non-2xx,
 * so a transient failure answers 503 and a bad signature 403.
 */
const notificationSchema = z.object({
  order_id: z.string().min(1).max(100),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(30),
  signature_key: z.string().length(128),
  transaction_status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isMidtransConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const parsed = notificationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const n = parsed.data;
  if (!verifyNotificationSignature(n)) {
    console.warn(`[payments] notification with bad signature for ${n.order_id}`);
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 403 });
  }

  let status;
  try {
    status = await fetchTransactionStatus(n.order_id);
  } catch (err) {
    console.error(`[payments] status fetch failed for ${n.order_id}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return NextResponse.json({ ok: false, error: "status_unavailable" }, { status: 503 });
  }
  if (!status) {
    // Unknown to Midtrans: nothing to apply, and nothing to retry.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const { booking, outcome } = await syncPaymentStatus(n.order_id, status, "midtrans");
    return NextResponse.json({ ok: true, outcome, known: Boolean(booking) });
  } catch (err) {
    console.error(`[payments] apply failed for ${n.order_id}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return NextResponse.json({ ok: false, error: "apply_failed" }, { status: 503 });
  }
}
