import "server-only";
import { getPool } from "@/lib/db";
import {syncOpsBooking} from "@/lib/opsInventory";
import { getBookingStore, type StoredBooking } from "@/lib/bookingStore";
import {
  countPayments,
  completePaymentSession,
  createPayment,
  findPaymentByOrderId,
  latestPayment,
  recordTransactionStatus,
  type PaymentRow,
} from "@/lib/paymentStore";
import {
  createSnapTransaction,
  fetchTransactionStatus,
  mapTransactionStatus,
  MidtransError,
  type MidtransTransactionStatus,
} from "@/lib/midtrans";
import { notifyBookingPaid } from "@/lib/notifications";
import { syncReferralForBooking } from "@/lib/referrals";
import { toCustomerEntry } from "@/data/vehicles";
import { site } from "@/lib/config";
import { bookingPaymentItems } from "@/lib/paymentItems";

/** How long a customer has to complete payment (management decision). */
export const PAYMENT_WINDOW_MINUTES = 60;

export function paymentDeadline(from = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
}

/** Only a definitive rejection proves no payable session was started. */
export function definitivePaymentRejection(error: unknown): boolean {
  return error instanceof MidtransError && error.kind === "rejected" &&
    error.status !== undefined && error.status >= 400 && error.status < 500 &&
    error.status !== 408 && error.status !== 409 && error.status !== 429 &&
    !/duplicat|order.{0,40}(already|exist|used)/i.test(error.message);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || site.baseUrl;
}

/**
 * Open a Snap transaction for a booking that is awaiting payment and
 * record it. The amount is the server-side snapshot on the booking,
 * never anything from the browser.
 */
export async function openPayment(booking: StoredBooking, fallbackEmail?: string | null): Promise<PaymentRow> {
  if (booking.total_idr === null || booking.rental_days === null || booking.rate_per_day_idr === null) {
    throw new Error("booking has no price snapshot");
  }
  const amount = booking.total_idr, days = booking.rental_days, rate = booking.rate_per_day_idr;
  // Never offer payment before the authoritative fleet has reserved real units.
  await syncOpsBooking(booking.id);
  // A per-booking lock is independent of the fleet lock. A slow gateway never
  // blocks all rentals, and a repeated click cannot create two payment sessions.
  const client = await getPool().connect();
  const lockKey = "werigo-payment:" + booking.id;
  let acquired = false, discardConnection = false;
  try {
    const locked = await client.query("SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked", [lockKey]);
    if (!locked.rows[0]?.locked) throw new Error("PAYMENT_OPENING_IN_PROGRESS");
    acquired = true;
    const current = (await client.query("SELECT payment_status,status FROM bookings WHERE id=$1::uuid", [booking.id])).rows[0];
    if (!current || current.payment_status !== "pending" || current.status === "cancelled") throw new Error("PAYMENT_NOT_PENDING");
    const latest = await latestPayment(booking.id, client);
    if (latest?.snap_token && latest.expires_at && new Date(latest.expires_at).getTime() > Date.now() && ["pending", "initializing"].includes(latest.transaction_status ?? "")) return latest;
    const recover = latest && !latest.snap_token && ["initializing", "initialization_unknown"].includes(latest.transaction_status ?? "");
    const attempt = await countPayments(booking.id, client);
    const orderId = recover ? latest.order_id : attempt === 0 ? booking.booking_code : `${booking.booking_code}-${attempt + 1}`;
    const model = toCustomerEntry(booking.vehicle_model)?.displayName ?? booking.vehicle_model;
    const items = bookingPaymentItems({ ...booking, rental_days: days, rate_per_day_idr: rate }, model);
    const [firstName, ...rest] = booking.full_name.trim().split(/\s+/);
    const expiresAt = booking.payment_expires_at ? new Date(booking.payment_expires_at) : paymentDeadline();
    const minutes = Math.max(5, Math.round((expiresAt.getTime() - Date.now()) / 60_000));

    const intent = recover ? latest : await createPayment({ bookingId:booking.id, orderId, snapToken:null, redirectUrl:null, grossAmount:amount, expiresAt, status:"initializing" }, client);
    try {
      const snap = await createSnapTransaction({
        orderId,
        grossAmount: amount,
        customer: {
          firstName,
          lastName: rest.join(" ") || undefined,
          email: booking.email ?? fallbackEmail ?? undefined,
          phone: booking.whatsapp_number.replace(/\D/g, ""),
        },
        items,
        expiryMinutes: minutes,
        finishUrl: `${siteUrl()}${booking.source_page?.startsWith("/app/") ? "/app/rent" : "/book"}/confirmation?code=${encodeURIComponent(booking.booking_code)}`,
        notificationUrl: `${siteUrl()}/api/payments/midtrans/notify`,
      });
      return await completePaymentSession(orderId, snap.token, snap.redirectUrl, client);
    } catch (error) {
      // The intent is already committed before the gateway request, including
      // when the process crashes or the provider response is lost.
      await client.query("UPDATE payments SET transaction_status=$2 WHERE id=$1", [intent.id, definitivePaymentRejection(error) ? "initialization_rejected" : "initialization_unknown"]);
      throw error;
    }
  } finally {
    if (acquired) {
      try { await client.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [lockKey]); }
      catch { discardConnection = true; }
    }
    // A broken connection must be destroyed so its session lock cannot leak.
    client.release(discardConnection);
  }
}

