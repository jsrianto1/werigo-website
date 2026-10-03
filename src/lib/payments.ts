import "server-only";
import { getBookingStore, type StoredBooking } from "@/lib/bookingStore";
import {
  countPayments,
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
  type MidtransTransactionStatus,
} from "@/lib/midtrans";
import { notifyBookingPaid } from "@/lib/notifications";
import { toCustomerEntry } from "@/data/vehicles";
import { site } from "@/lib/config";

/** How long a customer has to complete payment (management decision). */
export const PAYMENT_WINDOW_MINUTES = 60;

export function paymentDeadline(from = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
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
  const attempt = await countPayments(booking.id);
  const orderId = attempt === 0 ? booking.booking_code : `${booking.booking_code}-${attempt + 1}`;
  const model = toCustomerEntry(booking.vehicle_model)?.displayName ?? booking.vehicle_model;
  const items = [
    {
      id: `rental-${booking.vehicle_model}`,
      price: booking.rate_per_day_idr * booking.rental_days,
      quantity: booking.quantity,
      name: `${model}, ${booking.rental_days} days`,
    },
  ];
  if (booking.area_fee_idr > 0) {
    items.push({ id: "area-fee", price: booking.area_fee_idr, quantity: 1, name: "Delivery & collection" });
  }
  if (booking.discount_idr > 0) {
    items.push({ id: "discount", price: -booking.discount_idr, quantity: 1, name: `Discount ${booking.discount_code ?? ""}`.trim() });
  }
  const [firstName, ...rest] = booking.full_name.trim().split(/\s+/);
  const expiresAt = booking.payment_expires_at ? new Date(booking.payment_expires_at) : paymentDeadline();
  const minutes = Math.max(5, Math.round((expiresAt.getTime() - Date.now()) / 60_000));

  const snap = await createSnapTransaction({
    orderId,
    grossAmount: booking.total_idr,
    customer: {
      firstName,
      lastName: rest.join(" ") || undefined,
      email: booking.email ?? fallbackEmail ?? undefined,
      phone: booking.whatsapp_number.replace(/\D/g, ""),
    },
    items,
    expiryMinutes: minutes,
    finishUrl: `${siteUrl()}/book/confirmation?code=${encodeURIComponent(booking.booking_code)}`,
  });
  return createPayment({
    bookingId: booking.id,
    orderId,
    snapToken: snap.token,
    redirectUrl: snap.redirectUrl,
    grossAmount: booking.total_idr,
    expiresAt,
  });
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
  await recordTransactionStatus(orderId, status);

  const store = getBookingStore();
  const current = await store.get(payment.booking_id);
  if (!current) return { booking: null, outcome };
  let booking = current.booking;

  const amountOk = Math.round(Number(status.gross_amount)) === payment.gross_amount;
  if (!amountOk) {
    console.error(`[payments] amount mismatch on ${orderId}: provider=${status.gross_amount} expected=${payment.gross_amount}`);
    return { booking, outcome };
  }

  const latest = await latestPayment(booking.id);
  const isLatest = latest?.id === payment.id;

  if (outcome === "paid" && booking.payment_status !== "paid") {
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
  } else if (outcome === "refunded" && booking.payment_status === "paid") {
    booking = (await store.setPaymentState(
      booking.id,
      { payment_status: "refunded" },
      actor,
      `${status.transaction_status} (${orderId})`
    )) ?? booking;
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
