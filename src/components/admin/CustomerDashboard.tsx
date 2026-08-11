"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  LogOut,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Customer database dashboard: everyone who has filled in a form on
 * werigo.co, and every submission they sent. Internal screen, so the
 * copy rules for customer-facing text do not apply here.
 */

const CUSTOMER_STATUSES = ["lead", "contacted", "customer", "archived", "blocked"] as const;
const SUBMISSION_STATUSES = ["new", "contacted", "handled", "spam", "archived"] as const;

const STATUS_STYLES: Record<string, string> = {
  lead: "bg-primary-faint text-primary",
  contacted: "bg-warn-soft text-warn",
  customer: "bg-ok-soft text-ok",
  archived: "bg-sunken text-ink-faint",
  blocked: "bg-danger-soft text-danger",
  new: "bg-primary-faint text-primary",
  handled: "bg-ok-soft text-ok",
  spam: "bg-danger-soft text-danger",
};

interface CustomerRow {
  id: string;
  created_at: string;
  full_name: string;
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
}

interface SubmissionRow {
  id: string;
  reference_code: string;
  customer_id: string;
  created_at: string;
  form_type: string;
  status: string;
  full_name: string;
  email: string | null;
  whatsapp_number: string | null;
  nationality: string | null;
  message: string | null;
  vehicle_model: string | null;
  quantity: number | null;
  pickup_area: string | null;
  pickup_address: string | null;
  return_area: string | null;
  hotel_name: string | null;
  flight_number: string | null;
  start_at: string | null;
  end_at: string | null;
  rental_days: number | null;
  rate_per_day_idr: number | null;
  estimated_total_idr: number | null;
  promo_code: string | null;
  extras: { id: string; name: string; quantity: number }[];
  terms_accepted: boolean;
  battery_ack: boolean;
  age_confirmed: boolean | null;
  privacy_consent_at: string;
  handoff_channel: string;
  source_page: string | null;
  referrer: string | null;
  locale: string | null;
  details: Record<string, unknown>;
  internal_notes: string | null;
}

type Tab = "customers" | "submissions";

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Asia/Makassar",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const idr = (n: number | null) =>
  n === null || n === undefined ? "—" : `Rp ${n.toLocaleString("en-US")}`;

