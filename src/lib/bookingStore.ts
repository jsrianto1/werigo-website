import "server-only";
import type { PoolClient } from "pg";
import type { BookingSubmission } from "@/lib/bookingSchema";
import { getPool, isDatabaseConfigured, withTransaction } from "@/lib/db";
import { StorageError, storageErrorFromThrown } from "@/lib/storageErrors";
import { availableUnitsLocked } from "@/lib/stock";
import type { Quote } from "@/lib/quote";

/**
 * Server-side booking storage.
 *
 * Default driver: PostgreSQL on the Werigo VPS (plain SQL through the
 * shared pool in `@/lib/db`). All access goes through the server; the
 * browser never talks to the database.
 *
 * Test driver: an in-memory store enabled ONLY by BOOKING_STORE=memory
 * — used by the automated local test suite so the full API flow
 * (validation → insert → booking code → idempotency → WhatsApp gating)
 * can be verified without a database. It is never selected in
 * production unless explicitly configured, and logs a loud warning.
 */

export const BOOKING_STATUSES = [
  "pending_payment", "new", "contacted", "quoted", "confirmed",
  "active", "completed", "cancelled", "no_response", "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "expired", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface StoredBooking {
  id: string;
  booking_code: string;
  client_submission_id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  full_name: string;
  whatsapp_number: string;
  email: string | null;
  nationality: string | null;
  pickup_area: string;
  pickup_address: string | null;
  return_area: string;
  return_address: string | null;
  start_at: string;
  end_at: string;
  vehicle_model: string;
  quantity: number;
  delivery_method: string;
  customer_notes: string | null;
  status: BookingStatus | string;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  privacy_consent_at: string;
  assigned_to: string | null;
  internal_notes: string | null;
  follow_up_at: string | null;
  // price snapshot + payment (null on bookings that never entered the payment flow)
  rental_days: number | null;
  rate_per_day_idr: number | null;
  base_idr: number | null;
  area_fee_idr: number;
  discount_idr: number;
  discount_code: string | null;
  total_idr: number | null;
  payment_status: PaymentStatus | string;
  payment_expires_at: string | null;
  paid_at: string | null;
  promotion_id: string | null;
  discount_kind: "promotion" | "referral" | null;
  referral_owner_id: string | null;
  referral_fee_percent: number | null;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  actor: string;
  created_at: string;
}

export interface BookingListQuery {
  search?: string;
  status?: string;
  paymentStatus?: string;
  model?: string;
  pickupArea?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}

export interface BookingUpdate {
  status?: string;
  internal_notes?: string;
  assigned_to?: string;
  follow_up_at?: string | null;
  /** Staff-recorded payment outcome (e.g. refunded after a manual refund). */
  payment_status?: PaymentStatus;
}

export interface CreateOptions {
  userId?: string | null;
  /** When set, the booking is created awaiting online payment. */
  payment?: { quote: Quote; expiresAt: Date };
  /** Which discount the quote includes (one per booking). */
  discount?: {
    kind: "promotion" | "referral";
    promotionId?: string;
    referralOwnerId?: string;
    referralFeePercent?: number;
  } | null;
}

/** Thrown by create() when the model is sold out for the period. */
export class StockUnavailableError extends Error {
  readonly available: number;
  constructor(available: number) {
    super("stock_unavailable");
    this.name = "StockUnavailableError";
    this.available = available;
  }
}

export interface BookingStore {
  /** Insert; if client_submission_id already exists, return the existing row (idempotent). */
  create(submission: BookingSubmission, opts?: CreateOptions): Promise<{ booking: StoredBooking; duplicate: boolean }>;
  list(q: BookingListQuery): Promise<{ rows: StoredBooking[]; total: number; counts: Record<string, number> }>;
  get(id: string): Promise<{ booking: StoredBooking; events: BookingEvent[] } | null>;
  getByCode(code: string): Promise<StoredBooking | null>;
  listForUser(userId: string): Promise<StoredBooking[]>;
  update(id: string, patch: BookingUpdate, actor: string): Promise<StoredBooking | null>;
  /** Payment outcome from the provider or the expiry cron. */
  setPaymentState(
    id: string,
    patch: { payment_status: PaymentStatus; status?: BookingStatus; paid_at?: string | null; payment_expires_at?: string | null },
    actor: string,
    note?: string
  ): Promise<StoredBooking | null>;
  /** Re-open the payment window of an expired/failed booking if units are still free. */
  reopenPayment(id: string, expiresAt: Date): Promise<StoredBooking | null>;
  /** Pending bookings whose payment window closed; marks them expired and returns them. */
  expirePending(): Promise<StoredBooking[]>;
  exportRows(q: BookingListQuery): Promise<StoredBooking[]>;
}

