import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { computeQuote, periodFromIso } from "@/lib/quote";
import { resolveDiscounts } from "@/lib/discounts";
import { logStorageError, storageErrorFromThrown } from "@/lib/storageErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Discount options for a checkout: what the signed-in customer can use
 * on this booking, with rupiah values and the best one marked. The
 * booking API recomputes the same thing when charging.
 */
const bodySchema = z.object({
  vehicleModel: z.enum(["bees", "victory", "athena", "edpower"]),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  quantity: z.number().int().min(1).max(10),
  pickupArea: z.string().trim().max(60),
  returnArea: z.string().trim().max(60),
  code: z.string().trim().max(40).optional().default(""),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const d = parsed.data;
  const quote = computeQuote({
    modelSlug: d.vehicleModel,
    period: periodFromIso(d.startAt, d.endAt),
    quantity: d.quantity,
    pickupSlug: d.pickupArea,
    returnSlug: d.returnArea,
  });
  if (!quote) return NextResponse.json({ ok: false, error: "quote_unavailable" }, { status: 422 });
  try {
    const r = await resolveDiscounts({
      userId: user.id,
      modelSlug: d.vehicleModel,
      rentalIdr: quote.baseIdr,
      code: d.code || null,
    });
    return NextResponse.json({
      ok: true,
      rentalIdr: quote.baseIdr,
      bestKey: r.bestKey,
      codeStatus: r.codeStatus,
      options: r.options.map((o) => ({
        key: o.key,
        kind: o.kind,
        code: o.code,
        title: o.title,
        description: o.description,
        label: o.label,
        discountIdr: o.discountIdr,
        endsAt: o.endsAt,
      })),
    });
  } catch (err) {
    logStorageError(storageErrorFromThrown("checkout_discounts", err));
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 503 });
  }
}
