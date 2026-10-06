"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

interface Row {
  id: number;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint";

export function AuditViewer() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const pageSize = 50;

  const query = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (actor) p.set("actor", actor);
    if (action) p.set("action", action);
    if (from) p.set("from", `${from}T00:00:00+08:00`);
    if (to) p.set("to", `${to}T23:59:59+08:00`);
    return p;
  }, [actor, action, from, to, page]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/audit?${query()}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!d?.ok) return setRows([]);
    setRows(d.rows);
    setTotal(d.total);
    setActions(d.actions);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Section className="!py-10">
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Audit log</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">Every staff action, newest first. Entries cannot be edited or deleted.</p>

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input aria-label="Staff email" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Staff email" className={inputClass} />
        <select aria-label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={`${inputClass} cursor-pointer`}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" aria-label="From" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`tnum ${inputClass}`} />
        <input type="date" aria-label="To" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`tnum ${inputClass}`} />
        <Button type="submit" variant="primary">Apply</Button>
        <a
          href={`/api/admin/audit?${query()}&format=csv`}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> CSV
        </a>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[14px] border border-line bg-card">
        {rows === null ? (
          <div className="h-48 animate-pulse bg-sunken" aria-busy="true" />
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No entries match.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Who</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Object</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="tnum whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(r.createdAt)}<span className="block text-xs text-ink-faint">{r.ip ?? ""}</span></td>
                  <td className="px-4 py-3 text-ink">{r.actorEmail ?? "system"}<span className="block text-xs text-ink-faint">{r.actorRole ?? ""}</span></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink">{r.action}</span></td>
                  <td className="tnum px-4 py-3 text-ink-soft">{r.entityType ?? ""} {r.entityId ?? ""}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {r.meta ? (
                      open === r.id ? (
                        <pre className="max-w-md whitespace-pre-wrap break-all font-mono">{JSON.stringify(r.meta, null, 1)}</pre>
                      ) : (
                        <button type="button" onClick={() => setOpen(r.id)} className="cursor-pointer text-primary hover:text-primary-strong">
                          {Object.keys(r.meta).slice(0, 4).join(", ")}…
                        </button>
                      )
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows && total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <p className="tnum">{total} entr{total === 1 ? "y" : "ies"} · page {page} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