function submissionToRow(s: BookingSubmission, opts?: CreateOptions) {
  const q = opts?.payment?.quote;
  return {
    client_submission_id: s.clientSubmissionId,
    user_id: opts?.userId ?? null,
    full_name: s.fullName,
    whatsapp_number: s.whatsapp,
    email: s.email || null,
    nationality: s.nationality || null,
    pickup_area: s.pickupArea,
    pickup_address: s.pickupAddress || null,
    return_area: s.returnArea,
    return_address: s.returnAddress || null,
    start_at: s.startAt,
    end_at: s.endAt,
    vehicle_model: s.vehicleModel,
    quantity: s.quantity,
    delivery_method: s.deliveryMethod,
    customer_notes: s.customerNotes || null,
    source_page: s.sourcePage || null,
    utm_source: s.utmSource || null,
    utm_medium: s.utmMedium || null,
    utm_campaign: s.utmCampaign || null,
    privacy_consent_at: new Date().toISOString(),
    status: q ? "pending_payment" : "new",
    rental_days: q?.days ?? null,
    rate_per_day_idr: q?.ratePerDayIdr ?? null,
    base_idr: q?.baseIdr ?? null,
    area_fee_idr: q?.areaFeeIdr ?? 0,
    discount_idr: q?.discountIdr ?? 0,
    discount_code: q?.discountCode ?? null,
    total_idr: q?.totalIdr ?? null,
    payment_status: q ? "pending" : "unpaid",
    payment_expires_at: opts?.payment ? opts.payment.expiresAt.toISOString() : null,
    promotion_id: q && q.discountIdr > 0 ? opts?.discount?.promotionId ?? null : null,
    discount_kind: q && q.discountIdr > 0 ? opts?.discount?.kind ?? null : null,
    referral_owner_id: q && q.discountIdr > 0 ? opts?.discount?.referralOwnerId ?? null : null,
    referral_fee_percent: q && q.discountIdr > 0 ? opts?.discount?.referralFeePercent ?? null : null,
  };
}

/* ================= PostgreSQL driver ================= */

/** pg returns timestamptz as Date and bigint as string; normalise for JSON. */
function normalizeRow<T>(row: object): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

