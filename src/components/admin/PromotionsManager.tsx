"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Star, X, Gift, Pencil } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getPrimaryCards } from "@/data/vehicles";
import { AUDIENCE_LABELS, AUDIENCES, discountLabel, type Audience } from "@/lib/promotionRules";
import { formatIdr } from "@/lib/pricing";

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string | null;
  audience: Audience;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount_idr: number | null;
  min_rental_idr: number | null;
  first_booking_only: boolean;
  models: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  featured: boolean;
  active: boolean;
  used: number;
  grants: number;
}

interface FormState {
  code: string;
  title: string;
  description: string;
  audience: Audience;
  discountType: "percent" | "fixed";
  discountValue: string;
  maxDiscountIdr: string;
  minRentalIdr: string;
  firstBookingOnly: boolean;
  models: string[];
  startsAt: string;
  endsAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  featured: boolean;
  active: boolean;
}

const EMPTY: FormState = {
  code: "",
  title: "",
  description: "",
  audience: "public",
  discountType: "percent",
  discountValue: "",
  maxDiscountIdr: "",
  minRentalIdr: "",
  firstBookingOnly: false,
  models: [],
  startsAt: "",
  endsAt: "",
  usageLimitTotal: "",
  usageLimitPerUser: "1",
  featured: false,
  active: true,
};

