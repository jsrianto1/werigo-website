"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, IdCard, KeyRound, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";
import { getModel } from "@/data/vehicles";
import { ID_TYPE_LABELS, identityFieldErrors, type Identity, type IdType } from "@/lib/identitySchema";
import { IdentityFields, emptyIdentity, type IdentityValues } from "@/components/account/IdentityForm";

interface Detail {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    nationality: string | null;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    status: "active" | "suspended" | "blocked";
    banReason: string | null;
    banExpires: string | null;
    paidBookings: number;
    spentIdr: number;
  };
  identity: { idType: IdType; idNumber: string; drivingLicenseNumber: string; updatedAt: string } | null;
  identityLocked: boolean;
  bookings: { id: string; booking_code: string; vehicle_model: string; quantity: number; start_at: string; end_at: string; status: string; payment_status: string; total_idr: number | null }[];
  vouchers: { id: string; code: string; title: string; audience: string; blockedReason: string | null }[];
  referral: { code: string; pendingIdr: number; availableIdr: number; paidOutIdr: number; referred: number };
  notes: { id: string; authorEmail: string; body: string; createdAt: string }[];
  sessions: number;
  canManage: boolean;
}

interface AssignablePromotion {
  id: string;
  code: string;
  title: string;
  audience: string;
  active: boolean;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS: Record<Detail["customer"]["status"], string> = {
  active: "bg-ok-soft text-ok",
  suspended: "bg-warn-soft text-warn",
  blocked: "bg-danger-soft text-danger",
};

const PAYMENT: Record<string, string> = {
  paid: "bg-ok-soft text-ok",
  pending: "bg-warn-soft text-warn",
  expired: "bg-danger-soft text-danger",
  failed: "bg-danger-soft text-danger",
  refunded: "bg-sunken text-ink-soft",
  unpaid: "bg-sunken text-ink-faint",
};

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint";

export function CustomerDetail({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [promos, setPromos] = useState<AssignablePromotion[]>([]);
  const [voucherId, setVoucherId] = useState("");
  const [statusForm, setStatusForm] = useState<{ kind: "suspended" | "blocked"; reason: string; until: string } | null>(null);
  const [editIdentity, setEditIdentity] = useState<IdentityValues | null>(null);
  const [identityErrors, setIdentityErrors] = useState<Partial<Record<keyof Identity, string>>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setD(data);
    } catch {
      setError("Couldn't load this customer.");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    fetch("/api/admin/promotions", { cache: "no-store" })
      .then((r) => r.json())
      .then((x) => x.ok && setPromos((x.promotions as AssignablePromotion[]).filter((p) => p.audience === "assigned" && p.active)))
      .catch(() => {});
  }, [load]);

  async function call(path: string, method: string, body?: unknown, success?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg({ ok: false, text: data?.message ?? (data?.fieldErrors ? Object.values(data.fieldErrors as Record<string, string>).join(" ") : "Something went wrong.") });
        return data;
      }
      if (success) setMsg({ ok: true, text: success });
      await load();
      return data;
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div><p role="alert" className="text-sm text-danger">{error}</p></div>;
  if (!d) return <div><div className="h-96 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" /></div>;

  const c = d.customer;

  async function saveIdentity() {
    if (!editIdentity) return;
    const local = identityFieldErrors(editIdentity);
    if (local) return setIdentityErrors(local);
    setIdentityErrors({});
    const data = await call(`/api/admin/customers/${id}/identity`, "PUT", editIdentity, "Documents updated.");
    if (data?.fieldErrors) setIdentityErrors(data.fieldErrors);
    else if (data?.ok) setEditIdentity(null);
  }

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-strong">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Customers
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Customer</p>
          <h1 className="font-display text-3xl text-ink">{c.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {c.email}{c.emailVerified ? "" : " (not confirmed)"}{c.phone ? ` · ${c.phone}` : ""}{c.nationality ? ` · ${c.nationality}` : ""}
          </p>
          <p className="tnum mt-1 text-xs text-ink-faint">Joined {fmt(c.createdAt)} · last sign-in {fmt(c.lastLoginAt)} · {d.sessions} active session{d.sessions === 1 ? "" : "s"}</p>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[c.status]}`}>{c.status}</span>
          {c.status !== "active" ? (
            <p className="mt-1 max-w-xs text-xs text-ink-soft">
              {c.banReason}{c.banExpires ? ` · until ${fmt(c.banExpires)}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {msg ? (
        <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-[10px] px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p>
      ) : null}

