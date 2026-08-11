import { z } from "zod";
import { getModel } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { getExtra } from "@/data/extras";
import {
  estimateRental,
  rentalDays,
  type RentalPeriod,
} from "@/lib/pricing";
import { normalizeWhatsApp } from "@/lib/bookingSchema";

/**
 * Validation for the customer database: every form fill on werigo.co
 * (booking request or contact message) arrives here before it is
 * stored.
 *
 * Same trust posture as the booking API: nothing from the browser is
 * believed. Models, areas, extras and dates are re-checked against
 * the source-of-truth data, phone numbers are normalized, and prices
 * are recomputed server-side from `src/lib/pricing.ts` rather than
 * accepted from the client.
 */

const MODEL_SLUGS = ["bees", "victory", "athena", "edpower"] as const;

/** Bali time. Local form dates and times are anchored to it. */
const WITA_OFFSET = "+08:00";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default("");

/** Attribution and anti-spam fields shared by every form. */
const commonFields = {
  clientSubmissionId: z.uuid(),
  sourcePage: optionalText(300),
  referrer: optionalText(500),
  locale: optionalText(20),
  utmSource: optionalText(100),
  utmMedium: optionalText(100),
  utmCampaign: optionalText(100),
  /** Honeypot: must stay empty, bots fill it. */
  website: z.string().max(0).optional().default(""),
  privacyConsent: z.literal(true, {
    error: "Privacy consent is required.",
  }),
};

const optionalEmail = z
  .union([z.literal(""), z.email().max(320)])
  .optional()
  .default("");

export const bookingLeadSchema = z.object({
  ...commonFields,
  formType: z.literal("booking_request"),

  // customer
  firstName: z.string().trim().min(1).max(100),
  lastName: optionalText(100),
  countryCode: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{1,4}$/, "Enter a country code such as +62."),
  whatsapp: z.string().trim().min(4).max(30),
  email: optionalEmail,
  nationality: optionalText(100),
  hotelName: optionalText(300),
  address: optionalText(500),
  flightNumber: optionalText(60),
  specialRequest: optionalText(2000),

  // rental
  vehicleModel: z.enum(MODEL_SLUGS).refine((s) => Boolean(getModel(s))),
  quantity: z.number().int().min(1).max(10),
  pickupArea: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => Boolean(getArea(s)), "Unknown pickup area."),
  returnArea: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => Boolean(getArea(s)), "Unknown return area."),
  startDate: z.string().regex(DATE_RE),
  startTime: z.string().regex(TIME_RE),
  endDate: z.string().regex(DATE_RE),
  endTime: z.string().regex(TIME_RE),
  promoCode: optionalText(60),
  extras: z
    .array(
      z.object({
        id: z.string().trim().max(60),
        quantity: z.number().int().min(0).max(10),
      })
    )
    .max(20)
    .optional()
    .default([]),

  // acknowledgements shown on the review step
  termsAccepted: z.boolean().optional().default(false),
  batteryAck: z.boolean().optional().default(false),
  ageConfirmed: z.boolean().optional(),
});

export const contactLeadSchema = z.object({
  ...commonFields,
  formType: z.literal("contact_message"),
  fullName: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  whatsapp: optionalText(30),
  message: z.string().trim().min(1).max(4000),
});

export const leadSubmissionSchema = z.discriminatedUnion("formType", [
  bookingLeadSchema,
  contactLeadSchema,
]);

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;
export type BookingLead = z.infer<typeof bookingLeadSchema>;
export type ContactLead = z.infer<typeof contactLeadSchema>;

/* ================= Normalization ================= */

/**
 * Server-shaped record ready for storage. Field names match the
 * `form_submissions` columns so the store stays a thin mapping layer.
 */
export interface CapturedSubmission {
  client_submission_id: string;
  form_type: "booking_request" | "contact_message";
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  nationality: string | null;
  message: string | null;

  vehicle_model: string | null;
  quantity: number | null;
  pickup_area: string | null;
  pickup_address: string | null;
  return_area: string | null;
  return_address: string | null;
  hotel_name: string | null;
  flight_number: string | null;
  start_at: string | null;
  end_at: string | null;
  rental_days: number | null;
  rate_per_day_idr: number | null;
  estimated_total_idr: number | null;
  promo_code: string | null;
  extras: { id: string; name: string; quantity: number }[];

  privacy_consent_at: string;
  terms_accepted: boolean;
  battery_ack: boolean;
  age_confirmed: boolean | null;

  handoff_channel: string;
  source_page: string | null;
  referrer: string | null;
  locale: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  details: Record<string, unknown>;
}

const blankToNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/** Combine a dialling code and a local number into +<digits>. */
export function joinWhatsApp(
  countryCode: string,
  local: string
): string | null {
  const cc = countryCode.trim().replace(/^\+?/, "");
  // A local number written with a trunk zero ("0812...") drops it once
  // the country code is in front.
  const rest = local.trim().replace(/[\s\-().]/g, "").replace(/^0+/, "");
  if (!cc || !rest) return null;
  return normalizeWhatsApp(`+${cc}${rest}`);
}