/** ISO → "YYYY-MM-DDTHH:mm" in Bali time, for <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

const fromLocalInput = (v: string) => (v ? `${v}:00+08:00` : null);
const num = (v: string) => (v.trim() === "" ? null : Number(v));

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric" }) : null;

const inputClass = (err?: string) =>
  `min-h-11 w-full rounded-[10px] border bg-card px-3 text-sm text-ink placeholder:text-ink-faint ${err ? "border-danger" : "border-line-strong"}`;

export function PromotionsManager() {
  const models = getPrimaryCards();
  const [rows, setRows] = useState<Promotion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: FormState } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [granting, setGranting] = useState<Promotion | null>(null);
  const [grantTarget, setGrantTarget] = useState<"all" | "never_booked" | "booked_at_least" | "emails">("never_booked");
  const [grantCount, setGrantCount] = useState("2");
  const [grantEmails, setGrantEmails] = useState("");
  const [grantResult, setGrantResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promotions", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error();
      setRows(d.promotions);
    } catch {
      setError("Couldn't load promotions.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function openNew() {
    setFieldErrors({});
    setEditing({ id: null, form: { ...EMPTY } });
  }

  function openEdit(p: Promotion) {
    setFieldErrors({});
    setEditing({
      id: p.id,
      form: {
        code: p.code,
        title: p.title,
        description: p.description ?? "",
        audience: p.audience,
        discountType: p.discount_type,
        discountValue: String(p.discount_value),
        maxDiscountIdr: p.max_discount_idr === null ? "" : String(p.max_discount_idr),
        minRentalIdr: p.min_rental_idr === null ? "" : String(p.min_rental_idr),
        firstBookingOnly: p.first_booking_only,
        models: p.models ?? [],
        startsAt: toLocalInput(p.starts_at),
        endsAt: toLocalInput(p.ends_at),
        usageLimitTotal: p.usage_limit_total === null ? "" : String(p.usage_limit_total),
        usageLimitPerUser: p.usage_limit_per_user === null ? "" : String(p.usage_limit_per_user),
        featured: p.featured,
        active: p.active,
      },
    });
  }

  function payload(f: FormState) {
    return {
      code: f.code,
      title: f.title,
      description: f.description,
      audience: f.audience,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      maxDiscountIdr: f.discountType === "percent" ? num(f.maxDiscountIdr) : null,
      minRentalIdr: num(f.minRentalIdr),
      firstBookingOnly: f.firstBookingOnly,
      models: f.models,
      startsAt: fromLocalInput(f.startsAt),
      endsAt: fromLocalInput(f.endsAt),
      usageLimitTotal: num(f.usageLimitTotal),
      usageLimitPerUser: num(f.usageLimitPerUser),
      featured: f.featured,
      active: f.active,
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setFieldErrors({});
    try {
      const res = await fetch(editing.id ? `/api/admin/promotions/${editing.id}` : "/api/admin/promotions", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(editing.form)),
      });
      const d = await res.json();
      if (!d.ok) {
        setFieldErrors(d.fieldErrors ?? { form: "Couldn't save. Check the fields." });
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function quickToggle(p: Promotion, patch: Partial<FormState>) {
    const base = {
      code: p.code,
      title: p.title,
      description: p.description ?? "",
      audience: p.audience,
      discountType: p.discount_type,
      discountValue: String(p.discount_value),
      maxDiscountIdr: p.max_discount_idr === null ? "" : String(p.max_discount_idr),
      minRentalIdr: p.min_rental_idr === null ? "" : String(p.min_rental_idr),
      firstBookingOnly: p.first_booking_only,
      models: p.models ?? [],
      startsAt: toLocalInput(p.starts_at),
      endsAt: toLocalInput(p.ends_at),
      usageLimitTotal: p.usage_limit_total === null ? "" : String(p.usage_limit_total),
      usageLimitPerUser: p.usage_limit_per_user === null ? "" : String(p.usage_limit_per_user),
      featured: p.featured,
      active: p.active,
    } satisfies FormState;
    await fetch(`/api/admin/promotions/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload({ ...base, ...patch })),
    });
    await load();
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    if (!granting) return;
    setBusy(true);
    setGrantResult(null);
    const target =
      grantTarget === "booked_at_least"
        ? { kind: grantTarget, count: Number(grantCount) }
        : grantTarget === "emails"
          ? { kind: grantTarget, emails: grantEmails.split(/[\s,;]+/).filter(Boolean) }
          : { kind: grantTarget };
    try {
      const res = await fetch(`/api/admin/promotions/${granting.id}/grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const d = await res.json();
      if (!d.ok) {
        setGrantResult({ ok: false, text: d.message ?? "Couldn't give the voucher." });
        return;
      }
      setGrantResult({
        ok: true,
        text: `Given to ${d.granted} customer${d.granted === 1 ? "" : "s"} (${d.matched} matched, ${d.matched - d.granted} already had it).${
          d.unknownEmails?.length ? ` Not found: ${d.unknownEmails.join(", ")}.` : ""
        }`,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const f = editing?.form;
  const set = (patch: Partial<FormState>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <Section className="!py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Werigo admin</p>
          <h1 className="font-display text-3xl text-ink">Promotions</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            One discount per booking: customers automatically get the biggest one they qualify for and can pick
            another at checkout. Discounts apply to the rental, never to the delivery fee. The promotion marked
            with a star is advertised in the site pop-up.
          </p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New promotion
        </Button>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-[14px] border border-line bg-card">
        {rows === null ? (
          <div className="h-40 animate-pulse bg-sunken" aria-busy="true" />
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No promotions yet.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Valid</th>
                <th className="px-4 py-3 font-semibold">Used</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="tnum flex items-center gap-1.5 font-semibold text-primary">
                      {p.featured ? <Star className="h-3.5 w-3.5 fill-current text-warn" aria-label="Featured in the pop-up" /> : null}
                      {p.code}
                    </span>
                    <span className="block text-xs text-ink-soft">{p.title}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {p.audience === "public" ? "Promo code" : p.audience === "auto" ? "Automatic" : "Voucher"}
                    {p.first_booking_only ? <span className="block">First booking only</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {discountLabel(p)}
                    {p.min_rental_idr ? <span className="block text-xs text-ink-faint">min {formatIdr(p.min_rental_idr)}</span> : null}
                  </td>
                  <td className="tnum px-4 py-3 text-xs text-ink-soft">
                    {fmtDate(p.starts_at) ?? "now"} → {fmtDate(p.ends_at) ?? "no end"}
                  </td>
                  <td className="tnum px-4 py-3 text-xs text-ink-soft">
                    {p.used}
                    {p.usage_limit_total ? ` / ${p.usage_limit_total}` : ""}
                    {p.audience === "assigned" ? <span className="block">{p.grants} given</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void quickToggle(p, { active: !p.active })}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? "bg-ok-soft text-ok" : "bg-sunken text-ink-faint"}`}
                      title="Click to switch"
                    >
                      {p.active ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {p.audience === "assigned" ? (
                      <Button size="sm" variant="ghost" onClick={() => { setGrantResult(null); setGranting(p); }}>
                        <Gift className="h-4 w-4" aria-hidden="true" />
                        Give
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / edit drawer */}
      {editing && f ? (
        <div role="dialog" aria-modal="true" aria-label={editing.id ? `Edit ${f.code}` : "New promotion"} className="fixed inset-0 z-[100]">
          <button aria-label="Close" onClick={() => setEditing(null)} className="absolute inset-0 h-full w-full cursor-default bg-black/50" tabIndex={-1} />
          <form onSubmit={save} className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-y-auto bg-page shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xl text-ink">{editing.id ? `Edit ${f.code}` : "New promotion"}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-sunken">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 space-y-4 px-5 py-5 text-sm">
              {fieldErrors.form ? <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-danger">{fieldErrors.form}</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-code" className="mb-1.5 block font-medium text-ink">Code</label>
                  <input id="p-code" required value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="BALI10" className={`${inputClass(fieldErrors.code)} uppercase`} />
                  {fieldErrors.code ? <p className="mt-1 text-xs text-danger">{fieldErrors.code}</p> : null}
                </div>
                <div>
                  <label htmlFor="p-title" className="mb-1.5 block font-medium text-ink">Title (shown to customers)</label>
                  <input id="p-title" required value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Nyepi weekend" className={inputClass(fieldErrors.title)} />
                  {fieldErrors.title ? <p className="mt-1 text-xs text-danger">{fieldErrors.title}</p> : null}
                </div>
              </div>
              <div>
                <label htmlFor="p-desc" className="mb-1.5 block font-medium text-ink">Description (optional)</label>
                <input id="p-desc" value={f.description} onChange={(e) => set({ description: e.target.value })} className={inputClass()} />
              </div>
              <div>
                <label htmlFor="p-aud" className="mb-1.5 block font-medium text-ink">Who can use it</label>
                <select id="p-aud" value={f.audience} onChange={(e) => set({ audience: e.target.value as Audience })} className={inputClass()}>
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="p-type" className="mb-1.5 block font-medium text-ink">Discount</label>
                  <select id="p-type" value={f.discountType} onChange={(e) => set({ discountType: e.target.value as "percent" | "fixed" })} className={inputClass()}>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed (Rp)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="p-val" className="mb-1.5 block font-medium text-ink">{f.discountType === "percent" ? "Percent" : "Amount (Rp)"}</label>
                  <input id="p-val" required type="number" min={1} value={f.discountValue} onChange={(e) => set({ discountValue: e.target.value })} className={inputClass(fieldErrors.discountValue)} />
                  {fieldErrors.discountValue ? <p className="mt-1 text-xs text-danger">{fieldErrors.discountValue}</p> : null}
                </div>
                {f.discountType === "percent" ? (
                  <div>
                    <label htmlFor="p-max" className="mb-1.5 block font-medium text-ink">Max (Rp, optional)</label>
                    <input id="p-max" type="number" min={1} value={f.maxDiscountIdr} onChange={(e) => set({ maxDiscountIdr: e.target.value })} className={inputClass()} />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-min" className="mb-1.5 block font-medium text-ink">Minimum rental (Rp, optional)</label>
                  <input id="p-min" type="number" min={0} value={f.minRentalIdr} onChange={(e) => set({ minRentalIdr: e.target.value })} className={inputClass()} />
                </div>
                <label className="flex items-center gap-2 self-end pb-3 text-ink">
                  <input type="checkbox" checked={f.firstBookingOnly} onChange={(e) => set({ firstBookingOnly: e.target.checked })} className="h-4 w-4 accent-[var(--brand-primary)]" />
                  First booking only
                </label>
              </div>
              <fieldset>
                <legend className="mb-1.5 font-medium text-ink">Models (none ticked = all models)</legend>
                <div className="flex flex-wrap gap-3">
                  {models.map((m) => (
                    <label key={m.modelSlug} className="flex items-center gap-2 text-ink-soft">
                      <input
                        type="checkbox"
                        checked={f.models.includes(m.modelSlug)}
                        onChange={(e) =>
                          set({ models: e.target.checked ? [...f.models, m.modelSlug] : f.models.filter((x) => x !== m.modelSlug) })
                        }
                        className="h-4 w-4 accent-[var(--brand-primary)]"
                      />
                      {m.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-start" className="mb-1.5 block font-medium text-ink">Starts (Bali time, optional)</label>
                  <input id="p-start" type="datetime-local" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={inputClass()} />
                </div>
                <div>
                  <label htmlFor="p-end" className="mb-1.5 block font-medium text-ink">Ends (Bali time, optional)</label>
                  <input id="p-end" type="datetime-local" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={inputClass(fieldErrors.endsAt)} />
                  {fieldErrors.endsAt ? <p className="mt-1 text-xs text-danger">{fieldErrors.endsAt}</p> : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-lim" className="mb-1.5 block font-medium text-ink">Total uses (optional)</label>
                  <input id="p-lim" type="number" min={1} value={f.usageLimitTotal} onChange={(e) => set({ usageLimitTotal: e.target.value })} placeholder="unlimited" className={inputClass()} />
                </div>
                <div>
                  <label htmlFor="p-limu" className="mb-1.5 block font-medium text-ink">Uses per customer</label>
                  <input id="p-limu" type="number" min={1} value={f.usageLimitPerUser} onChange={(e) => set({ usageLimitPerUser: e.target.value })} placeholder="unlimited" className={inputClass()} />
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-ink">
                  <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-[var(--brand-primary)]" />
                  Active
                </label>
                <label className="flex items-center gap-2 text-ink">
                  <input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-[var(--brand-primary)]" />
                  Feature in the site pop-up
                </label>
              </div>
            </div>
            <div className="flex gap-2 border-t border-line px-5 py-4">
              <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Give voucher */}
      {granting ? (
        <div role="dialog" aria-modal="true" aria-label={`Give ${granting.code}`} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setGranting(null)} className="absolute inset-0 h-full w-full cursor-default bg-black/50" tabIndex={-1} />
          <form onSubmit={grant} className="relative w-full max-w-md space-y-4 rounded-[14px] bg-page p-6 text-sm shadow-2xl">
            <h2 className="font-display text-xl text-ink">Give {granting.code}</h2>
            <p className="text-ink-soft">The voucher appears in each customer&apos;s account and is applied at checkout.</p>
            <fieldset className="space-y-2">
              {[
                ["never_booked", "Customers who have never booked"],
                ["booked_at_least", "Customers with at least N paid bookings"],
                ["emails", "Specific customers (emails)"],
                ["all", "All customers"],
              ].map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 text-ink">
                  <input type="radio" name="target" checked={grantTarget === v} onChange={() => setGrantTarget(v as typeof grantTarget)} className="h-4 w-4 accent-[var(--brand-primary)]" />
                  {label}
                </label>
              ))}
            </fieldset>
            {grantTarget === "booked_at_least" ? (
              <input type="number" min={1} value={grantCount} onChange={(e) => setGrantCount(e.target.value)} aria-label="Minimum paid bookings" className={inputClass()} />
            ) : null}
            {grantTarget === "emails" ? (
              <textarea rows={4} value={grantEmails} onChange={(e) => setGrantEmails(e.target.value)} placeholder="one@example.com, two@example.com" aria-label="Customer emails" className="w-full rounded-[10px] border border-line-strong bg-card px-3 py-2 text-sm text-ink" />
            ) : null}
            {grantResult ? (
              <p role="status" className={`rounded-[10px] px-3 py-2 ${grantResult.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{grantResult.text}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>{busy ? "Giving…" : "Give voucher"}</Button>
              <Button type="button" variant="ghost" onClick={() => setGranting(null)}>Close</Button>
            </div>
          </form>
        </div>
      ) : null}
    </Section>
  );
}