/**
 * Apply a verified Midtrans status to the payment row and the booking.
 * Idempotent: replays and out-of-order notifications never downgrade
 * a paid booking, and an old transaction's expiry never closes a newer
 * one. Returns the booking as it is afterwards.
 */
export async function syncPaymentStatus(
  orderId: string,
  status: MidtransTransactionStatus,
  actor: string
): Promise<{ booking: StoredBooking | null; outcome: ReturnType<typeof mapTransactionStatus> }> {
  const outcome = mapTransactionStatus(status.transaction_status, status.fraud_status);
  const payment = await findPaymentByOrderId(orderId);
  if (!payment) return { booking: null, outcome };
  const store = getBookingStore();
  const current = await store.get(payment.booking_id);
  if (!current) return { booking: null, outcome };
  let booking = current.booking;

  if (status.order_id !== orderId) throw new Error("PAYMENT_ORDER_MISMATCH");
  if (outcome === "paid" && status.status_code !== "200") throw new Error("PAYMENT_STATUS_UNVERIFIED");
  const amountOk = Number(status.gross_amount) === payment.gross_amount;
  if (!amountOk) {
    console.error(`[payments] amount mismatch on ${orderId}: provider=${status.gross_amount} expected=${payment.gross_amount}`);
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }
  await recordTransactionStatus(orderId, status);

  const latest = await latestPayment(booking.id);
  const isLatest = latest?.id === payment.id;

  if (outcome === "paid" && booking.payment_status !== "paid" && booking.payment_status !== "refunded") {
    const paidAt = status.settlement_time || status.transaction_time
      ? new Date(`${(status.settlement_time ?? status.transaction_time)!.replace(" ", "T")}+07:00`).toISOString()
      : new Date().toISOString();
    const nextStatus = booking.status === "pending_payment" || booking.status === "expired" ? "new" : undefined;
    booking = (await store.setPaymentState(
      booking.id,
      { payment_status: "paid", status: nextStatus, paid_at: paidAt },
      actor,
      `${status.payment_type ?? "payment"} ${status.transaction_status} (${orderId})`
    )) ?? booking;
    await notifyBookingPaid(booking);
    await syncReferralForBooking(booking);
  } else if (outcome === "refunded" && booking.payment_status === "paid") {
    booking = (await store.setPaymentState(
      booking.id,
      { payment_status: "refunded" },
      actor,
      `${status.transaction_status} (${orderId})`
    )) ?? booking;
    await syncReferralForBooking(booking);
  } else if ((outcome === "expired" || outcome === "failed") && isLatest && booking.payment_status === "pending") {
    booking = (await store.setPaymentState(
      booking.id,
      {
        payment_status: outcome,
        status: booking.status === "pending_payment" ? "expired" : undefined,
      },
      actor,
      `${status.transaction_status} (${orderId})`
    )) ?? booking;
  }
  await syncOpsBooking(booking.id);
  return { booking, outcome };
}

/**
 * For a booking still marked pending: ask Midtrans for the truth (in
 * case a webhook was missed) and apply it. Used when the customer
 * opens the confirmation page or their account.
 */
export async function refreshPendingPayment(booking: StoredBooking): Promise<StoredBooking> {
  if (booking.payment_status !== "pending") return booking;
  const payment = await latestPayment(booking.id);
  if (!payment) return booking;
  try {
    const status = await fetchTransactionStatus(payment.order_id);
    if (!status) return booking;
    const { booking: updated } = await syncPaymentStatus(payment.order_id, status, "midtrans:poll");
    return updated ?? booking;
  } catch (err) {
    console.error(`[payments] status poll failed for ${payment.order_id}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return booking;
  }
}
