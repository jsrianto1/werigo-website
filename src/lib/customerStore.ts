import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CapturedSubmission } from "@/lib/leadSchema";
import {
  createSupabaseAdminClient,
  resolveSupabaseServerConfig,
  StorageError,
  storageErrorFrom,
} from "@/lib/supabaseServer";

/**
 * Customer database access.
 *
 * Two tables (see supabase/migrations/20260803090000_customers.sql):
 *   customers         one deduplicated row per person
 *   form_submissions  one immutable row per form fill
 *
 * Writes go through the `capture_submission` SQL function so the
 * replay check, the customer upsert and the insert all happen inside
 * a single transaction. Everything runs on the server with the secret
 * key; RLS denies the browser outright.
 *
 * A memory driver mirrors the same behaviour for the automated tests
 * (LEAD_STORE=memory, or the shared BOOKING_STORE=memory switch).
 */

export interface StoredCustomer {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  nationality: string | null;
  first_seen_at: string;
  last_seen_at: string;
  submissions_count: number;
  booking_requests_count: number;
  contact_messages_count: number;
  first_source_page: string | null;
  last_source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  privacy_consent_at: string | null;
  marketing_consent: boolean;
  status: string;
  assigned_to: string | null;
  internal_notes: string | null;
  tags: string[];
}

export interface StoredSubmission extends CapturedSubmission {
  id: string;
  reference_code: string;
  customer_id: string;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  internal_notes: string | null;
}

export interface CustomerListQuery {
  search?: string;
  status?: string;
  formType?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}

export interface CustomerUpdate {
  status?: string;
  internal_notes?: string;
  assigned_to?: string;
  marketing_consent?: boolean;
}

export interface SubmissionUpdate {
  status?: string;
  internal_notes?: string;
}

export interface CaptureResult {
  customerId: string;
  submission: StoredSubmission;
  duplicate: boolean;
}

export interface CustomerStore {
  /** Store one form fill. Idempotent on client_submission_id. */
  capture(submission: CapturedSubmission): Promise<CaptureResult>;
  listCustomers(
    q: CustomerListQuery
  ): Promise<{ rows: StoredCustomer[]; total: number; counts: Record<string, number> }>;
  getCustomer(
    id: string
  ): Promise<{ customer: StoredCustomer; submissions: StoredSubmission[] } | null>;
  updateCustomer(id: string, patch: CustomerUpdate): Promise<StoredCustomer | null>;
  listSubmissions(
    q: CustomerListQuery
  ): Promise<{ rows: StoredSubmission[]; total: number; counts: Record<string, number> }>;
  updateSubmission(id: string, patch: SubmissionUpdate): Promise<StoredSubmission | null>;
  exportCustomers(q: CustomerListQuery): Promise<StoredCustomer[]>;
  exportSubmissions(q: CustomerListQuery): Promise<StoredSubmission[]>;
}

const EXPORT_LIMIT = 5000;

/* ================= Supabase driver ================= */

class SupabaseCustomerStore implements CustomerStore {
  private client: SupabaseClient;

  constructor() {
    this.client = createSupabaseAdminClient();
  }

  async capture(submission: CapturedSubmission): Promise<CaptureResult> {
    const { data, error, status } = await this.client.rpc("capture_submission", {
      p: submission,
    });
    if (error) throw storageErrorFrom("capture_submission", error, status);
    const result = data as {
      duplicate: boolean;
      customer_id: string;
      submission: StoredSubmission;
    } | null;
    if (!result?.submission) {
      throw new StorageError("insert_failed", {
        operation: "capture_submission",
        message: "capture_submission returned no row",
      });
    }
    return {
      customerId: result.customer_id,
      submission: result.submission,
      duplicate: Boolean(result.duplicate),
    };
  }

  private applyCustomerFilters<
    T extends {
      eq(col: string, v: string | boolean): T;
      gte(col: string, v: string): T;
      lte(col: string, v: string): T;
      or(filters: string): T;
    },
  >(q: CustomerListQuery, builder: T): T {
    let b = builder;
    if (q.status) b = b.eq("status", q.status);
    if (q.source) b = b.eq("last_source_page", q.source);
    if (q.dateFrom) b = b.gte("created_at", q.dateFrom);
    if (q.dateTo) b = b.lte("created_at", q.dateTo);
    if (q.search) {
      const s = q.search.replace(/[%,()]/g, " ").trim();
      b = b.or(
        `full_name.ilike.%${s}%,email.ilike.%${s}%,whatsapp_number.ilike.%${s}%`
      );
    }
    return b;
  }

