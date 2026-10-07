"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

interface Settings {
  refereeDiscountPercent: number;
  referrerFeePercent: number;
  minPayoutIdr: number;
  firstBookingOnly: boolean;
}

interface Payout {
  id: string;
  customerName: string;
  customerEmail: string;
  amountIdr: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
}

interface Entry {
  bookingCode: string;
  ownerName: string;
  ownerEmail: string;
  referredName: string;
  amountIdr: number;
  status: string;
  createdAt: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const TONES: Record<string, string> = {
  pending: "bg-warn-soft text-warn",
  available: "bg-ok-soft text-ok",
  paid_out: "bg-sunken text-ink-soft",
  void: "bg-sunken text-ink-faint",
  requested: "bg-warn-soft text-warn",
  paid: "bg-ok-soft text-ok",
  rejected: "bg-danger-soft text-danger",
};

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink disabled:opacity-60";

export function ReferralsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<{ referee: string; referrer: string; min: string; first: boolean } | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/referrals", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error();
      setSettings(d.settings);
      setDraft({
        referee: String(d.settings.refereeDiscountPercent),
        referrer: String(d.settings.referrerFeePercent),
        min: String(d.settings.minPayoutIdr),
        first: d.settings.firstBookingOnly,
      });
      setPayouts(d.payouts);
      setEntries(d.entries);
      setCanManage(d.canManage);
    } catch {
      setError("Couldn't load referral data.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refereeDiscountPercent: Number(draft.referee),
          referrerFeePercent: Number(draft.referrer),
          minPayoutIdr: Number(draft.min),
          firstBookingOnly: draft.first,
        }),
      });
      const d = await res.json();
      setMsg(d.ok ? { ok: true, text: "Saved. New bookings use these values; existing bookings keep theirs." } : { ok: false, text: "Check the values (percent 0 to 100, minimum at least Rp 10,000)." });
      if (d.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  async function process(p: Payout, action: "paid" | "rejected") {
    const note =
      action === "paid"
        ? window.prompt(`Mark ${formatIdr(p.amountIdr)} to ${p.accountName} (${p.bankName} ${p.accountNumber}) as transferred? Optional note, e.g. transfer reference:`, "")
        : window.prompt("Reason for rejecting (shown to the customer):", "");
    if (note === null) return;
    if (action === "rejected" && !note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/referrals/payouts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const d = await res.json();
      if (!d.ok) setMsg({ ok: false, text: d.message ?? "Couldn't update the request." });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Referrals</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Customers share their code; the friend gets a discount and the code owner earns a share of what the friend
        pays for the rental. Earnings become available when the rental is marked completed, and are cancelled if
        the booking is cancelled or refunded.
      </p>
      {error ? <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {settings && draft ? (
        <form onSubmit={saveSettings} className="mt-6 rounded-[14px] border border-line bg-card p-5 text-sm">
          <h2 className="font-display text-lg text-ink">Settings</h2>
          {!canManage ? <p className="mt-1 text-xs text-ink-faint">Only a super admin can change these.</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="r-referee" className="mb-1.5 block font-medium text-ink">Friend&apos;s discount (%)</label>
              <input id="r-referee" type="number" min={0} max={100} disabled={!canManage} value={draft.referee} onChange={(e) => setDraft({ ...draft, referee: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="r-referrer" className="mb-1.5 block font-medium text-ink">Code owner earns (%)</label>
              <input id="r-referrer" type="number" min={0} max={100} disabled={!canManage} value={draft.referrer} onChange={(e) => setDraft({ ...draft, referrer: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="r-min" className="mb-1.5 block font-medium text-ink">Minimum payout (Rp)</label>
              <input id="r-min" type="number" min={10000} step={1000} disabled={!canManage} value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} className={inputClass} />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-ink">
            <input type="checkbox" disabled={!canManage} checked={draft.first} onChange={(e) => setDraft({ ...draft, first: e.target.checked })} className="h-4 w-4 accent-[var(--brand-primary)]" />
            Referral codes work only on the friend&apos;s first booking
          </label>
          {msg ? <p role="status" className={`mt-3 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p> : null}
          {canManage ? (
            <Button type="submit" variant="primary" className="mt-4" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
          ) : null}
        </form>
      ) : (
        <div className="mt-6 h-40 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" />
      )}

      <h2 className="mt-10 font-display text-xl text-ink">Payout requests</h2>
      <div className="mt-3 overflow-x-auto rounded-[14px] border border-line bg-card">
        {payouts.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-soft">No payout requests yet.</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Transfer to</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{p.customerName}</span>
                    <span className="block text-xs text-ink-faint">{p.customerEmail}</span>
                  </td>
                  <td className="tnum px-4 py-3 font-semibold text-ink">{formatIdr(p.amountIdr)}</td>
                  <td className="tnum px-4 py-3 text-xs text-ink-soft">
                    {p.bankName} {p.accountNumber}
                    <span className="block">{p.accountName}</span>
                  </td>
                  <td className="tnum px-4 py-3 text-xs text-ink-soft">
                    {fmt(p.requestedAt)}
                    {p.processedAt ? <span className="block">done {fmt(p.processedAt)} by {p.processedBy}</span> : null}
                    {p.note ? <span className="block italic">{p.note}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[p.status] ?? ""}`}>{p.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {p.status === "requested" && canManage ? (
                      <>
                        <Button size="sm" variant="primary" disabled={busy} onClick={() => void process(p, "paid")}>Mark transferred</Button>{" "}
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void process(p, "rejected")}>Reject</Button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="mt-10 font-display text-xl text-ink">Referral earnings</h2>
      <div className="mt-3 overflow-x-auto rounded-[14px] border border-line bg-card">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-soft">No referred bookings yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Code owner</th>
                <th className="px-4 py-3 font-semibold">Friend</th>
                <th className="px-4 py-3 font-semibold">Earning</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.bookingCode}>
                  <td className="tnum px-4 py-3">
                    <a href={`/admin/bookings?q=${encodeURIComponent(e.bookingCode)}`} className="font-semibold text-primary hover:text-primary-strong">{e.bookingCode}</a>
                    <span className="block text-xs text-ink-faint">{fmt(e.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {e.ownerName}
                    <span className="block text-xs text-ink-faint">{e.ownerEmail}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.referredName}</td>
                  <td className="tnum px-4 py-3 font-semibold text-ink">{formatIdr(e.amountIdr)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[e.status] ?? ""}`}>{e.status.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
