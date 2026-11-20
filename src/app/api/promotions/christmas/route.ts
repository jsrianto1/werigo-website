import { NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: true, offers: [] });
  try {
    const result = await getPool().query(`select code, title, description, discount_value as percent, ends_at
      from public.promotions where code in ('NEWCHRISTMAS','CHRISTMAS26')
      and active and starts_at<=now() and ends_at>now() and discount_type='percent'
      order by discount_value desc`);
    return NextResponse.json({ ok: true, offers: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ ok: true, offers: [] }, { headers: { "Cache-Control": "no-store" } }); }
}
