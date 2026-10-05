"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, MessageCircle, Wallet, Clock3, BadgeCheck, Banknote } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

interface Summary {
  code: string;
  refereeDiscountPercent: number;
  referrerFeePercent: number;
  minPayoutIdr: number;
  firstBookingOnly: boolean;
  pendingIdr: number;
  availableIdr: number;
  inPayoutIdr: number;
  paidOutIdr: number;
  entries: { bookingCode: string; referredName: string; amountIdr: number; status: string; createdAt: string }[];
  payouts: {
    id: string;
    amountIdr: number;
    status: string;
    bankName: string;
    accountTail: string;
    requestedAt: string;
    processedAt: string | null;
    note: string | null;
  }[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric" });

const ENTRY_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending until the rental ends", tone: "bg-warn-soft text-warn" },
  available: { label: "Available", tone: "bg-ok-soft text-ok" },
  paid_out: { label: "Paid out", tone: "bg-sunken text-ink-soft" },
  void: { label: "Cancelled", tone: "bg-sunken text-ink-faint" },
};

const PAYOUT_LABELS: Record<string, { label: string; tone: string }> = {
  requested: { label: "Requested", tone: "bg-warn-soft text-warn" },
  paid: { label: "Transferred", tone: "bg-ok-soft text-ok" },
  rejected: { label: "Rejected", tone: "bg-danger-soft text-danger" },
};

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink placeholder:text-ink-faint";

export function ReferralDashboard({ siteUrl }: { siteUrl: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showPayout, setShowPayout] = useState(false);
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [payoutMsg, setPayoutMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/referral", { cache: "no-store" });
      const d = await res.json();
      if (!d.ok) throw new Error();
      setData(d.referral);
    } catch {
      setError("Couldn't load your referral details. Please refresh.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error) return <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger"><T>{error}</T></p>;
  if (!data) return <div className="h-72 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" />;

  const link = `${siteUrl}/book?ref=${encodeURIComponent(data.code)}`;
  const shareText = `Rent an electric scooter in Bali with Werigo and get ${data.refereeDiscountPercent}% off your first rental with my code ${data.code}: ${link}`;
  const canRequest = data.availableIdr >= data.minPayoutIdr && !data.payouts.some((p) => p.status === "requested");

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? data!.code : link);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: the text is selectable anyway */
    }
  }

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBankErrors({});
    setPayoutMsg(null);
    try {
      const res = await fetch("/api/account/referral/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bank),
      });
      const d = await res.json();
      if (!d.ok) {
        setBankErrors(d.fieldErrors ?? {});
        if (d.message) setPayoutMsg({ ok: false, text: d.message });
        return;
      }
      setPayoutMsg({ ok: true, text: `Payout of ${formatIdr(d.payout.amountIdr)} requested. Our team transfers it and lets you know on WhatsApp.` });
      setShowPayout(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Share */}
      <section className="rounded-[14px] border border-line bg-card p-6">
        <h2 className="font-display text-xl text-ink"><T>{"Share Werigo, earn rewards"}</T></h2>
        <p className="mt-1 text-sm text-ink-soft">
          <T>{"Friends get"}</T> <strong className="text-ink">{data.refereeDiscountPercent}%</strong>{" "}
          <T>{data.firstBookingOnly ? "off their first rental with your code." : "off their rental with your code."}</T>{" "}
          <T>{"You earn"}</T> <strong className="text-ink">{data.referrerFeePercent}%</strong>{" "}
          <T>{"of what they pay for the rental, once their rental is completed."}</T>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
          <button
            type="button"
            onClick={() => void copy("code")}
            className="tnum inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-primary bg-primary-faint px-5 font-display text-xl font-bold tracking-wider text-primary"
            aria-label={`Copy code ${data.code}`}
          >
            {data.code}
            {copied === "code" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
          <div className="flex min-w-0 gap-2">
            <input readOnly value={link} aria-label="Your referral link" className={`${inputClass} truncate text-sm`} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={() => void copy("link")}>
              {copied === "link" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline"><T>{copied === "link" ? "Copied" : "Copy link"}</T></span>
            </Button>
          </div>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#25D366] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <T>{"Share on WhatsApp"}</T>
        </a>
      </section>

      {/* Balance */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Pending", value: data.pendingIdr, hint: "Waiting for rentals to finish", icon: Clock3 },
          { label: "Available", value: data.availableIdr, hint: `Payout from ${formatIdr(data.minPayoutIdr)}`, icon: Wallet },
          { label: "Paid out", value: data.paidOutIdr, hint: data.inPayoutIdr > 0 ? `${formatIdr(data.inPayoutIdr)} being transferred` : "Transferred to your bank", icon: BadgeCheck },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="rounded-[14px] border border-line bg-card p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-faint">
                <T>{t.label}</T>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="tnum mt-2 font-display text-2xl text-ink">{formatIdr(t.value)}</p>
              <p className="mt-1 text-xs text-ink-soft"><T>{t.hint}</T></p>
            </div>
          );
        })}
      </section>

      {/* Payout */}
      <section className="rounded-[14px] border border-line bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-xl text-ink">
          <Banknote className="h-5 w-5 text-primary" aria-hidden="true" />
          <T>{"Cash out"}</T>
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          <T>{"Request a bank transfer of your available balance once it reaches"}</T> {formatIdr(data.minPayoutIdr)}.{" "}
          <T>{"Our team transfers it manually and confirms on WhatsApp."}</T>
        </p>
        {payoutMsg ? (
          <p role={payoutMsg.ok ? "status" : "alert"} className={`mt-3 rounded-[10px] px-3 py-2 text-sm ${payoutMsg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
            <T>{payoutMsg.text}</T>
          </p>
        ) : null}
        {!showPayout ? (
          <Button type="button" variant="primary" className="mt-4" disabled={!canRequest} onClick={() => setShowPayout(true)}>
            <T>{"Request payout of"}</T> {formatIdr(data.availableIdr)}
          </Button>
        ) : (
          <form onSubmit={requestPayout} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="payout-bank" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Bank"}</T></label>
              <input id="payout-bank" required placeholder="e.g. BCA" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} className={inputClass} />
              {bankErrors.bankName ? <p className="mt-1 text-xs text-danger"><T>{bankErrors.bankName}</T></p> : null}
            </div>
            <div>
              <label htmlFor="payout-number" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Account number"}</T></label>
              <input id="payout-number" required inputMode="numeric" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} className={inputClass} />
              {bankErrors.accountNumber ? <p className="mt-1 text-xs text-danger"><T>{bankErrors.accountNumber}</T></p> : null}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="payout-name" className="mb-1.5 block text-sm font-medium text-ink"><T>{"Account holder name"}</T></label>
              <input id="payout-name" required value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} className={inputClass} />
              {bankErrors.accountName ? <p className="mt-1 text-xs text-danger"><T>{bankErrors.accountName}</T></p> : null}
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? <T>{"Sending…"}</T> : <><T>{"Request"}</T> {formatIdr(data.availableIdr)}</>}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowPayout(false)}>
                <T>{"Cancel"}</T>
              </Button>
            </div>
          </form>
        )}

        {data.payouts.length > 0 ? (
          <ul className="mt-5 divide-y divide-line rounded-[10px] border border-line text-sm">
            {data.payouts.map((p) => {
              const s = PAYOUT_LABELS[p.status] ?? { label: p.status, tone: "bg-sunken text-ink-soft" };
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-ink-soft">
                    <span className="tnum font-semibold text-ink">{formatIdr(p.amountIdr)}</span> · {p.bankName} ···{p.accountTail} · {fmt(p.requestedAt)}
                    {p.note ? <span className="block text-xs text-ink-faint">{p.note}</span> : null}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.tone}`}><T>{s.label}</T></span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* Activity */}
      <section>
        <h2 className="font-display text-lg text-ink"><T>{"Bookings with your code"}</T></h2>
        {data.entries.length === 0 ? (
          <p className="mt-3 rounded-[14px] border border-dashed border-line-strong bg-card p-6 text-center text-sm text-ink-soft">
            <T>{"No bookings with your code yet. Share it with friends who are coming to Bali."}</T>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line bg-card text-sm">
            {data.entries.map((e) => {
              const s = ENTRY_LABELS[e.status] ?? { label: e.status, tone: "bg-sunken text-ink-soft" };
              return (
                <li key={e.bookingCode} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-ink-soft">
                    <span className="text-ink">{e.referredName}</span> · {fmt(e.createdAt)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum font-semibold text-ink">+{formatIdr(e.amountIdr)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.tone}`}><T>{s.label}</T></span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
