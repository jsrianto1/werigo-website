import "server-only";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import { normalizeCode, type Audience, type PromotionInput } from "@/lib/promotionRules";

/**
 * Promotions storage: admin CRUD, voucher grants, usage counting and
 * per-customer eligibility. A booking "uses" a promotion while it is
 * paid (or refunded) or still inside its payment window.
 */

export interface PromotionRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  audience: Audience;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount_idr: number | null;
  min_rental_idr: number | null;
  first_booking_only: boolean;
  models: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  featured: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionWithUsage extends PromotionRow {
  used: number;
  grants: number;
}

const USING_BOOKING = `(
  b.payment_status in ('paid', 'refunded')
  or (b.payment_status = 'pending' and b.payment_expires_at > now())
)`;

function toRow(r: Record<string, unknown>): PromotionRow {
  const out: Record<string, unknown> = { ...r };
  for (const k of ["starts_at", "ends_at", "created_at", "updated_at"]) {
    if (out[k] instanceof Date) out[k] = (out[k] as Date).toISOString();
  }
  // pg returns enum arrays as "{a,b}" strings
  if (typeof out.models === "string") {
    out.models = (out.models as string).replace(/[{}]/g, "").split(",").filter(Boolean);
  }
  return out as unknown as PromotionRow;
}

export class PromotionCodeTakenError extends Error {
  constructor() {
    super("code_taken");
  }
}

export async function listPromotions(): Promise<PromotionWithUsage[]> {
  try {
    const res = await getPool().query(`
      select p.*,
        (select count(*)::int from bookings b where b.promotion_id = p.id and ${USING_BOOKING}) as used,
        (select count(*)::int from voucher_grants g where g.promotion_id = p.id) as grants
      from promotions p
      order by p.active desc, p.created_at desc`);
    return res.rows.map((r) => ({ ...toRow(r), used: r.used, grants: r.grants }));
  } catch (err) {
    throw storageErrorFromThrown("list_promotions", err);
  }
}

export async function getPromotion(id: string): Promise<PromotionRow | null> {
  try {
    const res = await getPool().query("select * from promotions where id = $1::uuid", [id]);
    return res.rows[0] ? toRow(res.rows[0]) : null;
  } catch (err) {
    const se = storageErrorFromThrown("get_promotion", err);
    if (se.category === "constraint_failed") return null;
    throw se;
  }
}

function inputParams(p: PromotionInput) {
  return [
    p.code,
    p.title,
    p.description,
    p.audience,
    p.discountType,
    p.discountValue,
    p.maxDiscountIdr,
    p.minRentalIdr,
    p.firstBookingOnly,
    p.models,
    p.startsAt,
    p.endsAt,
    p.usageLimitTotal,
    p.usageLimitPerUser,
    p.featured,
    p.active,
  ];
}

export async function createPromotion(p: PromotionInput, actorEmail: string): Promise<PromotionRow> {
  try {
    const res = await getPool().query(
      `insert into promotions (code, title, description, audience, discount_type, discount_value,
         max_discount_idr, min_rental_idr, first_booking_only, models, starts_at, ends_at,
         usage_limit_total, usage_limit_per_user, featured, active, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vehicle_model[], $11::timestamptz, $12::timestamptz,
               $13, $14, $15, $16, $17)
       returning *`,
      [...inputParams(p), actorEmail]
    );
    return toRow(res.rows[0]);
  } catch (err) {
    const se = storageErrorFromThrown("create_promotion", err);
    if (se.detail.code === "23505") throw new PromotionCodeTakenError();
    throw se;
  }
}

export async function updatePromotion(id: string, p: PromotionInput): Promise<PromotionRow | null> {
  try {
    const res = await getPool().query(
      `update promotions set code = $1, title = $2, description = $3, audience = $4, discount_type = $5,
         discount_value = $6, max_discount_idr = $7, min_rental_idr = $8, first_booking_only = $9,
         models = $10::vehicle_model[], starts_at = $11::timestamptz, ends_at = $12::timestamptz,
         usage_limit_total = $13, usage_limit_per_user = $14, featured = $15, active = $16
       where id = $17::uuid returning *`,
      [...inputParams(p), id]
    );
    return res.rows[0] ? toRow(res.rows[0]) : null;
  } catch (err) {
    const se = storageErrorFromThrown("update_promotion", err);
    if (se.detail.code === "23505") throw new PromotionCodeTakenError();
    throw se;
  }
}

/** Active, inside its dates. */
function liveClause(alias = "p") {
  return `${alias}.active and (${alias}.starts_at is null or ${alias}.starts_at <= now())
    and (${alias}.ends_at is null or ${alias}.ends_at > now())`;
}

/** The campaign shown in the site pop-up and top bar, if any. */
export async function featuredPromotion(): Promise<PromotionRow | null> {
  try {
    const res = await getPool().query(
      `select * from promotions p where p.featured and ${liveClause()} order by p.created_at desc limit 1`
    );
    return res.rows[0] ? toRow(res.rows[0]) : null;
  } catch (err) {
    throw storageErrorFromThrown("featured_promotion", err);
  }
}

