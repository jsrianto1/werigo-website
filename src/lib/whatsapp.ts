import { site, formatIDR } from "@/lib/config";
import type { BookingRecord } from "@/lib/booking";
import { getVehicle } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { getExtra } from "@/data/extras";

/**
 * Builds a wa.me deep link with a professionally formatted booking
 * summary. The business number lives in src/lib/config.ts
 * (NEXT_PUBLIC_WHATSAPP_NUMBER).
 */
export function buildBookingWhatsAppUrl(record: BookingRecord): string {
  const vehicle = record.vehicleSlug ? getVehicle(record.vehicleSlug) : undefined;
  const pickup = getArea(record.search.pickupSlug);
  const ret = getArea(record.search.returnSlug || record.search.pickupSlug);

  const extras = record.extras
    .map((e) => {
      const def = getExtra(e.id);
      return def ? `• ${def.name} × ${e.quantity}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const lines = [
    `*Werigo Booking Request*`,
    ``,
    `Reference: ${record.reference}`,
    `Name: ${record.customer.fullName}`,
    ``,
    `*Ride*`,
    `${vehicle ? vehicle.name : "—"} × ${record.quantity}`,
    ``,
    `*Rental period*`,
    `From: ${record.search.startDate} ${record.search.startTime}`,
    `To: ${record.search.endDate} ${record.search.endTime}`,
    ``,
    `*Pick-up / delivery*`,
    `${pickup ? pickup.name : record.search.pickupSlug}${
      record.customer.hotelName ? ` — ${record.customer.hotelName}` : ""
    }`,
    `*Return*`,
    `${ret ? ret.name : "Same as pick-up"}`,
    ...(extras ? [``, `*Extras*`, extras] : []),
    ``,
    `*Estimated total*`,
    formatIDR(record.totalIDR),
    ...(record.customer.specialRequest
      ? [``, `*Special request*`, record.customer.specialRequest]
      : []),
  ];

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}

/** Generic "chat with us" link for support surfaces. */
export function buildSupportWhatsAppUrl(message?: string): string {
  const text = encodeURIComponent(
    message ?? "Hi Werigo! I have a question about renting an electric motorcycle in Bali."
  );
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}
