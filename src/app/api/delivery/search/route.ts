import { NextResponse } from "next/server";
import { normalizeDeliveryPlaces, type DeliveryPlace } from "@/lib/deliveryPlaces";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const requests = new Map<string, { count: number; until: number }>();
const cache = new Map<string, { places: DeliveryPlace[]; until: number }>();
let queue = Promise.resolve();
let lastStarted = 0;
let active = 0;
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = requests.get(ip) ?? { count: 0, until: now + 60000 };
  if (++limit.count > 10 || requests.size > 2000 || active >= 4) return NextResponse.json({ ok: false, message: "Please wait a moment before searching again." }, { status: 429 });
  requests.set(ip, limit);
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim().replace(/\s+/g, " ") : "";
  if (query.length < 3 || query.length > 160 || /[\x00-\x1f]/.test(query)) return NextResponse.json({ ok: false, message: "Enter a hotel, villa or street in Bali (3–160 characters)." }, { status: 422 });
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.until > now) return NextResponse.json({ ok: true, places: cached.places }, { headers: { "Cache-Control": "no-store" } });
  active++;
  try {
    // Deliberate Search taps only. Serialize and cache to keep public-provider traffic modest.
    const task = queue.then(async () => {
      const wait = Math.max(0, lastStarted + 1100 - Date.now());
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      lastStarted = Date.now();
      const params = new URLSearchParams({ q: query, bbox: "114.4,-9,115.8,-8", limit: "5", lang: "en", lat: "-8.65", lon: "115.2" });
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, { headers: { "User-Agent": "Werigo/1.0 (+https://werigo.co/contact)" }, signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!response.ok) throw new Error("Search unavailable");
      return normalizeDeliveryPlaces(await response.json());
    });
    queue = task.then(() => {}, () => {});
    const places = await task;
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    const entry = { places, until: Date.now() + 15 * 60000 };
    cache.set(key, entry);
    setTimeout(() => { if (cache.get(key) === entry) cache.delete(key); }, 15 * 60000).unref();
    return NextResponse.json({ ok: true, places }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Address search is unavailable. Use GPS or move the map pin instead." }, { status: 503 });
  } finally { active--; }
}
