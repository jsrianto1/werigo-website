import { z } from "zod";
import { getModel } from "@/data/vehicles";
import { getArea } from "@/data/locations";

/**
 * Server-side validation for public booking submissions.
 * The browser is never trusted: model ids, areas, dates and phone
 * numbers are all normalized and re-validated here. No prices are
 * accepted from the client at all.
 */

const MODEL_SLUGS = ["bees", "victory", "athena", "edpower"] as const;

/** Normalize a phone number to +<digits> international format. */
export function normalizeWhatsApp(raw: string): string | null {
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^0\d{7,14}$/.test(s)) s = "+62" + s.slice(1); // local Indonesian format
  if (!s.startsWith("+")) s = "+" + s;
  return /^\+[0-9]{8,15}$/.test(s) ? s : null;
}

export const bookingSubmissionSchema = z
  .object({
    clientSubmissionId: z.uuid(),
    fullName: z.string().trim().min(1).max(200),
    email: z.email().max(320),
    whatsapp: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const n = normalizeWhatsApp(v);
        if (!n) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a WhatsApp number in international format.",
          });
          return z.NEVER;
        }
        return n;
      }),
    nationality: z.string().trim().max(100).optional().default(""),
    pickupArea: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => Boolean(getArea(s)), "Unknown pickup area."),
    pickupAddress: z.string().trim().max(500).optional().default(""),
    returnArea: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => Boolean(getArea(s)), "Unknown return area."),
    returnAddress: z.string().trim().max(500).optional().default(""),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    vehicleModel: z.enum(MODEL_SLUGS).refine((s) => Boolean(getModel(s))),
    quantity: z.number().int().min(1).max(10),
    deliveryMethod: z.enum(["delivery", "pickup"]).default("delivery"),
    customerNotes: z.string().trim().max(2000).optional().default(""),
    privacyConsent: z.literal(true, {
      error: "Privacy consent is required.",
    }),
    sourcePage: z.string().trim().max(300).optional().default(""),
    utmSource: z.string().trim().max(100).optional().default(""),
    utmMedium: z.string().trim().max(100).optional().default(""),
    utmCampaign: z.string().trim().max(100).optional().default(""),
    /** Honeypot — must stay empty; bots fill it. */
    website: z.string().max(0).optional().default(""),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: "End date must be after the start date.",
    path: ["endAt"],
  })
  .refine((d) => new Date(d.startAt).getTime() > Date.now() - 24 * 3600 * 1000, {
    message: "Start date is in the past.",
    path: ["startAt"],
  });

export type BookingSubmission = z.infer<typeof bookingSubmissionSchema>;
