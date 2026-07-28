import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase configuration and error taxonomy.
 *
 * Environment resolution (all values trimmed):
 *   URL:             SUPABASE_URL            → NEXT_PUBLIC_SUPABASE_URL
 *   Server key:      SUPABASE_SECRET_KEY     → SUPABASE_SERVICE_ROLE_KEY
 *   Publishable key: SUPABASE_PUBLISHABLE_KEY→ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Server-side database access (booking inserts, admin queries) uses
 * only the secret / service-role key — never the publishable key —
 * via a plain @supabase/supabase-js client with all session behavior
 * disabled. The SSR browser client is reserved for admin auth cookies.
 */

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function resolveSupabaseServerConfig() {
  return {
    url: env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: env("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    publishableKey: env(
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ),
  };
}

/**
 * True when a key is publishable/anon material — either the new
 * `sb_publishable_` format or a legacy JWT whose role claim is
 * `anon`. Such a key must never be used for server-side writes.
 */
export function isPublishableKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      ) as { role?: string };
      return payload.role === "anon";
    } catch {
      /* not a JWT — assume server key format */
    }
  }
  return false;
}

/* ================= Error taxonomy ================= */

export type StorageErrorCategory =
  | "configuration_missing"
  | "authentication_failed"
  | "database_unreachable"
  | "schema_mismatch"
  | "constraint_failed"
  | "insert_failed";

export interface StorageErrorDetail {
  operation: string;
  code?: string;
  status?: number;
  message?: string;
  details?: string;
  hint?: string;
}

export class StorageError extends Error {
  readonly category: StorageErrorCategory;
  readonly detail: StorageErrorDetail;

  constructor(category: StorageErrorCategory, detail: StorageErrorDetail) {
    super(category);
    this.name = "StorageError";
    this.category = category;
    this.detail = detail;
  }
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

function classify(
  code: string | undefined,
  status: number | undefined,
  message: string
): StorageErrorCategory {
  if (
    /fetch failed|network|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ETIMEDOUT|UND_ERR|socket|abort/i.test(
      message
    )
  ) {
    return "database_unreachable";
  }
  if (status === 401 || status === 403) return "authentication_failed";
  if (
    code === "PGRST301" ||
    code === "PGRST302" ||
    /invalid api key|jwt|api key|invalid header|ByteString/i.test(message)
  ) {
    return "authentication_failed";
  }
  // PostgREST schema-cache misses (missing table / column / function)
  // and Postgres 42xxx (undefined table/column/function, permission)
  if (code === "PGRST202" || code === "PGRST204" || code === "PGRST205") {
    return "schema_mismatch";
  }
  if (code && /^42/.test(code)) return "schema_mismatch";
  // Integrity violations and bad input values (enum/uuid/timestamp)
  if (code && (/^23/.test(code) || /^22/.test(code))) {
    return "constraint_failed";
  }
  return "insert_failed";
}

/** Build a typed StorageError from a PostgREST error response. */
export function storageErrorFrom(
  operation: string,
  error: PostgrestLikeError,
  status?: number
): StorageError {
  return new StorageError(
    classify(error.code, status, error.message ?? ""),
    {
      operation,
      code: error.code || undefined,
      status,
      message: error.message ?? undefined,
      details: error.details ?? undefined,
      hint: error.hint ?? undefined,
    }
  );
}

/** Wrap a thrown (non-PostgREST) failure, e.g. a fetch/DNS error. */
export function storageErrorFromThrown(
  operation: string,
  err: unknown
): StorageError {
  if (err instanceof StorageError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new StorageError(classify(undefined, undefined, message), {
    operation,
    message,
  });
}

/**
 * Redact anything that could be customer data before logging:
 * `Key (col)=(value)` pairs from Postgres detail strings, email
 * addresses, and long digit runs (phone numbers).
 */
function redact(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\([^()]*\)=\([^()]*\)/g, "(…)=(…)")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "…@…")
    .replace(/\+?\d{8,}/g, "…")
    .slice(0, 300)
    .trim();
}

/**
 * Safe server logging: category, Supabase error code, HTTP status,
 * redacted message/details/hint, operation name. Never credentials,
 * payloads, or personal data.
 */
export function logStorageError(e: StorageError): void {
  const d = e.detail;
  const parts = [
    `[bookings] ${d.operation} failed: category=${e.category}`,
    d.code ? `code=${d.code}` : "",
    d.status !== undefined ? `status=${d.status}` : "",
    d.message ? `message="${redact(d.message)}"` : "",
    d.details ? `details="${redact(d.details)}"` : "",
    d.hint ? `hint="${redact(d.hint)}"` : "",
  ].filter(Boolean);
  console.error(parts.join(" "));
}

/* ================= Server client ================= */

/**
 * Admin (service) client for server-side database work. Throws a
 * typed StorageError instead of silently proceeding when the
 * configuration is missing or the key material is wrong.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const { url, secretKey } = resolveSupabaseServerConfig();
  if (!url || !secretKey) {
    throw new StorageError("configuration_missing", {
      operation: "client_init",
      message: "Supabase URL or server key is not set",
    });
  }
  if (isPublishableKey(secretKey)) {
    throw new StorageError("configuration_missing", {
      operation: "client_init",
      message:
        "server key resolves to a publishable/anon key; set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) to the secret key",
    });
  }
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