/** Escape LIKE wildcards in user input. */
function likePattern(s: string): string {
  return `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

class PostgresBookingStore implements BookingStore {
  async create(submission: BookingSubmission, opts?: CreateOptions) {
    const row = submissionToRow(submission, opts);
    const cols = Object.keys(row);
    const values = Object.values(row);
    const placeholders = cols.map((c, i) => {
      const cast =
        c === "status" ? "::booking_status"
        : c === "payment_status" ? "::payment_status"
        : c === "promotion_id" ? "::uuid"
        : "";
      return `$${i + 1}${cast}`;
    }).join(", ");

    try {
      return await withTransaction(async (client) => {
        // Idempotent replay first, so a retry never re-checks stock against itself.
        const existing = await client.query(
          "select * from bookings where client_submission_id = $1",
          [submission.clientSubmissionId]
        );
        if (existing.rows[0]) {
          return { booking: normalizeRow<StoredBooking>(existing.rows[0]), duplicate: true };
        }

        if (opts?.payment) {
          const avail = await availableUnitsLocked(client, submission.vehicleModel, submission.startAt, submission.endAt);
          if (avail.available !== null && avail.available < submission.quantity) {
            throw new StockUnavailableError(avail.available);
          }
        }

        const res = await client.query(
          `insert into bookings (${cols.join(", ")}) values (${placeholders})
           on conflict (client_submission_id) do nothing
           returning *`,
          values
        );
        const inserted = res.rows[0];
        if (!inserted) {
          const again = await client.query("select * from bookings where client_submission_id = $1", [submission.clientSubmissionId]);
          if (!again.rows[0]) {
            throw new StorageError("insert_failed", { operation: "idempotent_replay", message: "duplicate row not found" });
          }
          return { booking: normalizeRow<StoredBooking>(again.rows[0]), duplicate: true };
        }

        await client.query(
          `insert into booking_events (booking_id, event_type, new_status, actor)
           values ($1, 'created', $2::booking_status, 'customer')`,
          [inserted.id, row.status]
        );
        return { booking: normalizeRow<StoredBooking>(inserted), duplicate: false };
      });
    } catch (err) {
      if (err instanceof StockUnavailableError) throw err;
      throw storageErrorFromThrown("insert_booking", err);
    }
  }

  /** WHERE clause + params shared by list() and exportRows(). */
  private filters(q: BookingListQuery): { where: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      params.push(v);
      clauses.push(sql.replace("?", `$${params.length}`));
    };
    if (q.status) add("status = ?::booking_status", q.status);
    if (q.paymentStatus) add("payment_status = ?::payment_status", q.paymentStatus);
    if (q.model) add("vehicle_model = ?::vehicle_model", q.model);
    if (q.pickupArea) add("pickup_area = ?", q.pickupArea);
    if (q.source) add("source_page = ?", q.source);
    if (q.dateFrom) add("created_at >= ?::timestamptz", q.dateFrom);
    if (q.dateTo) add("created_at <= ?::timestamptz", q.dateTo);
    if (q.search?.trim()) {
      params.push(likePattern(q.search.trim()));
      const p = `$${params.length}`;
      clauses.push(
        `(booking_code ilike ${p} or full_name ilike ${p} or whatsapp_number ilike ${p} or email ilike ${p})`
      );
    }
    return { where: clauses.length ? `where ${clauses.join(" and ")}` : "", params };
  }

  async list(q: BookingListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    const { where, params } = this.filters(q);
    const order = q.sort === "oldest" ? "asc" : "desc";
    try {
      const pool = getPool();
      const [rowsRes, countsRes] = await Promise.all([
        pool.query(
          `select *, count(*) over() as total_count from bookings ${where}
           order by created_at ${order}, id ${order}
           limit $${params.length + 1} offset $${params.length + 2}`,
          [...params, pageSize, (page - 1) * pageSize]
        ),
        pool.query("select status, n from booking_status_counts()"),
      ]);
      const total = rowsRes.rows[0] ? Number(rowsRes.rows[0].total_count) : 0;
      const rows = rowsRes.rows.map((r) => {
        const { total_count: _ignored, ...rest } = r;
        void _ignored;
        return normalizeRow<StoredBooking>(rest);
      });
      const counts: Record<string, number> = {};
      for (const st of BOOKING_STATUSES) counts[st] = 0;
      for (const r of countsRes.rows) counts[r.status] = Number(r.n);
      return { rows, total, counts };
    } catch (err) {
      throw storageErrorFromThrown("list_bookings", err);
    }
  }

  async get(id: string) {
    try {
      const pool = getPool();
      const b = await pool.query("select * from bookings where id = $1::uuid", [id]);
      if (!b.rows[0]) return null;
      const ev = await pool.query(
        "select * from booking_events where booking_id = $1::uuid order by created_at desc",
        [id]
      );
      return {
        booking: normalizeRow<StoredBooking>(b.rows[0]),
        events: ev.rows.map((e) => normalizeRow<BookingEvent>(e)),
      };
    } catch (err) {
      const se = storageErrorFromThrown("get_booking", err);
      // A malformed id (22P02) is simply "not found".
      if (se.category === "constraint_failed") return null;
      throw se;
    }
  }

  async getByCode(code: string) {
    try {
      const res = await getPool().query("select * from bookings where booking_code = $1", [code]);
      return res.rows[0] ? normalizeRow<StoredBooking>(res.rows[0]) : null;
    } catch (err) {
      throw storageErrorFromThrown("get_booking_by_code", err);
    }
  }

  async listForUser(userId: string) {
    try {
      const res = await getPool().query(
        "select * from bookings where user_id = $1 order by created_at desc limit 100",
        [userId]
      );
      return res.rows.map((r) => normalizeRow<StoredBooking>(r));
    } catch (err) {
      throw storageErrorFromThrown("list_user_bookings", err);
    }
  }

  async update(id: string, patch: BookingUpdate, actor: string) {
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (col: string, v: unknown, cast = "") => {
      params.push(v);
      sets.push(`${col} = $${params.length}${cast}`);
    };
    if (patch.status !== undefined) set("status", patch.status, "::booking_status");
    if (patch.internal_notes !== undefined) set("internal_notes", patch.internal_notes);
    if (patch.assigned_to !== undefined) set("assigned_to", patch.assigned_to);
    if (patch.follow_up_at !== undefined) set("follow_up_at", patch.follow_up_at, "::timestamptz");
    if (patch.payment_status !== undefined) set("payment_status", patch.payment_status, "::payment_status");

    try {
      return await withTransaction(async (client: PoolClient) => {
        const before = await client.query("select * from bookings where id = $1::uuid for update", [id]);
        const prev = before.rows[0] as StoredBooking | undefined;
        if (!prev) return null;
        if (sets.length === 0) return normalizeRow<StoredBooking>(prev);

        // The status-change audit trigger reads this setting for the actor.
        await client.query("select set_config('werigo.actor', $1, true)", [actor]);
        params.push(id);
        const updated = await client.query(
          `update bookings set ${sets.join(", ")} where id = $${params.length}::uuid returning *`,
          params
        );
        const after = updated.rows[0] as StoredBooking;

        const events: [string, string | null][] = [];
        if (patch.internal_notes !== undefined && patch.internal_notes !== (prev.internal_notes ?? "")) {
          events.push(["note_updated", null]);
        }
        if (patch.assigned_to !== undefined && patch.assigned_to !== (prev.assigned_to ?? "")) {
          events.push(["assigned", patch.assigned_to || "unassigned"]);
        }
        if (patch.follow_up_at !== undefined) {
          events.push(["follow_up_set", patch.follow_up_at ?? "cleared"]);
        }
        if (patch.payment_status !== undefined && patch.payment_status !== prev.payment_status) {
          events.push(["payment_" + patch.payment_status, `${prev.payment_status} → ${patch.payment_status}`]);
        }
        for (const [type, note] of events) {
          await client.query(
            "insert into booking_events (booking_id, event_type, note, actor) values ($1, $2, $3, $4)",
            [id, type, note, actor]
          );
        }
        return normalizeRow<StoredBooking>(after);
      });
    } catch (err) {
      const se = storageErrorFromThrown("update_booking", err);
      if (se.category === "constraint_failed") return null;
      throw se;
    }
  }

  async setPaymentState(
    id: string,
    patch: { payment_status: PaymentStatus; status?: BookingStatus; paid_at?: string | null; payment_expires_at?: string | null },
    actor: string,
    note?: string
  ) {
    try {
      return await withTransaction(async (client) => {
        const before = await client.query("select * from bookings where id = $1::uuid for update", [id]);
        const prev = before.rows[0] as StoredBooking | undefined;
        if (!prev) return null;
        await client.query("select set_config('werigo.actor', $1, true)", [actor]);
        const sets = ["payment_status = $2::payment_status"];
        const params: unknown[] = [id, patch.payment_status];
        if (patch.status) {
          params.push(patch.status);
          sets.push(`status = $${params.length}::booking_status`);
        }
        if (patch.paid_at !== undefined) {
          params.push(patch.paid_at);
          sets.push(`paid_at = $${params.length}::timestamptz`);
        }
        if (patch.payment_expires_at !== undefined) {
          params.push(patch.payment_expires_at);
          sets.push(`payment_expires_at = $${params.length}::timestamptz`);
        }
        const res = await client.query(`update bookings set ${sets.join(", ")} where id = $1::uuid returning *`, params);
        if (patch.payment_status !== prev.payment_status) {
          await client.query(
            "insert into booking_events (booking_id, event_type, note, actor) values ($1, $2, $3, $4)",
            [id, `payment_${patch.payment_status}`, note ?? null, actor]
          );
        }
        return normalizeRow<StoredBooking>(res.rows[0]);
      });
    } catch (err) {
      throw storageErrorFromThrown("set_payment_state", err);
    }
  }

  async reopenPayment(id: string, expiresAt: Date) {
    try {
      return await withTransaction(async (client) => {
        const before = await client.query("select * from bookings where id = $1::uuid for update", [id]);
        const prev = before.rows[0] as StoredBooking | undefined;
        if (!prev) return null;
        const avail = await availableUnitsLocked(client, prev.vehicle_model, prev.start_at, prev.end_at);
        if (avail.available !== null && avail.available < prev.quantity) {
          throw new StockUnavailableError(avail.available);
        }
        await client.query("select set_config('werigo.actor', 'customer', true)");
        const res = await client.query(
          `update bookings set payment_status = 'pending', status = 'pending_payment', payment_expires_at = $2::timestamptz
           where id = $1::uuid returning *`,
          [id, expiresAt.toISOString()]
        );
        await client.query(
          "insert into booking_events (booking_id, event_type, note, actor) values ($1, 'payment_pending', 'payment window reopened', 'customer')",
          [id]
        );
        return normalizeRow<StoredBooking>(res.rows[0]);
      });
    } catch (err) {
      if (err instanceof StockUnavailableError) throw err;
      throw storageErrorFromThrown("reopen_payment", err);
    }
  }

  async expirePending() {
    try {
      return await withTransaction(async (client) => {
        await client.query("select set_config('werigo.actor', 'system', true)");
        const res = await client.query(
          `update bookings
             set payment_status = 'expired',
                 status = case when status = 'pending_payment' then 'expired'::booking_status else status end
           where payment_status = 'pending' and payment_expires_at < now()
           returning *`
        );
        for (const r of res.rows) {
          await client.query(
            "insert into booking_events (booking_id, event_type, note, actor) values ($1, 'payment_expired', 'payment window closed', 'system')",
            [r.id]
          );
        }
        return res.rows.map((r) => normalizeRow<StoredBooking>(r));
      });
    } catch (err) {
      throw storageErrorFromThrown("expire_pending", err);
    }
  }

  async exportRows(q: BookingListQuery) {
    const { where, params } = this.filters(q);
    const order = q.sort === "oldest" ? "asc" : "desc";
    try {
      const res = await getPool().query(
        `select * from bookings ${where} order by created_at ${order} limit 5000`,
        params
      );
      return res.rows.map((r) => normalizeRow<StoredBooking>(r));
    } catch (err) {
      throw storageErrorFromThrown("export_bookings", err);
    }
  }
}

/* ================= Memory driver (tests only) ================= */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

class MemoryBookingStore implements BookingStore {
  private bookings: StoredBooking[] = [];
  private events: BookingEvent[] = [];

  private code(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    let suffix = "";
    for (let i = 0; i < 4; i++) suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    const candidate = `WRG-${ymd}-${suffix}`;
    return this.bookings.some((b) => b.booking_code === candidate) ? this.code() : candidate;
  }

  private event(booking_id: string, event_type: string, extra: Partial<BookingEvent> = {}) {
    this.events.push({
      id: crypto.randomUUID(),
      booking_id,
      event_type,
      previous_status: null,
      new_status: null,
      note: null,
      actor: "system",
      created_at: new Date().toISOString(),
      ...extra,
    });
  }

  async create(s: BookingSubmission, opts?: CreateOptions) {
    if (process.env.SIMULATE_DB_FAILURE === "1") {
      throw new StorageError("insert_failed", {
        operation: "insert_booking",
        message: "simulated database failure (test-only)",
      });
    }
    const existing = this.bookings.find((b) => b.client_submission_id === s.clientSubmissionId);
    if (existing) return { booking: existing, duplicate: true };
    const now = new Date().toISOString();
    const row = submissionToRow(s, opts);
    const booking: StoredBooking = {
      id: crypto.randomUUID(),
      booking_code: this.code(),
      created_at: now,
      updated_at: now,
      assigned_to: null,
      internal_notes: null,
      follow_up_at: null,
      paid_at: null,
      ...row,
    } as StoredBooking;
    this.bookings.push(booking);
    this.event(booking.id, "created", { new_status: booking.status, actor: "customer" });
    return { booking, duplicate: false };
  }

  private filtered(q: BookingListQuery) {
    let rows = [...this.bookings];
    if (q.status) rows = rows.filter((b) => b.status === q.status);
    if (q.paymentStatus) rows = rows.filter((b) => b.payment_status === q.paymentStatus);
    if (q.model) rows = rows.filter((b) => b.vehicle_model === q.model);
    if (q.pickupArea) rows = rows.filter((b) => b.pickup_area === q.pickupArea);
    if (q.source) rows = rows.filter((b) => b.source_page === q.source);
    if (q.dateFrom) rows = rows.filter((b) => b.created_at >= q.dateFrom!);
    if (q.dateTo) rows = rows.filter((b) => b.created_at <= q.dateTo!);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((b) =>
        [b.booking_code, b.full_name, b.whatsapp_number, b.email ?? ""].some((v) =>
          v.toLowerCase().includes(s)
        )
      );
    }
    rows.sort((a, b) =>
      q.sort === "oldest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)
    );
    return rows;
  }

  async list(q: BookingListQuery) {
    const rows = this.filtered(q);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    const counts: Record<string, number> = {};
    for (const b of this.bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      counts,
    };
  }

  async get(id: string) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return null;
    return {
      booking,
      events: this.events
        .filter((e) => e.booking_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  async getByCode(code: string) {
    return this.bookings.find((b) => b.booking_code === code) ?? null;
  }

  async listForUser(userId: string) {
    return this.filtered({}).filter((b) => b.user_id === userId);
  }

  async update(id: string, patch: BookingUpdate, actor: string) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return null;
    const prev = booking.status;
    if (patch.status && patch.status !== prev) {
      this.event(id, "status_change", { previous_status: prev, new_status: patch.status, actor });
    }
    Object.assign(booking, patch, { updated_at: new Date().toISOString() });
    return booking;
  }

  async setPaymentState(
    id: string,
    patch: { payment_status: PaymentStatus; status?: BookingStatus; paid_at?: string | null; payment_expires_at?: string | null },
    actor: string,
    note?: string
  ) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return null;
    if (patch.payment_status !== booking.payment_status) {
      this.event(id, `payment_${patch.payment_status}`, { note: note ?? null, actor });
    }
    Object.assign(booking, patch, { updated_at: new Date().toISOString() });
    return booking;
  }

  async reopenPayment(id: string, expiresAt: Date) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return null;
    Object.assign(booking, {
      payment_status: "pending",
      status: "pending_payment",
      payment_expires_at: expiresAt.toISOString(),
    });
    return booking;
  }

  async expirePending() {
    const now = new Date().toISOString();
    const expired = this.bookings.filter(
      (b) => b.payment_status === "pending" && b.payment_expires_at && b.payment_expires_at < now
    );
    for (const b of expired) {
      b.payment_status = "expired";
      if (b.status === "pending_payment") b.status = "expired";
      this.event(b.id, "payment_expired");
    }
    return expired;
  }

  async exportRows(q: BookingListQuery) {
    return this.filtered(q);
  }
}

/* ================= Selection ================= */

declare global {
  var __werigoMemoryStore: MemoryBookingStore | undefined;
}

export function getBookingStore(): BookingStore {
  if (process.env.BOOKING_STORE === "memory") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_STORE !== "1") {
      console.warn(
        "[werigo] BOOKING_STORE=memory is for local testing only and was ignored in production."
      );
    } else {
      globalThis.__werigoMemoryStore ??= new MemoryBookingStore();
      return globalThis.__werigoMemoryStore;
    }
  }
  if (!isDatabaseConfigured()) {
    throw new StorageError("configuration_missing", {
      operation: "select_store",
      message: "DATABASE_URL is not set",
    });
  }
  return new PostgresBookingStore();
}
