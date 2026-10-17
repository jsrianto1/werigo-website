import { site } from "@/lib/config";

type Route = { distanceMeters: number; expiresAt: number };
const cache = new Map<string, Promise<Route>>();
let lastStarted = 0;
let queue = Promise.resolve();

/** FOSSGIS public router: serialize requests, max one per second, cache repeated pins. */
export async function roadDistance(latitude: number, longitude: number): Promise<Route> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const existing = cache.get(key);
  if (existing) {
    const route = await existing;
    if (route.expiresAt > Date.now()) return route;
    cache.delete(key);
  }
  const pending = queue.then(async () => {
    const delay = Math.max(0, lastStarted + 1100 - Date.now());
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastStarted = Date.now();
    const points = `${site.geo.longitude},${site.geo.latitude};${longitude.toFixed(6)},${latitude.toFixed(6)}`;
    const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${points}?overview=false&steps=false&alternatives=false`, {
      headers: { "User-Agent": "Werigo/1.0 (+https://werigo.co/contact)", Referer: site.baseUrl },
      signal: AbortSignal.timeout(10000), cache: "no-store",
    });
    if (!response.ok) throw new Error("Road route unavailable");
    const data = await response.json();
    const metres = data?.routes?.[0]?.distance;
    if (data.code !== "Ok" || !Number.isFinite(metres) || metres < 0 || metres > 250000 || data.waypoints?.length !== 2 || data.waypoints.some((p: { distance?: number }) => !Number.isFinite(p.distance) || p.distance! > 500)) throw new Error("No suitable road route to this pin");
    return { distanceMeters: metres, expiresAt: Date.now() + 10 * 60000 };
  });
  queue = pending.then(() => {}, () => {});
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, pending);
  try { return await pending; } catch (error) { cache.delete(key); throw error; }
}
