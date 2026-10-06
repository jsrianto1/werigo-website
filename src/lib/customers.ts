import "server-only";
import { getPool, withTransaction } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import { getIdentity, type StoredIdentity } from "@/lib/identity";
import { referralSummary } from "@/lib/referrals";
import { customerContext, promotionsForCustomer, type EligiblePromotion } from "@/lib/promotions";

/**
 * Customer management for staff. Suspend / block use Better Auth's
 * banned / banReason / banExpires columns, so the auth layer itself
 * refuses the session and sign-in; every open session is revoked.
 */

export type CustomerStatus = "active" | "suspended" | "blocked";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  status: CustomerStatus;
  banReason: string | null;
  banExpires: string | null;
  paidBookings: number;
  spentIdr: number;
  referralAvailableIdr: number;
  hasIdentity: boolean;
}

export interface CustomerListQuery {
  search?: string;
  status?: CustomerStatus | "";
  booked?: "yes" | "no" | "";
  page?: number;
  pageSize?: number;
}

function statusOf(r: { banned: boolean | null; banExpires: Date | string | null }): CustomerStatus {
  if (!r.banned) return "active";
  if (r.banExpires && new Date(r.banExpires).getTime() > Date.now()) return "suspended";
  if (r.banExpires) return "active"; // suspension already over
  return "blocked";
}

function toRow(r: Record<string, unknown>): CustomerRow {
  return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string | null) ?? null,
    nationality: (r.nationality as string | null) ?? null,
    emailVerified: Boolean(r.emailVerified),
    createdAt: new Date(r.createdAt as string).toISOString(),
    lastLoginAt: r.lastLoginAt ? new Date(r.lastLoginAt as string).toISOString() : null,
    status: statusOf({ banned: r.banned as boolean | null, banExpires: r.banExpires as string | null }),
    banReason: (r.banReason as string | null) ?? null,
    banExpires: r.banExpires ? new Date(r.banExpires as string).toISOString() : null,
    paidBookings: Number(r.paid_bookings ?? 0),
    spentIdr: Number(r.spent_idr ?? 0),
    referralAvailableIdr: Number(r.referral_available ?? 0),
    hasIdentity: Boolean(r.has_identity),
  };
}

const CUSTOMER_SELECT = `
  select u.id, u.name, u.email, u.phone, u.nationality, u."emailVerified", u."createdAt", u."lastLoginAt",
         u.banned, u."banReason", u."banExpires",
         (select count(*)::int from bookings b where b.user_id = u.id and b.payment_status = 'paid') as paid_bookings,
         (select coalesce(sum(b.total_idr), 0)::bigint from bookings b where b.user_id = u.id and b.payment_status = 'paid') as spent_idr,
         (select coalesce(sum(l.amount_idr), 0)::bigint from referral_ledger l where l.owner_id = u.id and l.status = 'available') as referral_available,
         exists (select 1 from customer_identity ci where ci.user_id = u.id) as has_identity
  from "user" u
  where coalesce(u.role, 'customer') = 'customer'`;

export async function listCustomers(q: CustomerListQuery): Promise<{ rows: CustomerRow[]; total: number }> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (q.search?.trim()) {
    params.push(`%${q.search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    clauses.push(`(u.name ilike $${params.length} or u.email ilike $${params.length} or coalesce(u.phone, '') ilike $${params.length})`);
  }
  if (q.status === "active") clauses.push(`(coalesce(u.banned, false) = false or (u."banExpires" is not null and u."banExpires" <= now()))`);
  if (q.status === "suspended") clauses.push(`(u.banned and u."banExpires" is not null and u."banExpires" > now())`);
  if (q.status === "blocked") clauses.push(`(u.banned and u."banExpires" is null)`);
  if (q.booked === "yes") clauses.push(`exists (select 1 from bookings b where b.user_id = u.id and b.payment_status = 'paid')`);
  if (q.booked === "no") clauses.push(`not exists (select 1 from bookings b where b.user_id = u.id and b.payment_status = 'paid')`);
  const where = clauses.length ? ` and ${clauses.join(" and ")}` : "";
  try {
    const res = await getPool().query(
      `with c as (${CUSTOMER_SELECT}${where})
       select *, count(*) over() as total_count from c
       order by "createdAt" desc limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const total = res.rows[0] ? Number(res.rows[0].total_count) : 0;
    return { rows: res.rows.map(toRow), total };
  } catch (err) {
    throw storageErrorFromThrown("list_customers", err);
  }
}

