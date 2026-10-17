/** Temporary delivery pin. Never put precise coordinates in app navigation URLs. */
export const APP_PICKUP_KEY = "werigo.app.pickup.v1";
export const PICKUP_MAX_AGE = 30 * 60 * 1000;
export interface AppPickup { version: 1; area: string; mapsUrl: string; savedAt: number; label?: string; accuracy?: number; route?: { distanceMeters: number; token: string | null; expiresAt: number }; point?: { latitude: number; longitude: number }; }
export interface GpsPoint { latitude: number; longitude: number; accuracy: number; }
export function googleMapsSearch(query: string) { return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`; }
export function googleMapsDirections(destination: string) { return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination, travelmode: "driving" })}`; }
export function validMapsUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.href.length > 350) return null;
    const allowed = url.hostname === "maps.app.goo.gl" || url.hostname === "maps.google.com" || (url.hostname === "www.google.com" || url.hostname === "google.com") && url.pathname.startsWith("/maps") || url.hostname === "goo.gl" && url.pathname.startsWith("/maps");
    return allowed ? url.href : null;
  } catch { return null; }
}
export function isBaliLocation(point: GpsPoint) { return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && point.latitude >= -9 && point.latitude <= -8 && point.longitude >= 114.4 && point.longitude <= 115.8; }
export function gpsError(code: number) { return code === 1 ? "Location access was denied. Allow location in your browser settings, or paste a Google Maps link below." : code === 3 ? "GPS timed out. Try again outdoors, or paste your Google Maps link." : "Your location is unavailable. Try again or paste a Google Maps link."; }
export function requestGps(geo: Pick<Geolocation, "getCurrentPosition"> | undefined): Promise<GpsPoint> {
  return new Promise((resolve, reject) => {
    if (!geo) { reject(new Error("GPS is not supported in this browser. Paste a Google Maps link instead.")); return; }
    geo.getCurrentPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;
      if (![latitude, longitude, accuracy].every(Number.isFinite)) { reject(new Error("Your GPS returned an invalid location. Please try again.")); return; }
      resolve({ latitude, longitude, accuracy });
    }, error => reject(new Error(gpsError(error.code))), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
export function readAppPickup(storage: Pick<Storage, "getItem">, area: string, now = Date.now()): AppPickup | null {
  try {
    const value = JSON.parse(storage.getItem(APP_PICKUP_KEY) || "null");
    if (!value || value.version !== 1 || value.area !== area || !validMapsUrl(value.mapsUrl) || !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt > PICKUP_MAX_AGE) return null;
    if (value.point && !isBaliLocation({ ...value.point, accuracy: 0 })) return null;
    if (value.label !== undefined && (typeof value.label !== "string" || value.label.length > 240)) return null;
    if (value.route && (!Number.isFinite(value.route.distanceMeters) || value.route.distanceMeters < 0 || value.route.distanceMeters > 250000 || !Number.isFinite(value.route.expiresAt) || value.route.expiresAt <= now || (value.route.token !== null && typeof value.route.token !== "string"))) return null;
    return value;
  } catch { return null; }
}
export function saveAppPickup(storage: Pick<Storage, "setItem">, pickup: AppPickup) { storage.setItem(APP_PICKUP_KEY, JSON.stringify(pickup)); }
export function clearAppPickup(storage: Pick<Storage, "removeItem">) { storage.removeItem(APP_PICKUP_KEY); }
