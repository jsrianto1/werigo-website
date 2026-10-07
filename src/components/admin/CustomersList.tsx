"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  status: "active" | "suspended" | "blocked";
  paidBookings: number;
  spentIdr: number;
  referralAvailableIdr: number;
  hasIdentity: boolean;
}

const STATUS: Record<Row["status"], string> = {
  active: "bg-ok-soft text-ok",
  suspended: "bg-warn-soft text-warn",
  blocked: "bg-danger-soft text-danger",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric" }) : "—";

const selectClass = "min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink";

export function CustomersList() {
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [booked, setBooked] = useState(params.get("booked") ?? "");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 25;

  const load = useCallback(async () => {
    setError(null);
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (booked) p.set("booked", booked);
    try {
      const res = await fetch(`/api/admin/customers?${p}`, { cache: "no-store" });
      if (res.status === 401) return router.refresh();
      const d = await res.json();
      if (!d.ok) throw new Error();
      setRows(d.rows);
      setTotal(d.total);
    } catch {
      setError("Couldn't load customers.");
      setRows([]);
    }
  }, [search, status, booked, page, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Customers</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          void load();
        }}
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or WhatsApp…"
            className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
        <select aria-label="Bookings" value={booked} onChange={(e) => { setBooked(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Booked or not</option>
          <option value="yes">Has a paid booking</option>
          <option value="no">Never booked</option>
        </select>
        <Button type="submit" variant="primary">Apply</Button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[14px] border border-line bg-card">
        {rows === null ? (
          <div className="h-48 animate-pulse bg-sunken" aria-busy="true" />
        ) : error ? (
          <p role="alert" className="p-6 text-sm text-danger">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No customers match.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold">Paid bookings</th>
                <th className="px-4 py-3 font-semibold">Spent</th>
                <th className="px-4 py-3 font-semibold">Referral balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-primary-faint">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${r.id}`} className="font-semibold text-primary hover:text-primary-strong">{r.name}</Link>
                    <span className="block text-xs text-ink-faint">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span>
                    {!r.hasIdentity ? <span className="mt-0.5 inline-block rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">No documents yet</span> : null}
                  </td>
                  <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.createdAt)}</td>
                  <td className="tnum px-4 py-3 text-ink-soft">{fmt(r.lastLoginAt)}</td>
                  <td className="tnum px-4 py-3 text-ink-soft">{r.paidBookings}</td>
                  <td className="tnum px-4 py-3 text-ink-soft">{formatIdr(r.spentIdr)}</td>
                  <td className="tnum px-4 py-3 text-ink-soft">{r.referralAvailableIdr > 0 ? formatIdr(r.referralAvailableIdr) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows && total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <p className="tnum">{total} customer{total === 1 ? "" : "s"} · page {page} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
