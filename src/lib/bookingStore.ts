import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingSubmission } from "@/lib/bookingSchema";
import {
  createSupabaseAdminClient,
  resolveSupabaseServerConfig,
  StorageError,
  storageErrorFrom,
  storageErrorFromThrown,
} from "@/lib/supabaseServer";

/**
 * Server-side booking storage.
 *
 * Default driver: Supabase PostgreSQL via the service-role key
 * (server-only; RLS denies all direct client access).
 *
 * Test driver: an in-memory store enabled ONLY by BOOKING_STORE=memory
 * — used by the automated local test suite so the full API flow
 * (validation → insert → booking code → idempotency → WhatsApp gating)
 * can be verified without live credentials. It is never selected in
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
  email: string;
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
    email: s.email,
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

/* ================= Supabase driver ================= */

class SupabaseBookingStore implements BookingStore {
  private client: SupabaseClient;

  constructor() {
    // Plain supabase-js client on the secret/service-role key with all
    // session behavior disabled — never the SSR browser client, never
    // the publishable key (createSupabaseAdminClient enforces both).
    this.client = createSupabaseAdminClient();
  }

  async create(submission: BookingSubmission) {
    const row = submissionToRow(submission);
    let data: unknown;
    let error: { code?: string; message?: string; details?: string | null; hint?: string | null } | null;
    let status: number | undefined;
    try {
      ({ data, error, status } = await this.client
        .from("bookings")
        .insert(row)
        .select()
        .single());
    } catch (err) {
      throw storageErrorFromThrown("insert_booking", err);
    }

    if (error) {
      // Unique violation on client_submission_id → idempotent replay
      if (error.code === "23505") {
        const {
          data: existing,
          error: err2,
          status: status2,
        } = await this.client
          .from("bookings")
          .select()
          .eq("client_submission_id", submission.clientSubmissionId)
          .single();
        if (err2 || !existing) {
          throw storageErrorFrom(
            "idempotent_replay",
            err2 ?? { message: "duplicate row not found" },
            status2
          );
        }
        return { booking: existing as StoredBooking, duplicate: true };
      }
      throw storageErrorFrom("insert_booking", error, status);
    }

    await this.client.from("booking_events").insert({
      booking_id: (data as StoredBooking).id,
      event_type: "created",
      new_status: "new",
      actor: "customer",
    });
    return { booking: data as StoredBooking, duplicate: false };
  }

  private applyFilters<
    T extends {
      eq(col: string, v: string): T;
      gte(col: string, v: string): T;
      lte(col: string, v: string): T;
      or(filters: string): T;
    },
  >(q: BookingListQuery, builder: T): T {
    let b = builder;
    if (q.status) b = b.eq("status", q.status);
    if (q.model) b = b.eq("vehicle_model", q.model);
    if (q.pickupArea) b = b.eq("pickup_area", q.pickupArea);
    if (q.source) b = b.eq("source_page", q.source);
    if (q.dateFrom) b = b.gte("created_at", q.dateFrom);
    if (q.dateTo) b = b.lte("created_at", q.dateTo);
    if (q.search) {
      const s = q.search.replace(/[%,()]/g, " ").trim();
      b = b.or(
        `booking_code.ilike.%${s}%,full_name.ilike.%${s}%,whatsapp_number.ilike.%${s}%,email.ilike.%${s}%`
      );
    }
    return b;
  }

  async list(q: BookingListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    let builder = this.client.from("bookings").select("*", { count: "exact" });
    builder = this.applyFilters(q, builder);
    builder = builder
      .order("created_at", { ascending: q.sort === "oldest" })
      .range((page - 1) * pageSize, page * pageSize - 1);
    const { data, count, error, status } = await builder;
    if (error) throw storageErrorFrom("list_bookings", error, status);

    // status counts (unfiltered summary)
    const counts: Record<string, number> = {};
    const { data: countRows, error: cErr } = await this.client.rpc("booking_status_counts");
    if (!cErr && Array.isArray(countRows)) {
      for (const r of countRows) counts[r.status] = Number(r.n);
    } else {
      // fallback: single query per interesting status
      const statuses = ["new", "contacted", "quoted", "confirmed", "active", "completed", "cancelled", "no_response"];
      for (const st of statuses) {
        const { count: n } = await this.client
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", st);
        counts[st] = n ?? 0;
      }
    }
    return { rows: (data ?? []) as StoredBooking[], total: count ?? 0, counts };
  }

  async get(id: string) {
    const { data, error } = await this.client.from("bookings").select().eq("id", id).single();
    if (error || !data) return null;
    const { data: events } = await this.client
      .from("booking_events")
      .select()
      .eq("booking_id", id)
      .order("created_at", { ascending: false });
    return { booking: data as StoredBooking, events: (events ?? []) as BookingEvent[] };
  }

  async update(id: string, patch: BookingUpdate, actor: string) {
    const before = await this.get(id);
    if (!before) return null;
    const { data, error } = await this.client
      .from("bookings")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    const events: object[] = [];
    if (patch.status && patch.status !== before.booking.status) {
      events.push({
        booking_id: id,
        event_type: "status_change",
        previous_status: before.booking.status,
        new_status: patch.status,
        actor,
      });
    }
    if (patch.internal_notes !== undefined && patch.internal_notes !== (before.booking.internal_notes ?? "")) {
      events.push({ booking_id: id, event_type: "note_updated", actor });
    }
    if (patch.assigned_to !== undefined && patch.assigned_to !== (before.booking.assigned_to ?? "")) {
      events.push({ booking_id: id, event_type: "assigned", note: patch.assigned_to || "unassigned", actor });
    }
    if (patch.follow_up_at !== undefined) {
      events.push({ booking_id: id, event_type: "follow_up_set", note: patch.follow_up_at ?? "cleared", actor });
    }
    if (events.length > 0) await this.client.from("booking_events").insert(events);
    return data as StoredBooking;
  }

  async exportRows(q: BookingListQuery) {
    let builder = this.client.from("bookings").select("*");
    builder = this.applyFilters(q, builder);
    builder = builder.order("created_at", { ascending: q.sort === "oldest" }).limit(5000);
    const { data, error, status } = await builder;
    if (error) throw storageErrorFrom("export_bookings", error, status);
    return (data ?? []) as StoredBooking[];
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
        [b.booking_code, b.full_name, b.whatsapp_number, b.email].some((v) =>
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
  const { url, secretKey } = resolveSupabaseServerConfig();
  if (!url || !secretKey) {
    throw new StorageError("configuration_missing", {
      operation: "select_store",
      message: "Supabase URL or server key is not set",
    });
  }
  return new SupabaseBookingStore();
}
