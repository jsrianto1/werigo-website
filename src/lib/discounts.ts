import "server-only";
import { customerContext, promotionsForCustomer } from "@/lib/promotions";
import { findReferralOwner } from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";
import { discountFor, discountLabel, normalizeCode } from "@/lib/promotionRules";
import { formatIdr } from "@/lib/pricing";

/**
 * Discount engine. One discount per booking: every option that applies
 * to this customer and this booking is listed with its rupiah value;
 * the largest is chosen unless the customer picks another one (or
 * none). Used by the checkout (to show the choice) and by
 * POST /api/bookings (to charge it), so both always agree.
 */

export interface DiscountOption {
  /** "promotion:<id>" or "referral:<CODE>" */
  key: string;
  kind: "promotion" | "referral";
  code: string;
  title: string;
  description: string | null;
  label: string;
  discountIdr: number;
  endsAt: string | null;
  promotionId?: string;
  referralOwnerId?: string;
  referralFeePercent?: number;
}

export interface DiscountResolution {
  options: DiscountOption[];
  bestKey: string | null;
  /** Feedback on a code the customer typed. */
  codeStatus: { code: string; ok: boolean; message?: string } | null;
}

export async function resolveDiscounts(input: {
  userId: string;
  modelSlug: string;
  rentalIdr: number;
  code?: string | null;
}): Promise<DiscountResolution> {
  const typed = input.code ? normalizeCode(input.code) : "";
  const ctx = await customerContext(input.userId);
  const promos = await promotionsForCustomer(ctx, typed || null);

  const options: DiscountOption[] = [];
  let codeStatus: DiscountResolution["codeStatus"] = null;
  let typedMatched = false;

  for (const p of promos) {
    const isTyped = typed !== "" && p.code.toUpperCase() === typed;
    if (isTyped) typedMatched = true;
    let reason = p.blockedReason;
    if (!reason && p.models && !p.models.includes(input.modelSlug)) reason = "Not valid for this motorcycle.";
    if (!reason && p.min_rental_idr !== null && input.rentalIdr < p.min_rental_idr) {
      reason = `Needs a rental of at least ${formatIdr(p.min_rental_idr)}.`;
    }
    const amount = reason ? 0 : discountFor(p, input.rentalIdr);
    if (isTyped) codeStatus = reason ? { code: typed, ok: false, message: reason } : { code: typed, ok: true };
    if (reason || amount <= 0) continue;
    options.push({
      key: `promotion:${p.id}`,
      kind: "promotion",
      code: p.code,
      title: p.title,
      description: p.description,
      label: discountLabel(p),
      discountIdr: amount,
      endsAt: p.ends_at,
      promotionId: p.id,
    });
  }

  if (typed && !typedMatched) {
    const owner = await findReferralOwner(typed);
    if (!owner) {
      codeStatus = { code: typed, ok: false, message: "We don't recognise this code." };
    } else {
      const settings = await getReferralSettings();
      let reason: string | null = null;
      if (owner.userId === input.userId) reason = "You can't use your own referral code. Share it with friends instead.";
      else if (settings.firstBookingOnly && ctx.hasPaidBooking) reason = "Referral codes are for a first booking.";
      else if (settings.refereeDiscountPercent <= 0) reason = "Referral discounts are paused right now.";
      const amount = reason ? 0 : Math.round((input.rentalIdr * settings.refereeDiscountPercent) / 100);
      codeStatus = reason ? { code: typed, ok: false, message: reason } : { code: typed, ok: true };
      if (!reason && amount > 0) {
        options.push({
          key: `referral:${owner.code.toUpperCase()}`,
          kind: "referral",
          code: owner.code.toUpperCase(),
          title: `Referral from ${owner.name.split(/\s+/)[0]}`,
          description: null,
          label: `${settings.refereeDiscountPercent}% off`,
          discountIdr: amount,
          endsAt: null,
          referralOwnerId: owner.userId,
          referralFeePercent: settings.referrerFeePercent,
        });
      }
    }
  }

  options.sort((a, b) => b.discountIdr - a.discountIdr);
  return { options, bestKey: options[0]?.key ?? null, codeStatus };
}

/** The option to charge: the requested one if valid, none if asked, else the best. */
export function pickDiscount(r: DiscountResolution, requestedKey?: string | null): DiscountOption | null {
  if (requestedKey === "none") return null;
  if (requestedKey) {
    const chosen = r.options.find((o) => o.key === requestedKey);
    if (chosen) return chosen;
  }
  return r.options[0] ?? null;
}