function toPeriod(lead: BookingLead): RentalPeriod {
  return {
    startDate: lead.startDate,
    startTime: lead.startTime,
    endDate: lead.endDate,
    endTime: lead.endTime,
  };
}

const isoAt = (date: string, time: string) =>
  new Date(`${date}T${time}:00${WITA_OFFSET}`).toISOString();

/**
 * Turn a validated submission into the stored record. Prices and
 * extras are resolved from server data, never from the payload.
 */
export function normalizeLead(
  lead: LeadSubmission,
  handoffChannel: string
): CapturedSubmission {
  const now = new Date().toISOString();
  const base = {
    client_submission_id: lead.clientSubmissionId,
    handoff_channel: handoffChannel,
    source_page: blankToNull(lead.sourcePage),
    referrer: blankToNull(lead.referrer),
    locale: blankToNull(lead.locale),
    utm_source: blankToNull(lead.utmSource),
    utm_medium: blankToNull(lead.utmMedium),
    utm_campaign: blankToNull(lead.utmCampaign),
    privacy_consent_at: now,
  };

  if (lead.formType === "contact_message") {
    return {
      ...base,
      form_type: "contact_message",
      full_name: lead.fullName,
      first_name: null,
      last_name: null,
      email: lead.email.toLowerCase(),
      whatsapp_number: lead.whatsapp
        ? normalizeWhatsApp(lead.whatsapp)
        : null,
      nationality: null,
      message: lead.message,
      vehicle_model: null,
      quantity: null,
      pickup_area: null,
      pickup_address: null,
      return_area: null,
      return_address: null,
      hotel_name: null,
      flight_number: null,
      start_at: null,
      end_at: null,
      rental_days: null,
      rate_per_day_idr: null,
      estimated_total_idr: null,
      promo_code: null,
      extras: [],
      terms_accepted: false,
      battery_ack: false,
      age_confirmed: null,
      details: {},
    };
  }

  const period = toPeriod(lead);
  const days = rentalDays(period);
  const estimate = estimateRental(lead.vehicleModel, period);
  const extras = lead.extras
    .filter((e) => e.quantity > 0)
    .map((e) => ({ extra: getExtra(e.id), quantity: e.quantity }))
    .filter((e): e is { extra: NonNullable<ReturnType<typeof getExtra>>; quantity: number } =>
      Boolean(e.extra)
    )
    .map((e) => ({ id: e.extra.id, name: e.extra.name, quantity: e.quantity }));

  const fullName = [lead.firstName, lead.lastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  return {
    ...base,
    form_type: "booking_request",
    full_name: fullName || lead.firstName,
    first_name: lead.firstName,
    last_name: blankToNull(lead.lastName),
    email: lead.email ? lead.email.toLowerCase() : null,
    whatsapp_number: joinWhatsApp(lead.countryCode, lead.whatsapp),
    nationality: blankToNull(lead.nationality),
    message: blankToNull(lead.specialRequest),
    vehicle_model: lead.vehicleModel,
    quantity: lead.quantity,
    pickup_area: lead.pickupArea,
    pickup_address:
      [blankToNull(lead.hotelName), blankToNull(lead.address)]
        .filter(Boolean)
        .join(", ") || null,
    return_area: lead.returnArea,
    return_address: null,
    hotel_name: blankToNull(lead.hotelName),
    flight_number: blankToNull(lead.flightNumber),
    start_at: isoAt(lead.startDate, lead.startTime),
    end_at: isoAt(lead.endDate, lead.endTime),
    rental_days: days,
    // Recomputed here, never taken from the browser.
    rate_per_day_idr: estimate?.ratePerDayIdr ?? null,
    estimated_total_idr: estimate ? estimate.totalIdr * lead.quantity : null,
    promo_code: blankToNull(lead.promoCode),
    extras,
    terms_accepted: lead.termsAccepted,
    battery_ack: lead.batteryAck,
    age_confirmed: lead.ageConfirmed ?? null,
    details: {
      pricingTier: estimate?.tier.id ?? null,
      pricingTierLabel: estimate?.tier.label ?? null,
      localStart: `${lead.startDate} ${lead.startTime}`,
      localEnd: `${lead.endDate} ${lead.endTime}`,
      countryCode: lead.countryCode,
      sameReturnArea: lead.pickupArea === lead.returnArea,
      addressLine: blankToNull(lead.address),
    },
  };
}

/**
 * A record we cannot attach to a person is not stored. The database
 * enforces the same rule (`customers_contactable`).
 */
export function isContactable(s: CapturedSubmission): boolean {
  return Boolean(s.email || s.whatsapp_number);
}
