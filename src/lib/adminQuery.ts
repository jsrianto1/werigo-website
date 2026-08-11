import type { CustomerListQuery } from "@/lib/customerStore";

/**
 * Shared list-query parsing for the customer admin routes. Values are
 * passed through untouched: filtering, escaping and paging limits are
 * enforced in the store.
 */
export function parseCustomerQuery(p: URLSearchParams): CustomerListQuery {
  return {
    search: p.get("search") ?? undefined,
    status: p.get("status") ?? undefined,
    formType: p.get("formType") ?? undefined,
    source: p.get("source") ?? undefined,
    dateFrom: p.get("dateFrom") ?? undefined,
    dateTo: p.get("dateTo") ?? undefined,
    sort: p.get("sort") === "oldest" ? "oldest" : "newest",
    page: Number(p.get("page") ?? 1),
    pageSize: Number(p.get("pageSize") ?? 20),
  };
}

/** RFC 4180 escaping for CSV export. */
export function csvEscape(v: unknown): string {
  const s =
    v === null || v === undefined
      ? ""
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
