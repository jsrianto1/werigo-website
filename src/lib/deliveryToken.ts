import { createHmac, timingSafeEqual } from "node:crypto";

export interface DeliveryRouteQuote {
  version: 1;
  area: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  expiresAt: number;
}
const scope = "werigo-delivery-v1:";
export function signDeliveryQuote(quote: DeliveryRouteQuote, secret: string): string {
  if (secret.length < 32) throw new Error("Delivery signing unavailable");
  const payload = Buffer.from(JSON.stringify(quote)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(scope + payload).digest("base64url")}`;
}
export function verifyDeliveryQuote(token: string, area: string, secret: string, now = Date.now()): DeliveryRouteQuote | null {
  try {
    if (secret.length < 32 || token.length > 1500) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", secret).update(scope + payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.version !== 1 || value.area !== area || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 31 * 60000) return null;
    if (!Number.isFinite(value.distanceMeters) || value.distanceMeters < 0 || value.distanceMeters > 250000) return null;
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || value.latitude < -9 || value.latitude > -8 || value.longitude < 114.4 || value.longitude > 115.8) return null;
    return value;
  } catch { return null; }
}
