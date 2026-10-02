import "server-only";
import { getPool, isDatabaseConfigured } from "@/lib/db";
import type { StoredBooking } from "@/lib/bookingStore";
import { toCustomerEntry } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { site } from "@/lib/config";

/**
 * WhatsApp notifications through Fonnte, with an outbox.
 *
 * Flow: enqueue() writes the message to notification_outbox, then
 * deliverDue() posts pending rows to Fonnte. The booking route calls
 * both (delivery in the background); the VPS cron hits
 * /api/cron/notifications every few minutes to retry anything that
 * failed, with increasing back-off. Nothing here can fail a booking.
 *
 * Configuration (server env): FONNTE_TOKEN, ADMIN_WHATSAPP_NUMBERS
 * (digits, comma separated). Both move to the admin settings page in
 * a later phase.
 */

const FONNTE_SEND_URL = "https://api.fonnte.com/send";
const MAX_ATTEMPTS = 10;
/** Back-off per attempt number (minutes). */
const BACKOFF_MINUTES = [1, 2, 5, 10, 15, 30, 60, 120, 240, 480];

export function adminWhatsAppTargets(): string[] {
  return (process.env.ADMIN_WHATSAPP_NUMBERS ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter((n) => /^\d{9,15}$/.test(n));
}

function fonnteToken(): string | undefined {
  return process.env.FONNTE_TOKEN?.trim() || undefined;
}

/** Only a non-sensitive summary of the Fonnte answer is kept in last_error. */
function describeFailure(status: number, body: unknown): string {
  const reason =
    typeof body === "object" && body !== null && "reason" in body
      ? String((body as { reason: unknown }).reason)
      : "";
  return `http ${status}${reason ? ` ${reason}` : ""}`.slice(0, 200);
}

export async function enqueue(
  kind: string,
  targets: string[],
  message: string,
  bookingId: string | null
): Promise<number> {
  if (targets.length === 0 || !isDatabaseConfigured()) return 0;
  const pool = getPool();
  let n = 0;
  for (const target of targets) {
    await pool.query(
      `insert into notification_outbox (kind, target, message, booking_id)
       values ($1, $2, $3, $4)`,
      [kind, target, message, bookingId]
    );
    n++;
  }
  return n;
}

interface OutboxRow {
  id: string;
  target: string;
  message: string;
  attempts: number;
}

async function sendViaFonnte(token: string, row: OutboxRow) {
  const form = new URLSearchParams({
    target: row.target,
    message: row.message,
    countryCode: "0", // targets are already international, no rewriting
  });
  const res = await fetch(FONNTE_SEND_URL, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const body: unknown = await res.json().catch(() => null);
  const ok =
    res.ok &&
    typeof body === "object" &&
    body !== null &&
    (body as { status?: unknown }).status === true;
  const providerId =
    ok && Array.isArray((body as { id?: unknown }).id)
      ? String((body as { id: unknown[] }).id[0] ?? "")
      : null;
  return { ok, providerId, failure: ok ? null : describeFailure(res.status, body) };
}

/**
 * Deliver pending outbox rows whose time has come. Rows are locked
 * with SKIP LOCKED so the cron and a request can run concurrently.
 */
export async function deliverDue(limit = 20): Promise<{ sent: number; failed: number; skipped: number }> {
  const out = { sent: 0, failed: 0, skipped: 0 };
  if (!isDatabaseConfigured()) return out;
  const token = fonnteToken();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const due = await client.query<OutboxRow>(
      `select id, target, message, attempts from notification_outbox
       where status = 'pending' and next_attempt_at <= now()
       order by created_at
       limit $1
       for update skip locked`,
      [limit]
    );

    for (const row of due.rows) {
      if (!token) {
        // Not configured yet: keep the row, look again later, do not burn attempts.
        await client.query(
          `update notification_outbox
             set last_error = 'fonnte_not_configured', next_attempt_at = now() + interval '15 minutes'
           where id = $1`,
          [row.id]
        );
        out.skipped++;
        continue;
      }
      let result: Awaited<ReturnType<typeof sendViaFonnte>>;
      try {
        result = await sendViaFonnte(token, row);
      } catch (err) {
        result = {
          ok: false,
          providerId: null,
          failure: (err instanceof Error ? err.message : String(err)).slice(0, 200),
        };
      }
      if (result.ok) {
        await client.query(
          `update notification_outbox
             set status = 'sent', sent_at = now(), attempts = attempts + 1,
                 provider_message_id = $2, last_error = null
           where id = $1`,
          [row.id, result.providerId]
        );
        out.sent++;
      } else {
        const attempts = row.attempts + 1;
        const exhausted = attempts >= MAX_ATTEMPTS;
        const minutes = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1];
        await client.query(
          `update notification_outbox
             set attempts = $2, last_error = $3,
                 status = $4,
                 next_attempt_at = now() + ($5 || ' minutes')::interval
           where id = $1`,
          [row.id, attempts, result.failure, exhausted ? "failed" : "pending", String(minutes)]
        );
        out.failed++;
        if (exhausted) {
          console.error(`[notify] giving up on outbox ${row.id} after ${attempts} attempts: ${result.failure}`);
        }
      }
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error(`[notify] delivery run failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
  } finally {
    client.release();
  }
  return out;
}

/* ================= Message builders ================= */

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Makassar",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Internal message for the ops team (Indonesian, short, scannable). */
export function buildNewBookingAdminMessage(b: StoredBooking): string {
  const model = toCustomerEntry(b.vehicle_model)?.displayName ?? b.vehicle_model;
  const pickup = getArea(b.pickup_area)?.name ?? b.pickup_area;
  const ret = getArea(b.return_area)?.name ?? b.return_area;
  const lines = [
    `*Booking baru masuk* — ${b.booking_code}`,
    "",
    `Nama: ${b.full_name}`,
    `WhatsApp: ${b.whatsapp_number}`,
    b.email ? `Email: ${b.email}` : "",
    b.nationality ? `Kewarganegaraan: ${b.nationality}` : "",
    "",
    `Unit: ${model} × ${b.quantity}`,
    `Mulai: ${fmtDateTime(b.start_at)} WITA`,
    `Selesai: ${fmtDateTime(b.end_at)} WITA`,
    `Antar: ${pickup}${b.pickup_address ? ` — ${b.pickup_address}` : ""}`,
    `Ambil: ${ret}${b.return_address ? ` — ${b.return_address}` : ""}`,
    b.customer_notes ? `Catatan: ${b.customer_notes}` : "",
    "",
    `Dashboard: ${site.baseUrl}/admin/bookings`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

/**
 * Called by POST /api/bookings after a successful insert. Queues one
 * message per admin number and starts delivery in the background.
 * Never throws.
 */
export async function notifyAdminsOfNewBooking(b: StoredBooking): Promise<void> {
  try {
    const n = await enqueue("booking_new_admin", adminWhatsAppTargets(), buildNewBookingAdminMessage(b), b.id);
    if (n > 0) {
      void deliverDue(n).catch(() => {
        /* already logged inside */
      });
    }
  } catch (err) {
    console.error(`[notify] enqueue failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
  }
}
