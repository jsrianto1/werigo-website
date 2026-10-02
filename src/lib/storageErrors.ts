/**
 * Storage error taxonomy for the PostgreSQL-backed booking storage.
 *
 * Every database failure is reduced to a small set of categories so
 * API routes can answer with the right status and the logs stay
 * readable (and free of personal data). This module has no server
 * imports so it can be shared by scripts and tests.
 */

export type StorageErrorCategory =
  | "configuration_missing"
  | "authentication_failed"
  | "database_unreachable"
  | "schema_mismatch"
  | "constraint_failed"
  | "insert_failed";

export interface StorageErrorDetail {
  operation: string;
  /** PostgreSQL SQLSTATE (e.g. 23505) or Node errno (e.g. ECONNREFUSED). */
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
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

interface PgLikeError {
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
}

function classify(code: string | undefined, message: string): StorageErrorCategory {
  if (
    /ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|timeout exceeded|Connection terminated|socket hang up/i.test(
      message
    )
  ) {
    return "database_unreachable";
  }
  if (code) {
    // 08xxx connection exception, 57P01 admin shutdown, 53300 too many connections
    if (/^08/.test(code) || code === "57P01" || code === "53300") return "database_unreachable";
    // 28xxx invalid authorization / password
    if (/^28/.test(code)) return "authentication_failed";
    // 3D000 unknown database, 42xxx undefined table/column/function, permission
    if (code === "3D000" || /^42/.test(code)) return "schema_mismatch";
    // 23xxx integrity violations, 22xxx bad input values (enum/uuid/timestamp)
    if (/^23/.test(code) || /^22/.test(code)) return "constraint_failed";
  }
  if (/certificate|self[- ]signed|TLS|SSL/i.test(message)) return "authentication_failed";
  if (/password authentication failed|no pg_hba\.conf entry/i.test(message)) {
    return "authentication_failed";
  }
  return "insert_failed";
}

/** Wrap any thrown failure (pg error, network error, …) in a StorageError. */
export function storageErrorFromThrown(operation: string, err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const e = (typeof err === "object" && err !== null ? err : {}) as PgLikeError;
  const message = err instanceof Error ? err.message : String(err);
  return new StorageError(classify(e.code, message), {
    operation,
    code: e.code,
    message,
    detail: e.detail,
    hint: e.hint,
    constraint: e.constraint,
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
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "postgresql://…")
    .slice(0, 300)
    .trim();
}

/**
 * Safe server logging: category, SQLSTATE, redacted message, detail,
 * hint, operation name. Never credentials, payloads, or personal data.
 */
export function logStorageError(e: StorageError): void {
  const d = e.detail;
  const parts = [
    `[bookings] ${d.operation} failed: category=${e.category}`,
    d.code ? `code=${d.code}` : "",
    d.constraint ? `constraint=${d.constraint}` : "",
    d.message ? `message="${redact(d.message)}"` : "",
    d.detail ? `detail="${redact(d.detail)}"` : "",
    d.hint ? `hint="${redact(d.hint)}"` : "",
  ].filter(Boolean);
  console.error(parts.join(" "));
}
