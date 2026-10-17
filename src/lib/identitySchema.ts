import { z } from "zod";

/**
 * Renter identity, required before a customer can book: an identity
 * document (passport, Indonesian national ID / KTP, or KITAS).
 * The driving licence number is optional. Shared by browser and API so both
 * apply exactly the same rules. Numbers are normalised to upper case
 * without spaces or dashes.
 */

export const ID_TYPES = ["passport", "national_id", "kitas"] as const;
export type IdType = (typeof ID_TYPES)[number];

export const ID_TYPE_LABELS: Record<IdType, string> = {
  passport: "Passport",
  national_id: "Indonesian ID (KTP)",
  kitas: "KITAS",
};

export function normalizeDocNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-./]/g, "");
}

export const identitySchema = z
  .object({
    idType: z.enum(ID_TYPES, { error: "Choose your identity document." }),
    idNumber: z.string().transform(normalizeDocNumber),
    drivingLicenseNumber: z.string().optional().default("").transform(normalizeDocNumber),
  })
  .superRefine((d, ctx) => {
    if (d.idType === "national_id" && !/^\d{16}$/.test(d.idNumber)) {
      ctx.addIssue({ code: "custom", path: ["idNumber"], message: "A KTP number (NIK) has 16 digits." });
    }
    if (d.idType === "passport" && !/^[A-Z0-9]{5,20}$/.test(d.idNumber)) {
      ctx.addIssue({ code: "custom", path: ["idNumber"], message: "Enter your passport number (5 to 20 letters and digits)." });
    }
    if (d.idType === "kitas" && !/^[A-Z0-9]{5,30}$/.test(d.idNumber)) {
      ctx.addIssue({ code: "custom", path: ["idNumber"], message: "Enter your KITAS number (5 to 30 letters and digits)." });
    }
    if (d.drivingLicenseNumber && !/^[A-Z0-9]{4,30}$/.test(d.drivingLicenseNumber)) {
      ctx.addIssue({ code: "custom", path: ["drivingLicenseNumber"], message: "Enter your driving licence number (letters and digits)." });
    }
  });

export type IdentityInput = z.input<typeof identitySchema>;
export type Identity = z.output<typeof identitySchema>;

/** First error message per field, for forms. */
export function identityFieldErrors(input: unknown): Partial<Record<keyof Identity, string>> | null {
  const r = identitySchema.safeParse(input);
  if (r.success) return null;
  const out: Partial<Record<keyof Identity, string>> = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0] as keyof Identity | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
