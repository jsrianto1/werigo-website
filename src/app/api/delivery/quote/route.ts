import { NextResponse } from "next/server";
import { z } from "zod";
import { getPickupPoint } from "@/data/locations";
import { roadDistance } from "@/lib/deliveryRoute";
import { signDeliveryQuote } from "@/lib/deliveryToken";
import { deliveryFeeIdr } from "@/lib/deliveryPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bodySchema = z.object({
  area: z.string().max(60).refine(value => value !== "showroom" && Boolean(getPickupPoint(value))),
  latitude: z.number().min(-9).max(-8), longitude: z.number().min(114.4).max(115.8),
});
const requests = new Map<string, { count: number; until: number }>();
let active = 0;
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin) return NextResponse.json({ ok: false, error: "origin" }, { status: 403 });
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  for (const [ip, entry] of requests) if (entry.until < now) requests.delete(ip);
  const limit = requests.get(key) ?? { count: 0, until: now + 60000 };
  if (++limit.count > 12 || active >= 5 || requests.size > 2000) return NextResponse.json({ ok: false, error: "rate_limited", message: "Please wait a moment before calculating another route." }, { status: 429 });
  requests.set(key, limit);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 422 });
  active++;
  try {
    const { area, latitude, longitude } = parsed.data;
    const route = await roadDistance(latitude, longitude);
    const quote = { version: 1 as const, area, latitude, longitude, distanceMeters: route.distanceMeters, expiresAt: Date.now() + 30 * 60000 };
    const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";
    const token = secret.length >= 32 ? signDeliveryQuote(quote, secret) : null;
    return NextResponse.json({ ok: true, distanceMeters: quote.distanceMeters, feeIdr: deliveryFeeIdr(quote.distanceMeters), expiresAt: quote.expiresAt, token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "route_unavailable", message: "We couldn’t calculate a road route. Move the pin to an accessible entrance or request a quote from our team. Nothing will be charged automatically without a verified route." }, { status: 503 });
  } finally { active--; }
}