export function CustomerDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [formType, setFormType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // detail panel
  const [detail, setDetail] = useState<{
    customer: CustomerRow;
    submissions: SubmissionRow[];
  } | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const queryString = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (formType) p.set("formType", formType);
    if (dateFrom) p.set("dateFrom", `${dateFrom}T00:00:00+08:00`);
    if (dateTo) p.set("dateTo", `${dateTo}T23:59:59+08:00`);
    p.set("sort", sort);
    return p;
  }, [search, status, formType, dateFrom, dateTo, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = queryString();
      p.set("page", String(page));
      p.set("pageSize", String(pageSize));
      const path = tab === "customers" ? "customers" : "submissions";
      const res = await fetch(`/api/admin/${path}?${p.toString()}`);
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      if (!data.ok) throw new Error();
      if (tab === "customers") setCustomers(data.rows);
      else setSubmissions(data.rows);
      setTotal(data.total);
      setCounts(data.counts ?? {});
    } catch {
      setError("Couldn't load the customer database. Check the connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [queryString, page, tab, router]);

  useEffect(() => {
    // Data fetch on mount/filter change; loading state is set inside
    // the async flow (external-system sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function openDetail(customerId: string) {
    setDetailBusy(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const data = await res.json();
      if (!data.ok) throw new Error();
      setDetail({ customer: data.customer, submissions: data.submissions });
    } catch {
      setDetailError("Couldn't load this customer.");
    } finally {
      setDetailBusy(false);
    }
  }

  async function patchCustomer(patch: Record<string, unknown>) {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/customers/${detail.customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      await openDetail(detail.customer.id);
      await load();
    } catch {
      setDetailError("Update failed, nothing was changed.");
      setDetailBusy(false);
    }
  }

  async function patchSubmission(id: string, patch: Record<string, unknown>) {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      await openDetail(detail.customer.id);
      if (tab === "submissions") await load();
    } catch {
      setDetailError("Update failed, nothing was changed.");
      setDetailBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    router.refresh();
  }

  const customerTotal = CUSTOMER_STATUSES.reduce((a, s) => a + (counts[s] ?? 0), 0);
  const submissionTotal =
    (counts.booking_request ?? 0) + (counts.contact_message ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const summary = [
    { label: "People", value: customerTotal },
    { label: "Submissions", value: submissionTotal },
    { label: "Booking requests", value: counts.booking_request ?? 0 },
    { label: "Contact messages", value: counts.contact_message ?? 0 },
    { label: "New leads", value: counts.lead ?? 0 },
    { label: "Converted", value: counts.customer ?? 0 },
  ];

  const selectClass =
    "min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink";

  const tabClass = (t: Tab) =>
    `min-h-9 cursor-pointer rounded-[10px] px-3.5 text-sm font-semibold transition-colors ${
      tab === t
        ? "bg-primary text-white"
        : "border border-line-strong text-ink hover:border-primary hover:text-primary"
    }`;

  return (
    <Section className="!py-10">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Werigo admin</p>
          <h1 className="font-display text-3xl text-ink">Customers</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-ink-soft sm:inline">{adminEmail}</span>
          <Link
            href="/admin/bookings"
            className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-line-strong px-3.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Bookings
          </Link>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <a
            href={`/api/admin/customers/export?${queryString().toString()}${
              tab === "submissions" ? "&entity=submissions" : ""
            }`}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong px-3.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </a>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((c) => (
          <div key={c.label} className="rounded-[14px] border border-line bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {c.label}
            </p>
            <p className="tnum mt-1 text-2xl font-bold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2" role="tablist" aria-label="Customer database view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "customers"}
          className={tabClass("customers")}
          onClick={() => {
            setTab("customers");
            setStatus("");
            setPage(1);
          }}
        >
          People
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "submissions"}
          className={tabClass("submissions")}
          onClick={() => {
            setTab("submissions");
            setStatus("");
            setPage(1);
          }}
        >
          Submissions
        </button>
      </div>

      {/* Filters */}
      <form
        className="mt-4 grid gap-3 rounded-[14px] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, message…"
            className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </label>
        <select
          aria-label="Status filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {(tab === "customers" ? CUSTOMER_STATUSES : SUBMISSION_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {tab === "submissions" ? (
          <select
            aria-label="Form filter"
            value={formType}
            onChange={(e) => {
              setFormType(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All forms</option>
            <option value="booking_request">Booking requests</option>
            <option value="contact_message">Contact messages</option>
          </select>
        ) : (
          <select
            aria-label="Sort order"
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className={selectClass}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          From
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-2 text-sm text-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          To
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-2 text-sm text-ink"
          />
        </label>
        <Button type="submit" variant="primary">
          Apply
        </Button>
      </form>

      {/* Table / states */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading customers">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px] bg-sunken" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[14px] border border-danger/40 bg-danger-soft p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-6 w-6 text-danger" aria-hidden="true" />
            <p className="mt-2 text-sm text-danger">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : (tab === "customers" ? customers : submissions).length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
            <Inbox className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">Nothing here yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Everyone who submits the booking checkout or the contact form
              appears here straight away. Widen the filters to see more.
            </p>
          </div>
        ) : tab === "customers" ? (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Forms</th>
                  <th className="px-4 py-3 font-semibold">First seen</th>
                  <th className="px-4 py-3 font-semibold">Last seen</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => void openDetail(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDetail(r.id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-primary-faint focus-visible:bg-primary-faint"
                    aria-label={`Open customer ${r.full_name}`}
                  >
                    <td className="px-4 py-3 font-medium text-ink">{r.full_name}</td>
                    <td className="px-4 py-3">
                      <span className="tnum block text-ink-soft">
                        {r.whatsapp_number ?? "—"}
                      </span>
                      <span className="block text-xs text-ink-faint">{r.email ?? "—"}</span>
                    </td>
                    <td className="tnum px-4 py-3 text-ink-soft">
                      {r.submissions_count} ({r.booking_requests_count} booking,{" "}
                      {r.contact_messages_count} contact)
                    </td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.first_seen_at)}</td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.last_seen_at)}</td>
                    <td className="px-4 py-3 text-ink-soft">{r.last_source_page ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-sunken text-ink-soft"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                  <th className="px-4 py-3 font-semibold">Form</th>
                  <th className="px-4 py-3 font-semibold">Person</th>
                  <th className="px-4 py-3 font-semibold">Summary</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissions.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => void openDetail(r.customer_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDetail(r.customer_id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-primary-faint focus-visible:bg-primary-faint"
                    aria-label={`Open submission ${r.reference_code}`}
                  >
                    <td className="tnum px-4 py-3 font-semibold text-primary">
                      {r.reference_code}
                    </td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.form_type === "booking_request" ? "Booking" : "Contact"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{r.full_name}</span>
                      <span className="tnum block text-xs text-ink-faint">
                        {r.whatsapp_number ?? r.email ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.form_type === "booking_request"
                        ? `${r.vehicle_model} × ${r.quantity} · ${r.pickup_area} · ${r.rental_days} days`
                        : (r.message ?? "").slice(0, 60)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-sunken text-ink-soft"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <p className="tnum">
            {total} {tab === "customers" ? "people" : "submissions"} · page {page} of{" "}
            {pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Detail panel */}
      {detail ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Customer ${detail.customer.full_name}`}
          className="fixed inset-0 z-[100]"
        >
          <button
            aria-label="Close customer detail"
            onClick={() => setDetail(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50"
            tabIndex={-1}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-y-auto bg-page shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-semibold text-ink">{detail.customer.full_name}</p>
                <p className="text-xs text-ink-faint">
                  First seen {fmt(detail.customer.first_seen_at)}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                aria-label="Close"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-sunken"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-6 px-5 py-5">
              {detailError ? (
                <p
                  role="alert"
                  className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger"
                >
                  {detailError}
                </p>
              ) : null}

              {/* Identity */}
              <dl className="space-y-2 rounded-[14px] border border-line bg-card p-4 text-sm">
                {[
                  ["WhatsApp", detail.customer.whatsapp_number ?? "—"],
                  ["Email", detail.customer.email ?? "—"],
                  ["Nationality", detail.customer.nationality ?? "—"],
                  [
                    "Submissions",
                    `${detail.customer.submissions_count} total · ${detail.customer.booking_requests_count} booking · ${detail.customer.contact_messages_count} contact`,
                  ],
                  ["Last seen", fmt(detail.customer.last_seen_at)],
                  ["First page", detail.customer.first_source_page ?? "—"],
                  [
                    "Campaign",
                    [
                      detail.customer.utm_source,
                      detail.customer.utm_medium,
                      detail.customer.utm_campaign,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—",
                  ],
                  ["Privacy consent", fmt(detail.customer.privacy_consent_at)],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-2">
                    <dt className="font-semibold text-ink">{k}</dt>
                    <dd className="tnum whitespace-pre-line text-ink-soft">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* Ops controls */}
              <div className="space-y-4 rounded-[14px] border border-line bg-card p-4">
                <div>
                  <label
                    htmlFor="customer-status"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Status
                  </label>
                  <select
                    id="customer-status"
                    value={detail.customer.status}
                    disabled={detailBusy}
                    onChange={(e) => void patchCustomer({ status: e.target.value })}
                    className={selectClass + " w-full"}
                  >
                    {CUSTOMER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="customer-assigned"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Assigned to
                  </label>
                  <input
                    id="customer-assigned"
                    type="text"
                    defaultValue={detail.customer.assigned_to ?? ""}
                    disabled={detailBusy}
                    onBlur={(e) => {
                      if (e.target.value !== (detail.customer.assigned_to ?? "")) {
                        void patchCustomer({ assigned_to: e.target.value });
                      }
                    }}
                    placeholder="Staff name"
                    className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint"
                  />
                </div>
                <div>
                  <label
                    htmlFor="customer-notes"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Internal notes
                  </label>
                  <textarea
                    id="customer-notes"
                    rows={3}
                    defaultValue={detail.customer.internal_notes ?? ""}
                    disabled={detailBusy}
                    onBlur={(e) => {
                      if (e.target.value !== (detail.customer.internal_notes ?? "")) {
                        void patchCustomer({ internal_notes: e.target.value });
                      }
                    }}
                    className="w-full rounded-[10px] border border-line-strong bg-card px-3 py-2 text-sm text-ink"
                  />
                  <p className="mt-1 text-xs text-ink-faint">
                    Saved when the field loses focus.
                  </p>
                </div>
              </div>

              {/* Everything this person ever submitted */}
              <div className="rounded-[14px] border border-line bg-card p-4">
                <h2 className="font-display text-lg text-ink">Submissions</h2>
                <ol className="mt-3 space-y-4">
                  {detail.submissions.length === 0 ? (
                    <li className="text-sm text-ink-faint">No submissions stored.</li>
                  ) : (
                    detail.submissions.map((s) => (
                      <li
                        key={s.id}
                        className="border-l-2 border-primary/30 pl-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tnum font-semibold text-primary">
                            {s.reference_code}
                          </span>
                          <span className="text-xs text-ink-faint">
                            {fmt(s.created_at)} · {s.form_type} · via {s.handoff_channel}
                          </span>
                        </div>
                        <dl className="mt-2 space-y-1 text-ink-soft">
                          {s.form_type === "booking_request" ? (
                            <>
                              <div>
                                {s.vehicle_model} × {s.quantity} · {s.rental_days} days ·{" "}
                                {idr(s.rate_per_day_idr)} per day · est.{" "}
                                {idr(s.estimated_total_idr)}
                              </div>
                              <div>
                                {fmt(s.start_at)} → {fmt(s.end_at)}
                              </div>
                              <div>
                                Pickup {s.pickup_area}
                                {s.pickup_address ? `, ${s.pickup_address}` : ""} · return{" "}
                                {s.return_area}
                              </div>
                              {s.hotel_name ? <div>Hotel: {s.hotel_name}</div> : null}
                              {s.flight_number ? <div>Flight: {s.flight_number}</div> : null}
                              {s.extras?.length ? (
                                <div>
                                  Extras:{" "}
                                  {s.extras
                                    .map((e) => `${e.name} × ${e.quantity}`)
                                    .join(", ")}
                                </div>
                              ) : null}
                              {s.promo_code ? <div>Promo: {s.promo_code}</div> : null}
                              <div className="text-xs text-ink-faint">
                                Terms {s.terms_accepted ? "accepted" : "not accepted"} ·
                                battery {s.battery_ack ? "acknowledged" : "not acknowledged"}
                                {s.age_confirmed === null
                                  ? ""
                                  : ` · age ${s.age_confirmed ? "confirmed" : "not confirmed"}`}
                              </div>
                            </>
                          ) : null}
                          {s.message ? (
                            <div className="whitespace-pre-line">{s.message}</div>
                          ) : null}
                          <div className="text-xs text-ink-faint">
                            Page {s.source_page ?? "—"}
                            {s.referrer ? ` · referrer ${s.referrer}` : ""}
                            {s.locale ? ` · ${s.locale}` : ""}
                          </div>
                        </dl>
                        <div className="mt-2">
                          <label className="sr-only" htmlFor={`sub-status-${s.id}`}>
                            Submission status
                          </label>
                          <select
                            id={`sub-status-${s.id}`}
                            value={s.status}
                            disabled={detailBusy}
                            onChange={(e) =>
                              void patchSubmission(s.id, { status: e.target.value })
                            }
                            className="min-h-9 cursor-pointer rounded-[10px] border border-line-strong bg-card px-2 text-xs text-ink"
                          >
                            {SUBMISSION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))
                  )}
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
