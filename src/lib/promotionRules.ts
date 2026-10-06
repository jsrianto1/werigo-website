import { z } from "zod";
import { formatIdr } from "@/lib/pricing";

/**
 * Pure promotion rules shared by the server and the browser: the
 * discount amount, human labels, and the admin form schema. Discounts
 * always apply to the rental amount only, never to the delivery &
 * collection fee.
 */

export const AUDIENCES = ["public", "auto", "assigned"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  public: "Promo code (anyone with the code)",
  auto: "Automatic (every eligible customer)",
  assigned: "Voucher (only customers it is given to)",
};

export const MODEL_SLUGS = ["bees", "victory", "athena", "edpower"] as const;

export interface PromotionTerms {
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount_idr: number | null;
}

/** Rupiah discount for a rental amount, never more than the rental itself. */
export function discountFor(p: PromotionTerms, rentalIdr: number): number {
  if (rentalIdr <= 0) return 0;
  let amount =
    p.discount_type === "percent" ? Math.round((rentalIdr * p.discount_value) / 100) : p.discount_value;
  if (p.max_discount_idr !== null) amount = Math.min(amount, p.max_discount_idr);
  return Math.max(0, Math.min(amount, rentalIdr));
}

export function discountLabel(p: PromotionTerms): string {
  const base = p.discount_type === "percent" ? `${p.discount_value}% off` : `${formatIdr(p.discount_value)} off`;
  return p.max_discount_idr !== null && p.discount_type === "percent"
    ? `${base}, up to ${formatIdr(p.max_discount_idr)}`
    : base;
}

/** Normalise what a customer types into a code. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

const optionalInt = (min: number, max: number) =>
  z
    .union([z.number().int().min(min).max(max), z.null()])
    .optional()
    .transform((v) => v ?? null);

const optionalIso = z
  .union([z.iso.datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

/** Admin create/update form. */
export const promotionInputSchema = z
  .object({
    code: z.string().transform(normalizeCode).pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3 to 30 letters, digits, - or _.")),
    title: z.string().trim().min(1, "Give it a title.").max(80),
    description: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => v || null),
    audience: z.enum(AUDIENCES),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z.number().int().positive("Enter the discount."),
    maxDiscountIdr: optionalInt(1, 100_000_000),
    minRentalIdr: optionalInt(0, 1_000_000_000),
    firstBookingOnly: z.boolean().default(false),
    models: z
      .array(z.enum(MODEL_SLUGS))
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    startsAt: optionalIso,
    endsAt: optionalIso,
    usageLimitTotal: optionalInt(1, 1_000_000),
    usageLimitPerUser: optionalInt(1, 1000),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.discountType === "percent" && d.discountValue > 100) {
      ctx.addIssue({ code: "custom", path: ["discountValue"], message: "A percentage cannot be more than 100." });
    }
    if (d.startsAt && d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
    }
  });

export type PromotionInput = z.output<typeof promotionInputSchema>;
