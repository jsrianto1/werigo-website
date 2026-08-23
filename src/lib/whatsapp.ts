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
  /** Applied pricing tier label + range, e.g. "Weekly (7 to 13 days)". */
  tierLabel: string;
  /** Approved IDR per-day rate for the applied tier. */
  ratePerDayIdr: number;
  /** Base rental estimate: rate x actual days x quantity, IDR. */
  estimatedTotalIdr: number;
  /** Approximate USD for the base estimate; null when no rate. */
  baseUsdApprox?: string | null;
  /**
   * Area delivery & collection fee, IDR: one amount per booking
   * covering both legs (0 = none, e.g. airport-only bookings). The
   * 5 km showroom waiver is applied by the team on WhatsApp.
   */
  areaFeeIdr: number;
  /** True when the area fee is waived because the rental is one month or longer. */
  areaFeeWaivedMonthly?: boolean;
  /** Airport fees and optional protection, USD amounts (0 = none). */
  airportDeliveryUsd: number;
  airportCollectionUsd: number;
  cancellationProtectionUsd: number;
  motorcycleProtectionUsd: number;
  addOnsTotalUsd: number;
  /** Approximate IDR for the add-on total; null when no rate. */
  addOnsIdrApprox: number | null;
  /** Grand estimated total in IDR; null when no rate to convert. */
  grandTotalIdr: number | null;
  grandTotalUsdApprox?: string | null;
  addOns: { name: string; quantity: number }[];
  firstName: string;
  lastName: string;
  countryCode: string;
  whatsapp: string;
  email?: string;
  flightNumber?: string;
  batteryAck: boolean;
  ageConfirmed?: boolean;
  notes?: string;
}

const idr = (n: number) => `Rp ${n.toLocaleString("en-US")}`;

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
    `*Pricing estimate*`,
    `Tier: ${d.tierLabel}`,
    `Rate: ${idr(d.ratePerDayIdr)}/day`,
    `Base rental: ${idr(d.estimatedTotalIdr)}${d.baseUsdApprox ? ` (${d.baseUsdApprox})` : ""}${d.quantity > 1 ? ` for ${d.quantity} motorcycles` : ""}`,
    ...(d.areaFeeIdr > 0
      ? [
          ``,
          `*Delivery & collection*`,
          `Fee: ${idr(d.areaFeeIdr)} (once per booking; free within 5 km of the Wedison showroom, Jl. Gatot Subroto Tengah, Denpasar)`,
        ]
      : d.areaFeeWaivedMonthly
        ? [``, `*Delivery & collection*`, `Free (rental of one month or longer)`]
        : []),
    ...(d.addOnsTotalUsd > 0
      ? [
          ``,
          `*Add-ons*`,
          ...(d.airportDeliveryUsd > 0
            ? [`Airport delivery fee: US$${d.airportDeliveryUsd.toFixed(2)}`]
            : []),
          ...(d.airportCollectionUsd > 0
            ? [`Airport collection fee: US$${d.airportCollectionUsd.toFixed(2)}`]
            : []),
          ...(d.cancellationProtectionUsd > 0
            ? [`Cancellation Protection (${d.days} days): US$${d.cancellationProtectionUsd.toFixed(2)}`]
            : []),
          ...(d.motorcycleProtectionUsd > 0
            ? [`Motorcycle Protection (${d.quantity} × ${d.days} days): US$${d.motorcycleProtectionUsd.toFixed(2)}`]
            : []),
          `Add-on total: US$${d.addOnsTotalUsd.toFixed(2)}${d.addOnsIdrApprox ? ` (≈ ${idr(d.addOnsIdrApprox)})` : ""}`,
        ]
      : []),
    ``,
    d.grandTotalIdr !== null
      ? `*Estimated total: ${idr(d.grandTotalIdr)}${d.grandTotalUsdApprox ? ` (${d.grandTotalUsdApprox})` : ""}*`
      : d.addOnsTotalUsd > 0
        ? `*Estimated total: ${idr(d.estimatedTotalIdr + d.areaFeeIdr)} plus US$${d.addOnsTotalUsd.toFixed(2)} add-ons*`
        : `*Estimated total: ${idr(d.estimatedTotalIdr + d.areaFeeIdr)}*`,
    `Availability, final price, protection conditions and payment are confirmed by the Werigo team.`,
    ``,
    `*Delivery*`,
    `${d.pickupAreaName}${d.pickupAddress ? `, ${d.pickupAddress}` : ""}`,
    `*Return*`,
    d.sameReturn ? `Same as delivery` : d.returnAreaName,
    ...(d.addOns.length > 0
      ? [``, `*Add-on requests* (price confirmed on WhatsApp)`, ...d.addOns.map((e) => `${e.name} × ${e.quantity}`)]
      : []),
    ``,
    `*Contact*`,
    `Name: ${d.firstName} ${d.lastName}`,
    `WhatsApp: ${d.countryCode} ${d.whatsapp}`,
    ...(d.email ? [`Email: ${d.email}`] : []),
    ...(d.flightNumber ? [`Flight: ${d.flightNumber}`] : []),
    ``,
    `Battery return: I will return the motorcycle with at least 80% battery, or arrange otherwise with the team.`,
    ...(d.ageConfirmed ? [`Rider age: confirmed 25 or older.`] : []),
    ...(d.notes ? [``, `*Notes*`, d.notes] : []),
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

/** Partner Program application link. */
export function buildPartnerApplicationWhatsAppUrl(): string {
  const text = encodeURIComponent(
    "Hi Werigo! I'd like to apply for the Partner Program. My property or business name is:"
  );
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}

/** Fleet partner (rental company, monthly, 3+ units) enquiry link. */
export function buildFleetPartnerWhatsAppUrl(): string {
  const text = encodeURIComponent(
    "Hi Werigo! I run a rental company and I'm interested in the fleet partner monthly rate. Company name, models and number of units:"
  );
  return `https://wa.me/${site.whatsappNumber}?text=${text}`;
}