      {/* Actions (super admin) */}
      {d.canManage ? (
        <div className="mt-5 rounded-[14px] border border-line bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {c.status === "active" ? (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatusForm({ kind: "suspended", reason: "", until: "" })}>
                  <Ban className="h-4 w-4" aria-hidden="true" /> Suspend
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatusForm({ kind: "blocked", reason: "", until: "" })}>
                  <Ban className="h-4 w-4" aria-hidden="true" /> Block
                </Button>
              </>
            ) : (
              <Button size="sm" variant="primary" disabled={busy} onClick={() => void call(`/api/admin/customers/${id}`, "PATCH", { status: "active" }, "Customer reactivated.")}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Reactivate
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Email ${c.email} a link to set a new password?`)) void call(`/api/admin/customers/${id}/password-reset`, "POST", undefined, "Password reset email sent.");
              }}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" /> Send password reset
            </Button>
          </div>
          {statusForm ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const body = statusForm.kind === "suspended"
                  ? { status: "suspended", reason: statusForm.reason, until: `${statusForm.until}T23:59:59+08:00` }
                  : { status: "blocked", reason: statusForm.reason };
                const data = await call(`/api/admin/customers/${id}`, "PATCH", body);
                if (data?.ok) {
                  setStatusForm(null);
                  setMsg({ ok: true, text: `Customer ${statusForm.kind}. They are signed out everywhere and cannot book.${data.openPaidBookings > 0 ? ` Note: ${data.openPaidBookings} paid booking(s) still upcoming; handle them with the team.` : ""}` });
                }
              }}
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            >
              <div>
                <label htmlFor="status-reason" className="mb-1.5 block text-sm font-medium text-ink">Reason ({statusForm.kind === "suspended" ? "temporary suspension" : "permanent block"})</label>
                <input id="status-reason" required minLength={3} value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} className={inputClass} />
              </div>
              {statusForm.kind === "suspended" ? (
                <div>
                  <label htmlFor="status-until" className="mb-1.5 block text-sm font-medium text-ink">Until (Bali date)</label>
                  <input id="status-until" type="date" required value={statusForm.until} onChange={(e) => setStatusForm({ ...statusForm, until: e.target.value })} className={inputClass} />
                </div>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="primary" disabled={busy}>Confirm</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setStatusForm(null)}>Cancel</Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Bookings */}
          <section className="rounded-[14px] border border-line bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-display text-lg text-ink">Bookings</h2>
              <span className="tnum text-xs text-ink-soft">{c.paidBookings} paid · {formatIdr(c.spentIdr)} spent</span>
            </div>
            {d.bookings.length === 0 ? (
              <p className="border-t border-line px-4 py-6 text-center text-sm text-ink-soft">No bookings yet.</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line text-sm">
                {d.bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/bookings?q=${encodeURIComponent(b.booking_code)}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-primary-faint">
                      <span>
                        <span className="tnum font-semibold text-primary">{b.booking_code}</span>
                        <span className="ml-2 text-ink">{getModel(b.vehicle_model)?.displayName ?? b.vehicle_model} × {b.quantity}</span>
                        <span className="tnum block text-xs text-ink-faint">{fmt(b.start_at)} → {fmt(b.end_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {b.total_idr !== null ? <span className="tnum text-xs text-ink-soft">{formatIdr(b.total_idr)}</span> : null}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT[b.payment_status] ?? ""}`}>{b.payment_status}</span>
                        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink-soft">{b.status.replace("_", " ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-[14px] border border-line bg-card p-4">
            <h2 className="font-display text-lg text-ink">Staff notes</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = await call(`/api/admin/customers/${id}/notes`, "POST", { body: note }, "Note added.");
                if (data?.ok) setNote("");
              }}
              className="mt-3 flex gap-2"
            >
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note (customers never see these)" className={inputClass} />
              <Button type="submit" size="md" variant="outline" disabled={busy || !note.trim()}>Add</Button>
            </form>
            {d.notes.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm">
                {d.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-ink">{n.body}</p>
                    <p className="tnum text-xs text-ink-faint">{fmt(n.createdAt)} · {n.authorEmail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          {/* Documents */}
          <section className="rounded-[14px] border border-line bg-card p-4">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink"><IdCard className="h-4 w-4 text-primary" aria-hidden="true" /> Rider documents</h2>
            {editIdentity ? (
              <div className="mt-3 space-y-3">
                <IdentityFields value={editIdentity} onChange={setEditIdentity} errors={identityErrors} disabled={busy} idPrefix="adm-id" />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => void saveIdentity()}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditIdentity(null)}>Cancel</Button>
                </div>
              </div>
            ) : d.identity ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">{ID_TYPE_LABELS[d.identity.idType]}</dt><dd className="tnum font-semibold text-ink">{d.identity.idNumber}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Driving licence</dt><dd className="tnum font-semibold text-ink">{d.identity.drivingLicenseNumber}</dd></div>
                <p className="pt-1 text-xs text-ink-faint">Updated {fmt(d.identity.updatedAt)}{d.identityLocked ? " · locked for the customer (paid booking)" : ""}</p>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-warn">Not on file yet. The customer is asked for them before booking.</p>
            )}
            {d.canManage && !editIdentity ? (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditIdentity(d.identity ? { idType: d.identity.idType, idNumber: d.identity.idNumber, drivingLicenseNumber: d.identity.drivingLicenseNumber } : emptyIdentity)}>
                {d.identity ? "Correct documents" : "Enter documents"}
              </Button>
            ) : null}
          </section>

          {/* Vouchers */}
          <section className="rounded-[14px] border border-line bg-card p-4">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink"><Ticket className="h-4 w-4 text-primary" aria-hidden="true" /> Vouchers</h2>
            {d.vouchers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">None on the account.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.vouchers.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span className={v.blockedReason ? "text-ink-faint" : "text-ink"}><span className="tnum font-semibold">{v.code}</span> · {v.title}</span>
                    <span className="text-xs text-ink-faint">{v.blockedReason ?? (v.audience === "auto" ? "automatic" : "usable")}</span>
                  </li>
                ))}
              </ul>
            )}
            {promos.length > 0 ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!voucherId) return;
                  const data = await call(`/api/admin/customers/${id}/vouchers`, "POST", { promotionId: voucherId });
                  if (data?.ok) setMsg({ ok: true, text: data.granted ? `Voucher ${data.code} given.` : `Customer already has ${data.code}.` });
                }}
                className="mt-3 flex gap-2"
              >
                <select aria-label="Voucher" value={voucherId} onChange={(e) => setVoucherId(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">Give a voucher…</option>
                  {promos.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
                </select>
                <Button type="submit" size="md" variant="outline" disabled={busy || !voucherId}>Give</Button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-ink-faint">Create a voucher under Promotions (audience: given to customers) to hand out here.</p>
            )}
          </section>

          {/* Referral */}
          <section className="rounded-[14px] border border-line bg-card p-4">
            <h2 className="font-display text-lg text-ink">Referral</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Code</dt><dd className="tnum font-semibold text-ink">{d.referral.code}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Friends referred</dt><dd className="tnum text-ink">{d.referral.referred}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Pending</dt><dd className="tnum text-ink">{formatIdr(d.referral.pendingIdr)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Available</dt><dd className="tnum text-ink">{formatIdr(d.referral.availableIdr)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Paid out</dt><dd className="tnum text-ink">{formatIdr(d.referral.paidOutIdr)}</dd></div>
            </dl>
            <Link href="/admin/referrals" className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary-strong">Referral log →</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