  private applySubmissionFilters<
    T extends {
      eq(col: string, v: string): T;
      gte(col: string, v: string): T;
      lte(col: string, v: string): T;
      or(filters: string): T;
    },
  >(q: CustomerListQuery, builder: T): T {
    let b = builder;
    if (q.status) b = b.eq("status", q.status);
    if (q.formType) b = b.eq("form_type", q.formType);
    if (q.source) b = b.eq("source_page", q.source);
    if (q.dateFrom) b = b.gte("created_at", q.dateFrom);
    if (q.dateTo) b = b.lte("created_at", q.dateTo);
    if (q.search) {
      const s = q.search.replace(/[%,()]/g, " ").trim();
      b = b.or(
        `reference_code.ilike.%${s}%,full_name.ilike.%${s}%,email.ilike.%${s}%,whatsapp_number.ilike.%${s}%,message.ilike.%${s}%`
      );
    }
    return b;
  }

  private range(q: CustomerListQuery) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    return { from: (page - 1) * pageSize, to: page * pageSize - 1 };
  }

  async listCustomers(q: CustomerListQuery) {
    let builder = this.client.from("customers").select("*", { count: "exact" });
    builder = this.applyCustomerFilters(q, builder);
    const { from, to } = this.range(q);
    const { data, count, error, status } = await builder
      .order("last_seen_at", { ascending: q.sort === "oldest" })
      .range(from, to);
    if (error) throw storageErrorFrom("list_customers", error, status);

    const counts: Record<string, number> = {};
    const { data: countRows, error: cErr } = await this.client.rpc(
      "customer_status_counts"
    );
    if (!cErr && Array.isArray(countRows)) {
      for (const r of countRows) counts[r.status] = Number(r.n);
    }
    const { data: typeRows, error: tErr } = await this.client.rpc(
      "submission_type_counts"
    );
    if (!tErr && Array.isArray(typeRows)) {
      for (const r of typeRows) counts[r.form_type] = Number(r.n);
    }
    return { rows: (data ?? []) as StoredCustomer[], total: count ?? 0, counts };
  }

  async getCustomer(id: string) {
    const { data, error } = await this.client
      .from("customers")
      .select()
      .eq("id", id)
      .single();
    if (error || !data) return null;
    const { data: submissions } = await this.client
      .from("form_submissions")
      .select()
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    return {
      customer: data as StoredCustomer,
      submissions: (submissions ?? []) as StoredSubmission[],
    };
  }

  async updateCustomer(id: string, patch: CustomerUpdate) {
    const { data, error, status } = await this.client
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // no row matched
      throw storageErrorFrom("update_customer", error, status);
    }
    return (data ?? null) as StoredCustomer | null;
  }

  async listSubmissions(q: CustomerListQuery) {
    let builder = this.client.from("form_submissions").select("*", { count: "exact" });
    builder = this.applySubmissionFilters(q, builder);
    const { from, to } = this.range(q);
    const { data, count, error, status } = await builder
      .order("created_at", { ascending: q.sort === "oldest" })
      .range(from, to);
    if (error) throw storageErrorFrom("list_submissions", error, status);

    const counts: Record<string, number> = {};
    const { data: typeRows, error: tErr } = await this.client.rpc(
      "submission_type_counts"
    );
    if (!tErr && Array.isArray(typeRows)) {
      for (const r of typeRows) counts[r.form_type] = Number(r.n);
    }
    return { rows: (data ?? []) as StoredSubmission[], total: count ?? 0, counts };
  }

  async updateSubmission(id: string, patch: SubmissionUpdate) {
    const { data, error, status } = await this.client
      .from("form_submissions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw storageErrorFrom("update_submission", error, status);
    }
    return (data ?? null) as StoredSubmission | null;
  }

  async exportCustomers(q: CustomerListQuery) {
    let builder = this.client.from("customers").select("*");
    builder = this.applyCustomerFilters(q, builder);
    const { data, error, status } = await builder
      .order("last_seen_at", { ascending: q.sort === "oldest" })
      .limit(EXPORT_LIMIT);
    if (error) throw storageErrorFrom("export_customers", error, status);
    return (data ?? []) as StoredCustomer[];
  }

  async exportSubmissions(q: CustomerListQuery) {
    let builder = this.client.from("form_submissions").select("*");
    builder = this.applySubmissionFilters(q, builder);
    const { data, error, status } = await builder
      .order("created_at", { ascending: q.sort === "oldest" })
      .limit(EXPORT_LIMIT);
    if (error) throw storageErrorFrom("export_submissions", error, status);
    return (data ?? []) as StoredSubmission[];
  }
}

