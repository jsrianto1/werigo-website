import { site } from "@/lib/config";
import { toCustomerEntry } from "@/data/vehicles";
import { getArea } from "@/data/locations";

/**
 * "Check availability and rates" link for a specific Wedison model —
 * used on product pages before dates are known.
 */
export function buildModelInquiryWhatsAppUrl(entryId: string): string {
  const entry = toCustomerEntry(entryId);
  const name = entry ? entry.displayName : "a Wedison motorcycle";
  const text = encodeURIComponent(
    `Hi Werigo! I'd like to check availability and rates for the ${name}. My dates and delivery area are:`
  );
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}

/**
 * WhatsApp continuation link for a booking that has been successfully
 * stored in the database. Includes the database booking code and the
 * submitted details — built server-side, returned only after insert.
 */
export function buildStoredBookingWhatsAppUrl(booking: {
  booking_code: string;
  full_name: string;
  vehicle_model: string;
  quantity: number;
  pickup_area: string;
  pickup_address: string | null;
  return_area: string;
  return_address: string | null;
  start_at: string;
  end_at: string;
  customer_notes: string | null;
}): string {
  const entry = toCustomerEntry(booking.vehicle_model);
  const pickup = getArea(booking.pickup_area);
  const ret = getArea(booking.return_area);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const lines = [
    `*Werigo Booking Request*`,
    `_Powered by Wedison_`,
    ``,
    `Booking code: ${booking.booking_code}`,
    `Name: ${booking.full_name}`,
    ``,
    `*Ride*`,
    `${entry ? entry.displayName : booking.vehicle_model} × ${booking.quantity}`,
    ``,
    `*Rental period*`,
    `From: ${fmt(booking.start_at)}`,
    `To: ${fmt(booking.end_at)}`,
    ``,
    `*Pick-up / delivery*`,
    `${pickup?.name ?? booking.pickup_area}${
      booking.pickup_address ? `, ${booking.pickup_address}` : ""
    }`,
    `*Return*`,
    `${
      booking.return_area !== booking.pickup_area
        ? ret?.name ?? booking.return_area
        : "Same as pick-up"
    }${booking.return_address ? `, ${booking.return_address}` : ""}`,
    ``,
    `*Rate*`,
    `Please send me the rate and availability for these dates.`,
    ...(booking.customer_notes
      ? [``, `*Notes*`, booking.customer_notes]
      : []),
  ];
  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}

/**
 * TEMPORARY WhatsApp-first booking handoff (database disconnected).
 * Builds the full booking request as a wa.me URL entirely on the
 * client: no database insert and no booking code. Field names mirror
 * the checkout form; nothing here is logged or stored.
 */
export interface DirectBookingDetails {
  modelName: string;
  quantity: number;
  pickupAreaName: string;
  pickupAddress: string;
  returnAreaName: string;
  sameReturn: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  days: number;
  extras: { name: string; quantity: number }[];
  fullName: string;
  whatsapp: string;
  email: string;
  nationality?: string;
  flightNumber?: string;
  promoCode?: string;
  notes?: string;
}

export function buildDirectBookingWhatsAppUrl(d: DirectBookingDetails): string {
  const lines = [
    `*Werigo Booking Request*`,
    `_Powered by Wedison_`,
    ``,
    `*Ride*`,
    `${d.modelName} × ${d.quantity}`,
    ``,
    `*Rental period*`,
    `From: ${d.startDate} ${d.startTime}`,
    `To: ${d.endDate} ${d.endTime}`,
    `Duration: ${d.days} day${d.days === 1 ? "" : "s"}`,
    ``,
    `*Delivery*`,
    `${d.pickupAreaName}${d.pickupAddress ? `, ${d.pickupAddress}` : ""}`,
    `*Return*`,
    d.sameReturn ? `Same as delivery` : d.returnAreaName,
    ...(d.extras.length > 0
      ? [``, `*Extras*`, ...d.extras.map((e) => `${e.name} × ${e.quantity}`)]
      : []),
    ``,
    `*Contact*`,
    `Name: ${d.fullName}`,
    `WhatsApp: ${d.whatsapp}`,
    `Email: ${d.email}`,
    ...(d.nationality ? [`Nationality: ${d.nationality}`] : []),
    ...(d.flightNumber ? [`Flight: ${d.flightNumber}`] : []),
    ...(d.promoCode ? [`Promo code: ${d.promoCode}`] : []),
    ...(d.notes ? [``, `*Notes*`, d.notes] : []),
    ``,
    `*Rate*`,
    `Please send me availability and the rate for these dates.`,
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
