import "server-only";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import type { MidtransTransactionStatus } from "@/lib/midtrans";

/**
 * One row per Midtrans Snap transaction. A booking normally has one;
 * a retry after expiry adds another with a suffixed order_id.
 */
export interface PaymentRow {
  id: string;
  booking_id: string;
  provider: string;
  order_id: string;
  snap_token: string | null;
  redirect_url: string | null;
  gross_amount: number;
  transaction_id: string | null;
  transaction_status: string | null;
  fraud_status: string | null;
  payment_type: string | null;
  status_code: string | null;
  transaction_time: string | null;
  settlement_time: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function normalize(row: Record<string, unknown>): PaymentRow {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
  delete out.last_notification;
  return out as unknown as PaymentRow;
}

export async function createPayment(p: {
  bookingId: string;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  grossAmount: number;
  expiresAt: Date;
}): Promise<PaymentRow> {
  try {
    const res = await getPool().query(
      `insert into payments (booking_id, order_id, snap_token, redirect_url, gross_amount, expires_at, transaction_status)
       values ($1::uuid, $2, $3, $4, $5, $6::timestamptz, 'pending') returning *`,
      [p.bookingId, p.orderId, p.snapToken, p.redirectUrl, p.grossAmount, p.expiresAt.toISOString()]
    );
    return normalize(res.rows[0]);
  } catch (err) {
    throw storageErrorFromThrown("create_payment", err);
  }
}

export async function latestPayment(bookingId: string): Promise<PaymentRow | null> {
  try {
    const res = await getPool().query(
      "select * from payments where booking_id = $1::uuid order by created_at desc limit 1",
      [bookingId]
    );
    return res.rows[0] ? normalize(res.rows[0]) : null;
  } catch (err) {
    throw storageErrorFromThrown("latest_payment", err);
  }
}

export async function countPayments(bookingId: string): Promise<number> {
  try {
    const res = await getPool().query("select count(*)::int as n from payments where booking_id = $1::uuid", [bookingId]);
    return res.rows[0]?.n ?? 0;
  } catch (err) {
    throw storageErrorFromThrown("count_payments", err);
  }
}

export async function findPaymentByOrderId(orderId: string): Promise<PaymentRow | null> {
  try {
    const res = await getPool().query("select * from payments where order_id = $1", [orderId]);
    return res.rows[0] ? normalize(res.rows[0]) : null;
  } catch (err) {
    throw storageErrorFromThrown("find_payment", err);
  }
}

/** Record a verified status (webhook or status poll) on the payment row. */
export async function recordTransactionStatus(orderId: string, s: MidtransTransactionStatus): Promise<PaymentRow | null> {
  try {
    const res = await getPool().query(
      `update payments set
         transaction_id = coalesce($2, transaction_id),
         transaction_status = $3,
         fraud_status = $4,
         payment_type = coalesce($5, payment_type),
         status_code = $6,
         transaction_time = coalesce($7::timestamptz, transaction_time),
         settlement_time = coalesce($8::timestamptz, settlement_time),
         last_notification = $9::jsonb
       where order_id = $1 returning *`,
      [
        orderId,
        s.transaction_id ?? null,
        s.transaction_status,
        s.fraud_status ?? null,
        s.payment_type ?? null,
        s.status_code,
        toIso(s.transaction_time),
        toIso(s.settlement_time),
        JSON.stringify(s),
      ]
    );
    return res.rows[0] ? normalize(res.rows[0]) : null;
  } catch (err) {
    throw storageErrorFromThrown("record_transaction_status", err);
  }
}

/** Midtrans times are "YYYY-MM-DD HH:mm:ss" in WIB (UTC+7). */
function toIso(t?: string): string | null {
  if (!t) return null;
  const m = t.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
  if (!m) return null;
  return new Date(`${m[1]}T${m[2]}+07:00`).toISOString();
}
