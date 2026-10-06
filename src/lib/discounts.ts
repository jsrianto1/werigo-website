import "server-only";
import { customerContext, promotionsForCustomer } from "@/lib/promotions";
import { findReferralOwner } from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";
import { discountFor, discountLabel, normalizeCode } from "@/lib/promotionRules";
import { formatIdr } from "@/lib/pricing";
import { getModel } from "@/data/vehicles";
import { rideDiscount } from "@/lib/rideClub";

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
  kind: "promotion" | "referral" | "points";
  code: string;
  title: string;
  description: string | null;
  label: string;
  discountIdr: number;
  endsAt: string | null;
  promotionId?: string;
  referralOwnerId?: string;
  referralFeePercent?: number;
  points?: number;
}

/** A voucher the customer holds (or typed) that cannot be used on this booking, with a hint. */
export interface UnavailableDiscount {
  key: string;
  kind: "promotion" | "referral";
  code: string;
  title: string;
  label: string;
  endsAt: string | null;
  /** What to do (or why not), shown under the greyed-out card. */
  hint: string;
}

export interface DiscountResolution {
  options: DiscountOption[];
  unavailable: UnavailableDiscount[];
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
  const unavailable: UnavailableDiscount[] = [];
  let codeStatus: DiscountResolution["codeStatus"] = null;
  let typedMatched = false;

  for (const p of promos) {
    const isTyped = typed !== "" && p.code.toUpperCase() === typed;
    if (isTyped) typedMatched = true;
    let reason = p.blockedReason;
    if (!reason && p.models && !p.models.includes(input.modelSlug)) {
      reason = `Only for ${p.models.map((m) => getModel(m)?.displayName ?? m).join(", ")}.`;
    }
    if (!reason && p.min_rental_idr !== null && input.rentalIdr < p.min_rental_idr) {
      reason = `Add ${formatIdr(p.min_rental_idr - input.rentalIdr)} more to your rental to use this voucher (minimum ${formatIdr(p.min_rental_idr)}).`;
    }
    const amount = reason ? 0 : discountFor(p, input.rentalIdr);
    if (isTyped) codeStatus = reason ? { code: typed, ok: false, message: reason } : { code: typed, ok: true };
    if (reason) {
      // Vouchers the customer holds stay visible, greyed out with the reason.
      unavailable.push({
        key: `promotion:${p.id}`,
        kind: "promotion",
        code: p.code,
        title: p.title,
        label: discountLabel(p),
        endsAt: p.ends_at,
        hint: reason,
      });
      continue;
    }
    if (amount <= 0) continue;
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
      if (reason) {
        unavailable.push({
          key: `referral:${owner.code.toUpperCase()}`,
          kind: "referral",
          code: owner.code.toUpperCase(),
          title: `Referral from ${owner.name.split(/\s+/)[0]}`,
          label: `${settings.refereeDiscountPercent}% off`,
          endsAt: null,
          hint: reason,
        });
      }
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

  const ride = await rideDiscount(input.userId, input.rentalIdr);
  if (ride) options.push({ key: `points:${ride.points}`, kind: "points", code: "RIDE POINTS",
    title: "Ride Points", description: "Use your points. One discount per booking.",
    label: `${ride.points} points`, discountIdr: ride.discountIdr, endsAt: null, points: ride.points });
  options.sort((a, b) => b.discountIdr - a.discountIdr);
  return { options, unavailable, bestKey: options[0]?.key ?? null, codeStatus };
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