/* ================= Memory driver (tests only) ================= */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

class MemoryCustomerStore implements CustomerStore {
  private customers: StoredCustomer[] = [];
  private submissions: StoredSubmission[] = [];

  private ref(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const candidate = `WRG-L-${ymd}-${suffix}`;
    return this.submissions.some((s) => s.reference_code === candidate)
      ? this.ref()
      : candidate;
  }

  /** Mirrors public.upsert_customer: match on number, then on email. */
  private upsertCustomer(s: CapturedSubmission): StoredCustomer {
    const email = s.email?.toLowerCase() ?? null;
    const now = new Date().toISOString();
    let existing = s.whatsapp_number
      ? this.customers.find((c) => c.whatsapp_number === s.whatsapp_number)
      : undefined;
    if (!existing && email) {
      existing = this.customers.find((c) => c.email?.toLowerCase() === email);
    }
    if (existing) {
      existing.full_name = s.full_name || existing.full_name;
      existing.first_name ??= s.first_name;
      existing.last_name ??= s.last_name;
      if (!existing.email && email && !this.customers.some((c) => c.email?.toLowerCase() === email)) {
        existing.email = email;
      }
      if (
        !existing.whatsapp_number &&
        s.whatsapp_number &&
        !this.customers.some((c) => c.whatsapp_number === s.whatsapp_number)
      ) {
        existing.whatsapp_number = s.whatsapp_number;
      }
      existing.nationality ??= s.nationality;
      existing.last_seen_at = now;
      existing.updated_at = now;
      existing.last_source_page = s.source_page ?? existing.last_source_page;
      existing.privacy_consent_at = s.privacy_consent_at;
      existing.submissions_count += 1;
      if (s.form_type === "booking_request") existing.booking_requests_count += 1;
      else existing.contact_messages_count += 1;
      return existing;
    }
    const customer: StoredCustomer = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      full_name: s.full_name || "Unknown",
      first_name: s.first_name,
      last_name: s.last_name,
      email,
      whatsapp_number: s.whatsapp_number,
      nationality: s.nationality,
      first_seen_at: now,
      last_seen_at: now,
      submissions_count: 1,
      booking_requests_count: s.form_type === "booking_request" ? 1 : 0,
      contact_messages_count: s.form_type === "contact_message" ? 1 : 0,
      first_source_page: s.source_page,
      last_source_page: s.source_page,
      utm_source: s.utm_source,
      utm_medium: s.utm_medium,
      utm_campaign: s.utm_campaign,
      privacy_consent_at: s.privacy_consent_at,
      marketing_consent: false,
      status: "lead",
      assigned_to: null,
      internal_notes: null,
      tags: [],
    };
    this.customers.push(customer);
    return customer;
  }

  async capture(submission: CapturedSubmission): Promise<CaptureResult> {
    if (process.env.SIMULATE_DB_FAILURE === "1") {
      throw new StorageError("insert_failed", {
        operation: "capture_submission",
        message: "simulated database failure (test-only)",
      });
    }
    const replay = this.submissions.find(
      (s) => s.client_submission_id === submission.client_submission_id
    );
    if (replay) {
      return { customerId: replay.customer_id, submission: replay, duplicate: true };
    }
    const customer = this.upsertCustomer(submission);
    const now = new Date().toISOString();
    const row: StoredSubmission = {
      ...submission,
      id: crypto.randomUUID(),
      reference_code: this.ref(),
      customer_id: customer.id,
      booking_id: null,
      created_at: now,
      updated_at: now,
      status: "new",
      internal_notes: null,
    };
    this.submissions.push(row);
    return { customerId: customer.id, submission: row, duplicate: false };
  }

  private filterCustomers(q: CustomerListQuery) {
    let rows = [...this.customers];
    if (q.status) rows = rows.filter((c) => c.status === q.status);
    if (q.source) rows = rows.filter((c) => c.last_source_page === q.source);
    if (q.dateFrom) rows = rows.filter((c) => c.created_at >= q.dateFrom!);
    if (q.dateTo) rows = rows.filter((c) => c.created_at <= q.dateTo!);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((c) =>
        [c.full_name, c.email ?? "", c.whatsapp_number ?? ""].some((v) =>
          v.toLowerCase().includes(s)
        )
      );
    }
    rows.sort((a, b) =>
      q.sort === "oldest"
        ? a.last_seen_at.localeCompare(b.last_seen_at)
        : b.last_seen_at.localeCompare(a.last_seen_at)
    );
    return rows;
  }

  private filterSubmissions(q: CustomerListQuery) {
    let rows = [...this.submissions];
    if (q.status) rows = rows.filter((s) => s.status === q.status);
    if (q.formType) rows = rows.filter((s) => s.form_type === q.formType);
    if (q.source) rows = rows.filter((s) => s.source_page === q.source);
    if (q.dateFrom) rows = rows.filter((s) => s.created_at >= q.dateFrom!);
    if (q.dateTo) rows = rows.filter((s) => s.created_at <= q.dateTo!);
    if (q.search) {
      const t = q.search.toLowerCase();
      rows = rows.filter((s) =>
        [s.reference_code, s.full_name, s.email ?? "", s.whatsapp_number ?? "", s.message ?? ""].some(
          (v) => v.toLowerCase().includes(t)
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

  private counts() {
    const counts: Record<string, number> = {};
    for (const c of this.customers) counts[c.status] = (counts[c.status] ?? 0) + 1;
    for (const s of this.submissions) {
      counts[s.form_type] = (counts[s.form_type] ?? 0) + 1;
    }
    return counts;
  }

  async listCustomers(q: CustomerListQuery) {
    const rows = this.filterCustomers(q);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      counts: this.counts(),
    };
  }

  async getCustomer(id: string) {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) return null;
    return {
      customer,
      submissions: this.submissions
        .filter((s) => s.customer_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  async updateCustomer(id: string, patch: CustomerUpdate) {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) return null;
    Object.assign(customer, patch, { updated_at: new Date().toISOString() });
    return customer;
  }

  async listSubmissions(q: CustomerListQuery) {
    const rows = this.filterSubmissions(q);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      counts: this.counts(),
    };
  }

  async updateSubmission(id: string, patch: SubmissionUpdate) {
    const row = this.submissions.find((s) => s.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: new Date().toISOString() });
    return row;
  }

  async exportCustomers(q: CustomerListQuery) {
    return this.filterCustomers(q).slice(0, EXPORT_LIMIT);
  }

  async exportSubmissions(q: CustomerListQuery) {
    return this.filterSubmissions(q).slice(0, EXPORT_LIMIT);
  }
}

/* ================= Selection ================= */

declare global {
  var __werigoMemoryCustomerStore: MemoryCustomerStore | undefined;
}

/** True when a Supabase URL and server key are configured. */
export function customerStoreConfigured(): boolean {
  if ((process.env.LEAD_STORE ?? process.env.BOOKING_STORE) === "memory") {
    return true;
  }
  const { url, secretKey } = resolveSupabaseServerConfig();
  return Boolean(url && secretKey);
}

export function getCustomerStore(): CustomerStore {
  if ((process.env.LEAD_STORE ?? process.env.BOOKING_STORE) === "memory") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_STORE !== "1") {
      console.warn(
        "[werigo] LEAD_STORE=memory is for local testing only and was ignored in production."
      );
    } else {
      globalThis.__werigoMemoryCustomerStore ??= new MemoryCustomerStore();
      return globalThis.__werigoMemoryCustomerStore;
    }
  }
  const { url, secretKey } = resolveSupabaseServerConfig();
  if (!url || !secretKey) {
    throw new StorageError("configuration_missing", {
      operation: "select_customer_store",
      message: "Supabase URL or server key is not set",
    });
  }
  return new SupabaseCustomerStore();
}
