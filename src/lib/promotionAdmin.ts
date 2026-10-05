import "server-only";
import type { z } from "zod";
import { getPool } from "@/lib/db";
import { normalizeCode } from "@/lib/promotionRules";

/** Helpers shared by the admin promotion routes. */

/** First message per field from a zod error. */
export function promotionErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/**
 * Codes are one namespace: a promotion code must not clash with
 * another promotion or with a customer's referral code.
 */
export async function promotionExistsWithCodeOrReferral(code: string, exceptPromotionId?: string): Promise<boolean> {
  const c = normalizeCode(code);
  const res = await getPool().query(
    `select 1 from promotions where upper(code) = $1 and ($2::uuid is null or id <> $2::uuid)
     union all
     select 1 from referral_codes where upper(code) = $1
     limit 1`,
    [c, exceptPromotionId ?? null]
  );
  return (res.rowCount ?? 0) > 0;
}