export interface CustomerContext {
  userId: string;
  /** Customer already has a paid (or refunded) booking. */
  hasPaidBooking: boolean;
}

export async function customerContext(userId: string): Promise<CustomerContext> {
  try {
    const res = await getPool().query(
      "select 1 from bookings where user_id = $1 and payment_status in ('paid', 'refunded') limit 1",
      [userId]
    );
    return { userId, hasPaidBooking: (res.rowCount ?? 0) > 0 };
  } catch (err) {
    throw storageErrorFromThrown("customer_context", err);
  }
}

export interface EligiblePromotion extends PromotionRow {
  /** Why it cannot be used right now (null = usable). Model/amount rules are checked per booking. */
  blockedReason: string | null;
}

/**
 * Promotions a customer could use: automatic campaigns, vouchers given
 * to them, and (when `code` is given) the public or assigned promotion
 * with that code. Booking-specific rules (model, minimum amount) are
 * applied by the discount engine.
 */
export async function promotionsForCustomer(
  ctx: CustomerContext,
  code?: string | null
): Promise<EligiblePromotion[]> {
  const typed = code ? normalizeCode(code) : null;
  try {
    const res = await getPool().query(
      `select p.*,
         exists (select 1 from voucher_grants g where g.promotion_id = p.id and g.user_id = $1) as granted,
         (select count(*)::int from bookings b where b.promotion_id = p.id and ${USING_BOOKING}) as used_total,
         (select count(*)::int from bookings b where b.promotion_id = p.id and b.user_id = $1 and ${USING_BOOKING}) as used_by_user
       from promotions p
       where ${liveClause()}
         and (
           p.audience = 'auto'
           or (p.audience = 'assigned' and exists (select 1 from voucher_grants g where g.promotion_id = p.id and g.user_id = $1))
           or ($2::text is not null and upper(p.code) = $2)
         )`,
      [ctx.userId, typed]
    );
    return res.rows.map((r) => {
      const row = toRow(r);
      let blockedReason: string | null = null;
      if (row.audience === "assigned" && !r.granted) blockedReason = "This voucher belongs to another account.";
      else if (row.first_booking_only && ctx.hasPaidBooking) blockedReason = "Only for your first booking.";
      else if (row.usage_limit_total !== null && r.used_total >= row.usage_limit_total) blockedReason = "This voucher has run out.";
      else if (row.usage_limit_per_user !== null && r.used_by_user >= row.usage_limit_per_user) {
        blockedReason = "You have already used this voucher. It frees up again if an unpaid booking expires.";
      }
      return { ...row, blockedReason };
    });
  } catch (err) {
    throw storageErrorFromThrown("promotions_for_customer", err);
  }
}

export async function promotionExistsWithCode(code: string): Promise<boolean> {
  const res = await getPool().query("select 1 from promotions where upper(code) = $1", [normalizeCode(code)]);
  return (res.rowCount ?? 0) > 0;
}

/* ================= Voucher grants ================= */

export type GrantTarget =
  | { kind: "all" }
  | { kind: "never_booked" }
  | { kind: "booked_at_least"; count: number }
  | { kind: "emails"; emails: string[] };

/** Give an assigned voucher to a group of customers. Returns how many new grants were made. */
export async function grantVoucher(
  promotionId: string,
  target: GrantTarget,
  actorEmail: string
): Promise<{ matched: number; granted: number; unknownEmails: string[] }> {
  const base = `select u.id from "user" u where coalesce(u.role, 'customer') = 'customer' and coalesce(u.banned, false) = false`;
  let sql: string;
  let params: unknown[];
  let unknownEmails: string[] = [];
  switch (target.kind) {
    case "all":
      sql = base;
      params = [];
      break;
    case "never_booked":
      sql = `${base} and not exists (select 1 from bookings b where b.user_id = u.id and b.payment_status in ('paid', 'refunded'))`;
      params = [];
      break;
    case "booked_at_least":
      sql = `${base} and (select count(*) from bookings b where b.user_id = u.id and b.payment_status = 'paid') >= $1`;
      params = [target.count];
      break;
    case "emails": {
      const emails = [...new Set(target.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
      sql = `${base} and lower(u.email) = any($1::text[])`;
      params = [emails];
      const found = await getPool().query(`select lower(email) as email from "user" where lower(email) = any($1::text[])`, [emails]);
      const foundSet = new Set(found.rows.map((r) => r.email));
      unknownEmails = emails.filter((e) => !foundSet.has(e));
      break;
    }
  }
  try {
    const matched = await getPool().query(`select count(*)::int as n from (${sql}) t`, params);
    const n = params.length;
    const res = await getPool().query(
      `insert into voucher_grants (promotion_id, user_id, granted_by)
       select $${n + 1}::uuid, t.id, $${n + 2} from (${sql}) t
       on conflict (promotion_id, user_id) do nothing`,
      [...params, promotionId, actorEmail]
    );
    return { matched: matched.rows[0].n, granted: res.rowCount ?? 0, unknownEmails };
  } catch (err) {
    throw storageErrorFromThrown("grant_voucher", err);
  }
}
