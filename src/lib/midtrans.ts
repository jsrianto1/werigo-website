import "server-only";
import { createHash } from "node:crypto";

/**
 * Midtrans Snap (server side).
 *
 * - createSnapTransaction(): opens a payment for a booking and returns
 *   the Snap token the browser passes to window.snap.pay().
 * - verifyNotificationSignature() + fetchTransactionStatus(): used by
 *   the webhook. A notification is only acted on after its signature
 *   checks out AND the status API confirms it.
 *
 * Environment: MIDTRANS_SERVER_KEY (server only) and
 * NEXT_PUBLIC_MIDTRANS_ENV = sandbox | production (selects the hosts).
 */

export type MidtransEnv = "sandbox" | "production";

export function midtransEnv(): MidtransEnv {
  const v = (process.env.MIDTRANS_ENV ?? process.env.NEXT_PUBLIC_MIDTRANS_ENV ?? "sandbox")
    .trim()
    .toLowerCase();
  return v === "production" ? "production" : "sandbox";
}

function hosts() {
  return midtransEnv() === "production"
    ? { snap: "https://app.midtrans.com/snap/v1", api: "https://api.midtrans.com/v2" }
    : { snap: "https://app.sandbox.midtrans.com/snap/v1", api: "https://api.sandbox.midtrans.com/v2" };
}

export function serverKey(): string | undefined {
  return process.env.MIDTRANS_SERVER_KEY?.trim() || undefined;
}

export function isMidtransConfigured(): boolean {
  return Boolean(serverKey());
}

function authHeader(): string {
  const key = serverKey();
  if (!key) throw new MidtransError("configuration_missing", "MIDTRANS_SERVER_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export class MidtransError extends Error {
  readonly kind: "configuration_missing" | "request_failed" | "rejected";
  readonly status?: number;
  constructor(kind: MidtransError["kind"], message: string, status?: number) {
    super(message);
    this.name = "MidtransError";
    this.kind = kind;
    this.status = status;
  }
}

export interface SnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface SnapCustomer {
  firstName: string;
  lastName?: string;
  email?: string;
  /** Digits only, international without "+" (628…). */
  phone?: string;
}

/** "YYYY-MM-DD HH:mm:ss +0700" in the Midtrans expiry format. */
function midtransTime(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second} +0700`;
}

export async function createSnapTransaction(input: {
  orderId: string;
  grossAmount: number;
  customer: SnapCustomer;
  items: SnapItem[];
  expiryMinutes: number;
  finishUrl: string;
}): Promise<{ token: string; redirectUrl: string; expiresAt: Date }> {
  const itemsTotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (itemsTotal !== input.grossAmount) {
    throw new MidtransError("request_failed", "item_details do not add up to gross_amount");
  }
  const start = new Date();
  const expiresAt = new Date(start.getTime() + input.expiryMinutes * 60_000);
  const body = {
    transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount },
    customer_details: {
      first_name: input.customer.firstName.slice(0, 255),
      last_name: input.customer.lastName?.slice(0, 255) || undefined,
      email: input.customer.email || undefined,
      phone: input.customer.phone || undefined,
    },
    item_details: input.items.map((i) => ({ ...i, name: i.name.slice(0, 50) })),
    expiry: { start_time: midtransTime(start), unit: "minute", duration: input.expiryMinutes },
    callbacks: { finish: input.finishUrl },
    credit_card: { secure: true },
  };

  let res: Response;
  try {
    res = await fetch(`${hosts().snap}/transactions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new MidtransError("request_failed", err instanceof Error ? err.message : String(err));
  }
  const data = (await res.json().catch(() => null)) as
    | { token?: string; redirect_url?: string; error_messages?: string[] }
    | null;
  if (!res.ok || !data?.token || !data.redirect_url) {
    throw new MidtransError(
      "rejected",
      (data?.error_messages ?? [`snap http ${res.status}`]).join("; ").slice(0, 300),
      res.status
    );
  }
  return { token: data.token, redirectUrl: data.redirect_url, expiresAt };
}

export interface MidtransTransactionStatus {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  status_code: string;
  gross_amount: string;
  transaction_time?: string;
  settlement_time?: string;
  status_message?: string;
}

/** Authoritative status straight from Midtrans (backend to backend). */
export async function fetchTransactionStatus(orderId: string): Promise<MidtransTransactionStatus | null> {
  const res = await fetch(`${hosts().api}/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as MidtransTransactionStatus | null;
  if (!data) return null;
  // 404 = unknown order (never paid, never created)
  if (data.status_code === "404") return null;
  return data;
}

/** SHA512(order_id + status_code + gross_amount + ServerKey) must equal signature_key. */
export function verifyNotificationSignature(n: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const key = serverKey();
  if (!key) return false;
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`)
    .digest("hex");
  if (expected.length !== n.signature_key.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ n.signature_key.charCodeAt(i);
  return diff === 0;
}

export type PaymentOutcome = "paid" | "pending" | "expired" | "failed" | "refunded" | "unknown";

/** Map Midtrans transaction_status (+ fraud_status) to our payment_status. */
export function mapTransactionStatus(transactionStatus: string, fraudStatus?: string): PaymentOutcome {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "challenge" ? "pending" : fraudStatus === "deny" ? "failed" : "paid";
    case "settlement":
      return "paid";
    case "pending":
    case "authorize":
      return "pending";
    case "expire":
      return "expired";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    case "refund":
    case "partial_refund":
    case "chargeback":
    case "partial_chargeback":
      return "refunded";
    default:
      return "unknown";
  }
}
