import { isBaliLocation } from "./appPickup.ts";

export interface DeliveryPlace { label: string; latitude: number; longitude: number; }
export const deliveryAreaCenters: Record<string, { latitude: number; longitude: number }> = {
  canggu: { latitude: -8.6478, longitude: 115.1385 }, seminyak: { latitude: -8.684, longitude: 115.161 }, kuta: { latitude: -8.722, longitude: 115.172 }, ubud: { latitude: -8.5069, longitude: 115.2625 }, uluwatu: { latitude: -8.815, longitude: 115.105 }, jimbaran: { latitude: -8.771, longitude: 115.171 }, sanur: { latitude: -8.69, longitude: 115.26 }, denpasar: { latitude: -8.6359252, longitude: 115.2213422 }, "airport-domestic": { latitude: -8.7468, longitude: 115.167 }, "airport-international": { latitude: -8.7484, longitude: 115.1633 },
};
/** Internal booking category only; the fee always follows the verified road route. */
export function inferDeliveryArea(point: { latitude: number; longitude: number }): string {
  if (!isBaliLocation({ ...point, accuracy: 0 })) throw new Error("Choose a delivery location in Bali.");
  return Object.entries(deliveryAreaCenters).sort(([, a], [, b]) =>
    ((a.latitude - point.latitude) ** 2 + (a.longitude - point.longitude) ** 2) -
    ((b.latitude - point.latitude) ** 2 + (b.longitude - point.longitude) ** 2))[0][0];
}
export function normalizeDeliveryPlaces(data: unknown): DeliveryPlace[] {
  if (!data || typeof data !== "object" || !("features" in data) || !Array.isArray(data.features)) return [];
  const results: DeliveryPlace[] = [];
  for (const feature of data.features.slice(0, 12)) {
    if (!Array.isArray(feature?.geometry?.coordinates)) continue;
    const [longitude, latitude] = feature.geometry.coordinates;
    if (!isBaliLocation({ latitude, longitude, accuracy: 0 })) continue;
    const p = feature.properties ?? {};
    const parts = [p.name, [p.street, p.housenumber].filter(Boolean).join(" "), p.district, p.city, p.county, p.state];
    const label = [...new Set(parts.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))].join(", ").slice(0, 240);
    if (!label || results.some(value => value.label === label && value.latitude === latitude && value.longitude === longitude)) continue;
    results.push({ label, latitude, longitude });
    if (results.length === 5) break;
  }
  return results;
}