export interface CustomerNote {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface CustomerDetail {
  customer: CustomerRow;
  identity: StoredIdentity | null;
  identityLocked: boolean;
  bookings: {
    id: string;
    booking_code: string;
    vehicle_model: string;
    quantity: number;
    start_at: string;
    end_at: string;
    status: string;
    payment_status: string;
    total_idr: number | null;
    created_at: string;
  }[];
  vouchers: EligiblePromotion[];
  referral: { code: string; pendingIdr: number; availableIdr: number; paidOutIdr: number; referred: number };
  notes: CustomerNote[];
  sessions: number;
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  try {
    const pool = getPool();
    const c = await pool.query(`${CUSTOMER_SELECT} and u.id = $1`, [id]);
    if (!c.rows[0]) return null;
    const customer = toRow(c.rows[0]);
    const [identity, bookings, promos, ref, notes, sessions] = await Promise.all([
      getIdentity(id),
      pool.query(
        `select id, booking_code, vehicle_model, quantity, start_at, end_at, status, payment_status, total_idr, created_at
         from bookings where user_id = $1 order by created_at desc limit 50`,
        [id]
      ),
      customerContext(id).then((ctx) => promotionsForCustomer(ctx)),
      referralSummary(id, customer.name),
      pool.query("select id, author_email, body, created_at from customer_notes where user_id = $1 order by created_at desc", [id]),
      pool.query('select count(*)::int as n from session where "userId" = $1 and "expiresAt" > now()', [id]),
    ]);
    return {
      customer,
      identity,
      identityLocked: identity !== null && customer.paidBookings > 0,
      bookings: bookings.rows.map((b) => ({
        ...b,
        start_at: new Date(b.start_at).toISOString(),
        end_at: new Date(b.end_at).toISOString(),
        created_at: new Date(b.created_at).toISOString(),
      })),
      vouchers: promos,
      referral: {
        code: ref.code,
        pendingIdr: ref.pendingIdr,
        availableIdr: ref.availableIdr,
        paidOutIdr: ref.paidOutIdr,
        referred: ref.entries.length,
      },
      notes: notes.rows.map((n) => ({ id: n.id, authorEmail: n.author_email, body: n.body, createdAt: new Date(n.created_at).toISOString() })),
      sessions: sessions.rows[0]?.n ?? 0,
    };
  } catch (err) {
    const se = storageErrorFromThrown("customer_detail", err);
    if (se.category === "constraint_failed") return null;
    throw se;
  }
}

export async function addCustomerNote(userId: string, authorEmail: string, body: string): Promise<CustomerNote> {
  try {
    const res = await getPool().query(
      "insert into customer_notes (user_id, author_email, body) values ($1, $2, $3) returning id, author_email, body, created_at",
      [userId, authorEmail, body]
    );
    const n = res.rows[0];
    return { id: n.id, authorEmail: n.author_email, body: n.body, createdAt: new Date(n.created_at).toISOString() };
  } catch (err) {
    throw storageErrorFromThrown("add_customer_note", err);
  }
}

/**
 * Suspend (until a date), block (indefinitely) or reactivate. Any
 * change away from "active" signs the customer out everywhere.
 */
export async function setCustomerStatus(
  userId: string,
  change: { status: "active" } | { status: "suspended"; until: string; reason: string } | { status: "blocked"; reason: string }
): Promise<{ openPaidBookings: number }> {
  try {
    return await withTransaction(async (client) => {
      const u = await client.query('select role from "user" where id = $1 for update', [userId]);
      if (!u.rows[0] || (u.rows[0].role && u.rows[0].role !== "customer")) throw new Error("not a customer");
      if (change.status === "active") {
        await client.query('update "user" set banned = false, "banReason" = null, "banExpires" = null where id = $1', [userId]);
      } else {
        await client.query(
          'update "user" set banned = true, "banReason" = $2, "banExpires" = $3::timestamptz where id = $1',
          [userId, change.reason, change.status === "suspended" ? change.until : null]
        );
        await client.query('delete from session where "userId" = $1', [userId]);
      }
      const open = await client.query(
        `select count(*)::int as n from bookings
         where user_id = $1 and payment_status = 'paid' and status not in ('completed', 'cancelled') and end_at > now()`,
        [userId]
      );
      return { openPaidBookings: open.rows[0]?.n ?? 0 };
    });
  } catch (err) {
    throw storageErrorFromThrown("set_customer_status", err);
  }
}
