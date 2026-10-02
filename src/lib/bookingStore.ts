import "server-only";
import type { PoolClient } from "pg";
import type { BookingSubmission } from "@/lib/bookingSchema";
import { getPool, isDatabaseConfigured, withTransaction } from "@/lib/db";
import { StorageError, storageErrorFromThrown } from "@/lib/storageErrors";

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

export interface StoredBooking {
  id: string;
  booking_code: string;
  client_submission_id: string;
  created_at: string;
  updated_at: string;
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
  status: string;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  privacy_consent_at: string;
  assigned_to: string | null;
  internal_notes: string | null;
  follow_up_at: string | null;
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
}

export interface BookingStore {
  /** Insert; if client_submission_id already exists, return the existing row (idempotent). */
  create(submission: BookingSubmission): Promise<{ booking: StoredBooking; duplicate: boolean }>;
  list(q: BookingListQuery): Promise<{ rows: StoredBooking[]; total: number; counts: Record<string, number> }>;
  get(id: string): Promise<{ booking: StoredBooking; events: BookingEvent[] } | null>;
  update(id: string, patch: BookingUpdate, actor: string): Promise<StoredBooking | null>;
  exportRows(q: BookingListQuery): Promise<StoredBooking[]>;
}

function submissionToRow(s: BookingSubmission) {
  return {
    client_submission_id: s.clientSubmissionId,
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

const STATUSES = ["new", "contacted", "quoted", "confirmed", "active", "completed", "cancelled", "no_response"];

class PostgresBookingStore implements BookingStore {
  async create(submission: BookingSubmission) {
    const row = submissionToRow(submission);
    const cols = Object.keys(row);
    const values = Object.values(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

    try {
      return await withTransaction(async (client) => {
        let inserted: Record<string, unknown> | undefined;
        try {
          // The unique index on client_submission_id makes retries idempotent.
          const res = await client.query(
            `insert into bookings (${cols.join(", ")}) values (${placeholders})
             on conflict (client_submission_id) do nothing
             returning *`,
            values
          );
          inserted = res.rows[0];
        } catch (err) {
          throw storageErrorFromThrown("insert_booking", err);
        }

        if (!inserted) {
          const existing = await client.query(
            "select * from bookings where client_submission_id = $1",
            [submission.clientSubmissionId]
          );
          if (!existing.rows[0]) {
            throw new StorageError("insert_failed", {
              operation: "idempotent_replay",
              message: "duplicate row not found",
            });
          }
          return { booking: normalizeRow<StoredBooking>(existing.rows[0]), duplicate: true };
        }

        await client.query(
          `insert into booking_events (booking_id, event_type, new_status, actor)
           values ($1, 'created', 'new', 'customer')`,
          [inserted.id]
        );
        return { booking: normalizeRow<StoredBooking>(inserted), duplicate: false };
      });
    } catch (err) {
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
      for (const st of STATUSES) counts[st] = 0;
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

  async create(s: BookingSubmission) {
    if (process.env.SIMULATE_DB_FAILURE === "1") {
      throw new StorageError("insert_failed", {
        operation: "insert_booking",
        message: "simulated database failure (test-only)",
      });
    }
    const existing = this.bookings.find((b) => b.client_submission_id === s.clientSubmissionId);
    if (existing) return { booking: existing, duplicate: true };
    const now = new Date().toISOString();
    const row = submissionToRow(s);
    const booking: StoredBooking = {
      id: crypto.randomUUID(),
      booking_code: this.code(),
      created_at: now,
      updated_at: now,
      status: "new",
      assigned_to: null,
      internal_notes: null,
      follow_up_at: null,
      ...row,
    } as StoredBooking;
    this.bookings.push(booking);
    this.events.push({
      id: crypto.randomUUID(),
      booking_id: booking.id,
      event_type: "created",
      previous_status: null,
      new_status: "new",
      note: null,
      actor: "customer",
      created_at: now,
    });
    return { booking, duplicate: false };
  }

  private filtered(q: BookingListQuery) {
    let rows = [...this.bookings];
    if (q.status) rows = rows.filter((b) => b.status === q.status);
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

  async update(id: string, patch: BookingUpdate, actor: string) {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return null;
    const prev = booking.status;
    if (patch.status && patch.status !== prev) {
      this.events.push({
        id: crypto.randomUUID(), booking_id: id, event_type: "status_change",
        previous_status: prev, new_status: patch.status, note: null,
        actor, created_at: new Date().toISOString(),
      });
    }
    Object.assign(booking, patch, { updated_at: new Date().toISOString() });
    return booking;
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
