import "server-only";
import { getPool } from "@/lib/db";
import { redemptionPoints } from "@/lib/rideClubRules";

export async function rideClubReady() {
  if (process.env.BOOKING_STORE === "memory") return false;
  const r = await getPool().query("select to_regclass('public.ride_members') is not null as ready");
  return Boolean(r.rows[0]?.ready);
}
export async function rideSummary(userId: string) {
  if (!(await rideClubReady())) return null;
  const r = await getPool().query(`select m.joined_at, ride_balance(m.user_id) as balance,
    ride_spend(m.user_id)::text as spend, ride_tier_for(m.user_id) as tier,
    exists(select 1 from ride_credits where source_key='welcome:'||m.user_id and not revoked) as welcome
    from ride_members m where user_id=$1`, [userId]);
  const row = r.rows[0];
  if (!row) return null;
  const history = await getPool().query(`select id,points,note,actor,created_at,expires_at,revoked,
    used_points, greatest(0,points-used_points) as remaining from ride_credit_balances
    where user_id=$1 order by created_at desc,id desc limit 100`, [userId]);
  const redemptions = await getPool().query(`select b.booking_code, b.ride_points as points,
    b.status,b.payment_status,b.created_at,b.payment_expires_at
    from bookings b where user_id=$1 and ride_points>0 order by created_at desc limit 100`, [userId]);
  const adjustments = await getPool().query(`select points,reason,created_at from ride_adjustments
    where user_id=$1 and points<0 order by created_at desc limit 100`, [userId]);
  return { tier: row.tier as string, balance: Number(row.balance), spend: Number(row.spend),
    welcome: Boolean(row.welcome), joinedAt: row.joined_at as Date,
    history: history.rows, redemptions: redemptions.rows, adjustments: adjustments.rows };
}
export async function rideDiscount(userId: string, rentalIdr: number) {
  if (!(await rideClubReady())) return null;
  const r = await getPool().query("select ride_balance($1) as balance", [userId]);
  const points = redemptionPoints(Number(r.rows[0].balance), rentalIdr);
  return points ? { points, discountIdr: points * 200 } : null;
}
