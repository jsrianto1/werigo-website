"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getPrimaryCards } from "@/data/vehicles";

interface StockRow {
  model: string;
  total_units: number | null;
  updated_at: string;
}

/**
 * Units per model. Blank = not tracked: the model never sells out
 * online. A number makes the checkout refuse bookings once paid and
 * pending-payment bookings overlapping the dates reach that number.
 */
export function StockManager() {
  const models = getPrimaryCards();
  const [rows, setRows] = useState<Record<string, StockRow>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/stock");
        const data = await res.json();
        if (!data.ok) throw new Error();
        const map: Record<string, StockRow> = {};
        const d: Record<string, string> = {};
        for (const r of data.stock as StockRow[]) {
          map[r.model] = r;
          d[r.model] = r.total_units === null ? "" : String(r.total_units);
        }
        setRows(map);
        setDraft(d);
      } catch {
        setError("Couldn't load stock.");
      }
    })();
  }, []);

  async function save(model: string) {
    setBusy(model);
    setError(null);
    setSaved(null);
    const raw = draft[model]?.trim() ?? "";
    const totalUnits = raw === "" ? null : Number(raw);
    if (totalUnits !== null && (!Number.isInteger(totalUnits) || totalUnits < 0)) {
      setError("Enter a whole number, or leave blank for not tracked.");
      setBusy(null);
      return;
    }
    try {
      const res = await fetch("/api/admin/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, totalUnits }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setRows((r) => ({ ...r, [model]: data.stock }));
      setSaved(model);
    } catch {
      setError("Couldn't save. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Section className="!py-10">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-strong">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bookings
      </Link>
      <p className="eyebrow mt-4">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Stock per model</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Total rentable units of each model. Leave a field blank to stop tracking that
        model (it never sells out online). The checkout counts paid bookings and
        bookings awaiting payment that overlap the requested dates.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Units</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {models.map((m) => {
              const row = rows[m.modelSlug];
              return (
                <tr key={m.modelSlug}>
                  <td className="px-4 py-3 font-medium text-ink">{m.displayName}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`${m.displayName} units`}
                      placeholder="not tracked"
                      value={draft[m.modelSlug] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [m.modelSlug]: e.target.value }))}
                      className="tnum min-h-11 w-36 rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint"
                    />
                  </td>
                  <td className="tnum px-4 py-3 text-ink-soft">{row ? fmt(row.updated_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={busy === m.modelSlug} onClick={() => void save(m.modelSlug)}>
                      {saved === m.modelSlug ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                      {busy === m.modelSlug ? "Saving…" : saved === m.modelSlug ? "Saved" : "Save"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
