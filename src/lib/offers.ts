import "server-only";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import { welcomeOffer, welcomeOfferActive } from "@/data/promotions";

/**
 * Which promotion a signed-in customer gets right now. The welcome
 * offer applies to the first *paid* booking: pending or expired
 * attempts do not use it up, a paid (or refunded) one does.
 */
export interface CustomerOffers {
  welcome: { eligible: boolean; percent: number; code: string; endsAt: string };
}

export async function offersForUser(userId: string): Promise<CustomerOffers> {
  let eligible = welcomeOfferActive();
  if (eligible && isDatabaseConfigured()) {
    const res = await getPool().query(
      `select 1 from bookings
       where user_id = $1 and payment_status in ('paid', 'refunded')
       limit 1`,
      [userId]
    );
    eligible = res.rowCount === 0;
  }
  return {
    welcome: { eligible, percent: welcomeOffer.percent, code: welcomeOffer.id, endsAt: welcomeOffer.endsAt },
  };
}
