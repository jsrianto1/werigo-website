"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  LogOut,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { getPrimaryCards } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";

const STATUSES = [
  "new", "contacted", "quoted", "confirmed",
  "active", "completed", "cancelled", "no_response",
] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-primary-faint text-primary",
  contacted: "bg-warn-soft text-warn",
  quoted: "bg-warn-soft text-warn",
  confirmed: "bg-ok-soft text-ok",
  active: "bg-ok-soft text-ok",
  completed: "bg-sunken text-ink-soft",
  cancelled: "bg-danger-soft text-danger",
  no_response: "bg-sunken text-ink-faint",
};

interface Row {
  id: string;
  booking_code: string;
  created_at: string;
  status: string;
  full_name: string;
  whatsapp_number: string;
  email: string;
  vehicle_model: string;
  quantity: number;
  pickup_area: string;
  return_area: string;
  start_at: string;
  end_at: string;
  source_page: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  follow_up_at: string | null;
  customer_notes: string | null;
  pickup_address: string | null;
  nationality: string | null;
}

interface EventRow {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  actor: string;
  created_at: string;
}

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

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const models = getPrimaryCards();

  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [model, setModel] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // detail panel
  const [detail, setDetail] = useState<{ booking: Row; events: EventRow[] } | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const queryString = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (model) p.set("model", model);
    if (pickupArea) p.set("pickupArea", pickupArea);
    if (dateFrom) p.set("dateFrom", `${dateFrom}T00:00:00+08:00`);
    if (dateTo) p.set("dateTo", `${dateTo}T23:59:59+08:00`);
    p.set("sort", sort);
    return p;
  }, [search, status, model, pickupArea, dateFrom, dateTo, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = queryString();
      p.set("page", String(page));
      p.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/bookings?${p.toString()}`);
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      if (!data.ok) throw new Error();
      setRows(data.rows);
      setTotal(data.total);
      setCounts(data.counts);
    } catch {
      setError("Couldn't load bookings. Check the connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [queryString, page, router]);

  useEffect(() => {
    // Data fetch on mount/filter change; loading state is set inside
    // the async flow (external-system sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setDetailBusy(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error();
      setDetail({ booking: data.booking, events: data.events });
    } catch {
      setDetailError("Couldn't load this booking.");
    } finally {
      setDetailBusy(false);
    }
  }

  async function patchDetail(patch: Record<string, unknown>) {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${detail.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      await openDetail(detail.booking.id);
      await load();
    } catch {
      setDetailError("Update failed — nothing was changed.");
      setDetailBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    router.refresh();
  }

  const totalBookings = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const summary = [
    { label: "Total", value: totalBookings },
    { label: "New", value: counts.new ?? 0 },
    { label: "Confirmed", value: counts.confirmed ?? 0 },
    { label: "Active", value: counts.active ?? 0 },
    { label: "Completed", value: counts.completed ?? 0 },
    { label: "Cancelled", value: counts.cancelled ?? 0 },
  ];

  const selectClass =
    "min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink";

  return (
    <Section className="!py-10">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Werigo admin</p>
          <h1 className="font-display text-3xl text-ink">Bookings</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-ink-soft sm:inline">{adminEmail}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <a
            href={`/api/admin/bookings/export?${queryString().toString()}`}
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

      {/* Filters */}
      <form
        className="mt-6 grid gap-3 rounded-[14px] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
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
            placeholder="Search code, name, phone, email…"
            className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </label>
        <select aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select aria-label="Model filter" value={model} onChange={(e) => { setModel(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m.modelSlug} value={m.modelSlug}>{m.displayName}</option>
          ))}
        </select>
        <select aria-label="Pickup area filter" value={pickupArea} onChange={(e) => { setPickupArea(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All areas</option>
          {serviceAreas.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          From
          <input type="date" aria-label="From date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-2 text-sm text-ink" />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          To
          <input type="date" aria-label="To date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-2 text-sm text-ink" />
        </label>
        <select aria-label="Sort order" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className={selectClass}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <Button type="submit" variant="primary">
          Apply
        </Button>
      </form>

      {/* Table / states */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading bookings">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px] bg-sunken" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-[14px] border border-danger/40 bg-danger-soft p-6 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-danger" aria-hidden="true" />
            <p className="mt-2 text-sm text-danger">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
            <Inbox className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">No bookings found</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              New booking requests appear here the moment customers submit the
              form. Adjust the filters to widen your view.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Area</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
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
                    aria-label={`Open booking ${r.booking_code}`}
                  >
                    <td className="tnum px-4 py-3 font-semibold text-primary">{r.booking_code}</td>
                    <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{r.full_name}</span>
                      <span className="tnum block text-xs text-ink-faint">{r.whatsapp_number}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.vehicle_model} × {r.quantity}
                    </td>
                    <td className="tnum px-4 py-3 text-ink-soft">
                      {fmt(r.start_at)} → {fmt(r.end_at)}
                    </td>
                    <td className="px-4 py-3 capitalize text-ink-soft">{r.pickup_area}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-sunken text-ink-soft"}`}>
                        {r.status.replace("_", " ")}
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
            {total} booking{total === 1 ? "" : "s"} · page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
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
          aria-label={`Booking ${detail.booking.booking_code}`}
          className="fixed inset-0 z-[100]"
        >
          <button
            aria-label="Close booking detail"
            onClick={() => setDetail(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50"
            tabIndex={-1}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-y-auto bg-page shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="tnum font-semibold text-primary">{detail.booking.booking_code}</p>
                <p className="text-xs text-ink-faint">Created {fmt(detail.booking.created_at)}</p>
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
                <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
                  {detailError}
                </p>
              ) : null}

              {/* Customer + rental facts */}
              <dl className="space-y-2 rounded-[14px] border border-line bg-card p-4 text-sm">
                {[
                  ["Customer", detail.booking.full_name],
                  ["WhatsApp", detail.booking.whatsapp_number],
                  ["Email", detail.booking.email],
                  ["Nationality", detail.booking.nationality ?? "—"],
                  ["Model", `${detail.booking.vehicle_model} × ${detail.booking.quantity}`],
                  ["Period", `${fmt(detail.booking.start_at)} → ${fmt(detail.booking.end_at)}`],
                  ["Pickup", `${detail.booking.pickup_area}${detail.booking.pickup_address ? ` — ${detail.booking.pickup_address}` : ""}`],
                  ["Return", detail.booking.return_area],
                  ["Source", detail.booking.source_page ?? "—"],
                  ["Notes from customer", detail.booking.customer_notes ?? "—"],
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
                  <label htmlFor="detail-status" className="mb-1.5 block text-sm font-medium text-ink">
                    Status
                  </label>
                  <select
                    id="detail-status"
                    value={detail.booking.status}
                    disabled={detailBusy}
                    onChange={(e) => void patchDetail({ status: e.target.value })}
                    className={selectClass + " w-full"}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="detail-assigned" className="mb-1.5 block text-sm font-medium text-ink">
                    Assigned to
                  </label>
                  <input
                    id="detail-assigned"
                    type="text"
                    defaultValue={detail.booking.assigned_to ?? ""}
                    disabled={detailBusy}
                    onBlur={(e) => {
                      if (e.target.value !== (detail.booking.assigned_to ?? "")) {
                        void patchDetail({ assigned_to: e.target.value });
                      }
                    }}
                    placeholder="Staff name"
                    className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint"
                  />
                </div>
                <div>
                  <label htmlFor="detail-followup" className="mb-1.5 block text-sm font-medium text-ink">
                    Follow-up date
                  </label>
                  <input
                    id="detail-followup"
                    type="date"
                    defaultValue={detail.booking.follow_up_at?.slice(0, 10) ?? ""}
                    disabled={detailBusy}
                    onChange={(e) =>
                      void patchDetail({
                        follow_up_at: e.target.value
                          ? `${e.target.value}T09:00:00+08:00`
                          : null,
                      })
                    }
                    className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="detail-notes" className="mb-1.5 block text-sm font-medium text-ink">
                    Internal notes
                  </label>
                  <textarea
                    id="detail-notes"
                    rows={3}
                    defaultValue={detail.booking.internal_notes ?? ""}
                    disabled={detailBusy}
                    onBlur={(e) => {
                      if (e.target.value !== (detail.booking.internal_notes ?? "")) {
                        void patchDetail({ internal_notes: e.target.value });
                      }
                    }}
                    className="w-full rounded-[10px] border border-line-strong bg-card px-3 py-2 text-sm text-ink"
                  />
                  <p className="mt-1 text-xs text-ink-faint">Saved when the field loses focus.</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-[14px] border border-line bg-card p-4">
                <h2 className="font-display text-lg text-ink">History</h2>
                <ol className="mt-3 space-y-3">
                  {detail.events.length === 0 ? (
                    <li className="text-sm text-ink-faint">No events yet.</li>
                  ) : (
                    detail.events.map((ev) => (
                      <li key={ev.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                        <p className="font-medium text-ink">
                          {ev.event_type === "status_change"
                            ? `Status: ${ev.previous_status ?? "—"} → ${ev.new_status}`
                            : ev.event_type.replace("_", " ")}
                          {ev.note ? ` · ${ev.note}` : ""}
                        </p>
                        <p className="tnum text-xs text-ink-faint">
                          {fmt(ev.created_at)} · {ev.actor}
                        </p>
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
