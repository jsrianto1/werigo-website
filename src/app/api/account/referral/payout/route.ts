import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { PayoutError, requestPayout } from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";
import { notifyPayoutRequested } from "@/lib/notifications";
import { formatIdr } from "@/lib/pricing";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";

/** Ask for the available referral balance to be paid out by bank transfer. */
const bodySchema = z.object({
  bankName: z.string().trim().min(2, "Enter your bank.").max(60),
  accountNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{5,30}$/, "Enter the account number (digits only).")),
  accountName: z.string().trim().min(2, "Enter the account holder name.").max(100),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return NextResponse.json({ ok: false, error: "validation", fieldErrors }, { status: 422 });
  }
  try {
    const payout = await requestPayout(user.id, parsed.data);
    await notifyPayoutRequested({ customerName: user.name, amountIdr: payout.amountIdr });
    return NextResponse.json({ ok: true, payout });
  } catch (err) {
    if (err instanceof PayoutError) {
      const settings = await getReferralSettings().catch(() => null);
      return NextResponse.json(
        {
          ok: false,
          error: err.reason,
          message:
            err.reason === "open_request"
              ? "You already have a payout request in progress."
              : `You can request a payout once your available balance reaches ${settings ? formatIdr(settings.minPayoutIdr) : "the minimum"}.`,
        },
        { status: 409 }
      );
    }
    logStorageError(storageErrorFromThrown("request_payout", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
