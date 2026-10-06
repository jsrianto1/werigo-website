import { NextResponse } from "next/server";
import { featuredPromotion } from "@/lib/promotions";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The campaign advertised in the site pop-up and top bar (public).
 * Only marketing fields; nothing about usage or customers.
 */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: true, promotion: null });
  try {
    const p = await featuredPromotion();
    return NextResponse.json(
      {
        ok: true,
        promotion: p
          ? {
              title: p.title,
              description: p.description,
              discountType: p.discount_type,
              discountValue: p.discount_value,
              firstBookingOnly: p.first_booking_only,
              endsAt: p.ends_at,
            }
          : null,
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ ok: true, promotion: null });
  }
}
