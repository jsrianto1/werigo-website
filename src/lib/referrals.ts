import "server-only";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, withTransaction } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import { getReferralSettings } from "@/lib/settings";
import { normalizeCode } from "@/lib/promotionRules";
import type { StoredBooking } from "@/lib/bookingStore";

/**
 * Referral program.
 *
 * - Every customer can get a personal code (created on first visit to
 *   the Referral page).
 * - A booking made with someone's code records the owner and the fee
 *   percentage in force at that moment (bookings.referral_owner_id,
 *   referral_fee_percent).
 * - syncReferralForBooking() keeps the ledger in step with the booking:
 *   paid → pending, completed → available, cancelled/refunded → void.
 * - Available earnings can be requested as a bank payout once they
 *   reach the minimum; staff pay manually and mark the request paid.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function codeFromName(name: string): string {
  const letters = name
    .normalize("NFKD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 6);
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${letters || "WERIGO"}${suffix}`;
}

export async function getOrCreateReferralCode(userId: string, name: string): Promise<string> {
  const pool = getPool();
  try {
    const existing = await pool.query("select code from referral_codes where user_id = $1", [userId]);
    if (existing.rows[0]) return existing.rows[0].code;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = codeFromName(name);
      // Never collide with a promotion code either.
      const promo = await pool.query("select 1 from promotions where upper(code) = $1", [code]);
      if (promo.rowCount) continue;
      const res = await pool.query(
        `insert into referral_codes (user_id, code) values ($1, $2)
         on conflict do nothing returning code`,
        [userId, code]
      );
      if (res.rows[0]) return res.rows[0].code;
      const again = await pool.query("select code from referral_codes where user_id = $1", [userId]);
      if (again.rows[0]) return again.rows[0].code;
    }
    throw new Error("could not allocate a referral code");
  } catch (err) {
    throw storageErrorFromThrown("referral_code", err);
  }
}

export async function findReferralOwner(code: string): Promise<{ userId: string; code: string; name: string } | null> {
  try {
    const res = await getPool().query(
      `select rc.user_id, rc.code, u.name from referral_codes rc join "user" u on u.id = rc.user_id
       where upper(rc.code) = $1 and coalesce(u.banned, false) = false`,
      [normalizeCode(code)]
    );
    const r = res.rows[0];
    return r ? { userId: r.user_id, code: r.code, name: r.name } : null;
  } catch (err) {
    throw storageErrorFromThrown("find_referral_owner", err);
  }
}

/** Fee owed to the code owner for a booking, from its own snapshot. */
export function referralFeeFor(b: Pick<StoredBooking, "base_idr" | "discount_idr"> & { referral_fee_percent: number | null }): number {
  if (b.base_idr === null || b.referral_fee_percent === null) return 0;
  const rental = Math.max(0, b.base_idr - b.discount_idr);
  return Math.round((rental * b.referral_fee_percent) / 100);
}

/**
 * Bring the ledger row of a referred booking in line with the booking.
 * Idempotent; safe to call after any payment or status change.
 */
