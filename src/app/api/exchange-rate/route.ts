import { NextResponse } from "next/server";
import { getUsdIdrRate } from "@/lib/exchangeRate";

export const runtime = "nodejs";

/**
 * Cached USD to IDR reference rate for client components (search
 * results, checkout). The upstream call is made server-side and
 * cached for 6 hours; browsers and the CDN may cache this response
 * too. Returns { rate: null } on failure so clients quietly show
 * IDR only.
 */
export async function GET() {
  const rate = await getUsdIdrRate();
  return NextResponse.json(rate ?? { rate: null, date: null }, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