export async function syncReferralForBooking(booking: StoredBooking & { referral_owner_id?: string | null; referral_fee_percent?: number | null }): Promise<void> {
  const ownerId = booking.referral_owner_id ?? null;
  if (!ownerId) return;
  try {
    await withTransaction(async (client: PoolClient) => {
      const row = await client.query(
        "select id, status from referral_ledger where booking_id = $1::uuid for update",
        [booking.id]
      );
      const entry = row.rows[0] as { id: string; status: string } | undefined;
      const voided = booking.status === "cancelled" || booking.payment_status === "refunded";

      if (!entry) {
        if (booking.payment_status !== "paid" || voided) return;
        const amount = referralFeeFor({
          base_idr: booking.base_idr,
          discount_idr: booking.discount_idr,
          referral_fee_percent: booking.referral_fee_percent ?? null,
        });
        const completed = booking.status === "completed";
        await client.query(
          `insert into referral_ledger (owner_id, booking_id, amount_idr, status, available_at)
           values ($1, $2::uuid, $3, $4, $5)
           on conflict (booking_id) do nothing`,
          [ownerId, booking.id, amount, completed ? "available" : "pending", completed ? new Date().toISOString() : null]
        );
        return;
      }

      if (entry.status === "paid_out") return; // money already left; staff handle any clawback manually
      if (voided && entry.status !== "void") {
        await client.query("update referral_ledger set status = 'void', payout_id = null where id = $1", [entry.id]);
      } else if (!voided && booking.status === "completed" && entry.status === "pending") {
        await client.query("update referral_ledger set status = 'available', available_at = now() where id = $1", [entry.id]);
      }
    });
  } catch (err) {
    // Never break a payment or an admin update because of the ledger.
    console.error(`[referral] ledger sync failed for ${booking.booking_code}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
  }
}

/* ================= Customer view ================= */

export interface ReferralSummary {
  code: string;
  refereeDiscountPercent: number;
  referrerFeePercent: number;
  minPayoutIdr: number;
  firstBookingOnly: boolean;
  pendingIdr: number;
  /** Available and not inside an open payout request. */
  availableIdr: number;
  inPayoutIdr: number;
  paidOutIdr: number;
  entries: {
    bookingCode: string;
    referredName: string;
    amountIdr: number;
    status: string;
    createdAt: string;
  }[];
  payouts: {
    id: string;
    amountIdr: number;
    status: string;
    bankName: string;
    accountTail: string;
    requestedAt: string;
    processedAt: string | null;
    note: string | null;
  }[];
}

function firstNameInitial(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export async function referralSummary(userId: string, name: string): Promise<ReferralSummary> {
  const [code, settings] = await Promise.all([getOrCreateReferralCode(userId, name), getReferralSettings()]);
  try {
    const pool = getPool();
    const [totals, entries, payouts] = await Promise.all([
      pool.query(
        `select
           coalesce(sum(amount_idr) filter (where status = 'pending'), 0)::bigint as pending,
           coalesce(sum(amount_idr) filter (where status = 'available' and payout_id is null), 0)::bigint as available,
           coalesce(sum(amount_idr) filter (where status = 'available' and payout_id is not null), 0)::bigint as in_payout,
           coalesce(sum(amount_idr) filter (where status = 'paid_out'), 0)::bigint as paid_out
         from referral_ledger where owner_id = $1`,
        [userId]
      ),
      pool.query(
        `select b.booking_code, b.full_name, l.amount_idr, l.status, l.created_at
         from referral_ledger l join bookings b on b.id = l.booking_id
         where l.owner_id = $1 order by l.created_at desc limit 50`,
        [userId]
      ),
      pool.query(
        `select id, amount_idr, status, bank_name, account_number, requested_at, processed_at, note
         from payout_requests where user_id = $1 order by requested_at desc limit 20`,
        [userId]
      ),
    ]);
    const t = totals.rows[0];
    return {
      code,
      ...settings,
      pendingIdr: Number(t.pending),
      availableIdr: Number(t.available),
      inPayoutIdr: Number(t.in_payout),
      paidOutIdr: Number(t.paid_out),
      entries: entries.rows.map((r) => ({
        bookingCode: r.booking_code,
        referredName: firstNameInitial(r.full_name),
        amountIdr: r.amount_idr,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      payouts: payouts.rows.map((r) => ({
        id: r.id,
        amountIdr: r.amount_idr,
        status: r.status,
        bankName: r.bank_name,
        accountTail: String(r.account_number).slice(-4),
        requestedAt: new Date(r.requested_at).toISOString(),
        processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
        note: r.note,
      })),
    };
  } catch (err) {
    throw storageErrorFromThrown("referral_summary", err);
  }
}

export class PayoutError extends Error {
  readonly reason: "below_minimum" | "open_request";
  constructor(reason: PayoutError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}

/** Request a payout of the whole available balance. */
export async function requestPayout(
  userId: string,
  bank: { bankName: string; accountNumber: string; accountName: string }
): Promise<{ id: string; amountIdr: number }> {
  const settings = await getReferralSettings();
  try {
    return await withTransaction(async (client) => {
      const open = await client.query(
        "select 1 from payout_requests where user_id = $1 and status = 'requested' limit 1",
        [userId]
      );
      if (open.rowCount) throw new PayoutError("open_request");
      const rows = await client.query(
        `select id, amount_idr from referral_ledger
         where owner_id = $1 and status = 'available' and payout_id is null
         for update`,
        [userId]
      );
      const amount = rows.rows.reduce((s, r) => s + r.amount_idr, 0);
      if (amount < settings.minPayoutIdr || amount <= 0) throw new PayoutError("below_minimum");
      const payout = await client.query(
        `insert into payout_requests (user_id, amount_idr, bank_name, account_number, account_name)
         values ($1, $2, $3, $4, $5) returning id`,
        [userId, amount, bank.bankName, bank.accountNumber, bank.accountName]
      );
      const id = payout.rows[0].id as string;
      await client.query("update referral_ledger set payout_id = $1 where id = any($2::uuid[])", [
        id,
        rows.rows.map((r) => r.id),
      ]);
      return { id, amountIdr: amount };
    });
  } catch (err) {
    if (err instanceof PayoutError) throw err;
    throw storageErrorFromThrown("request_payout", err);
  }
}

/* ================= Admin view ================= */

export interface AdminPayout {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  amountIdr: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
}

export async function listPayouts(status?: string): Promise<AdminPayout[]> {
  try {
    const res = await getPool().query(
      `select p.*, u.name, u.email from payout_requests p join "user" u on u.id = p.user_id
       where ($1::text is null or p.status = $1)
       order by (p.status = 'requested') desc, p.requested_at desc limit 200`,
      [status ?? null]
    );
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      customerName: r.name,
      customerEmail: r.email,
      amountIdr: r.amount_idr,
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name,
      status: r.status,
      note: r.note,
      requestedAt: new Date(r.requested_at).toISOString(),
      processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
      processedBy: r.processed_by,
    }));
  } catch (err) {
    throw storageErrorFromThrown("list_payouts", err);
  }
}

export async function processPayout(
  id: string,
  action: "paid" | "rejected",
  actorEmail: string,
  note: string | null
): Promise<AdminPayout | null> {
  try {
    const ok = await withTransaction(async (client) => {
      const res = await client.query(
        `update payout_requests set status = $2, processed_at = now(), processed_by = $3, note = $4
         where id = $1::uuid and status = 'requested' returning id`,
        [id, action, actorEmail, note]
      );
      if (!res.rows[0]) return false;
      if (action === "paid") {
        await client.query("update referral_ledger set status = 'paid_out' where payout_id = $1::uuid", [id]);
      } else {
        await client.query("update referral_ledger set payout_id = null where payout_id = $1::uuid", [id]);
      }
      return true;
    });
    if (!ok) return null;
    return (await listPayouts()).find((p) => p.id === id) ?? null;
  } catch (err) {
    const se = storageErrorFromThrown("process_payout", err);
    if (se.category === "constraint_failed") return null;
    throw se;
  }
}

export interface AdminReferralEntry {
  bookingCode: string;
  ownerName: string;
  ownerEmail: string;
  referredName: string;
  amountIdr: number;
  status: string;
  createdAt: string;
}

export async function listReferralEntries(): Promise<AdminReferralEntry[]> {
  try {
    const res = await getPool().query(
      `select b.booking_code, o.name as owner_name, o.email as owner_email, b.full_name,
              l.amount_idr, l.status, l.created_at
       from referral_ledger l
       join bookings b on b.id = l.booking_id
       join "user" o on o.id = l.owner_id
       order by l.created_at desc limit 200`
    );
    return res.rows.map((r) => ({
      bookingCode: r.booking_code,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      referredName: r.full_name,
      amountIdr: r.amount_idr,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (err) {
    throw storageErrorFromThrown("list_referral_entries", err);
  }
}
