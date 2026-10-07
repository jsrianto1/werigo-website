"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Award, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

interface Member {
  id: string;
  name: string;
  email: string;
  tier: string;
  balance: number;
  spend: string;
}

interface Credit {
  id: number;
  points: number;
  note: string;
  actor: string | null;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  remaining: number;
}

interface Summary {
  tier: string;
  balance: number;
  spend: number;
  welcome: boolean;
  joinedAt: string;
  history: Credit[];
  redemptions: { booking_code: string; points: number; status: string; payment_status: string; created_at: string }[];
  adjustments: { points: number; reason: string; created_at: string }[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric" });

const inputClass = "min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-ink-faint";

const tierClass = (tier: string) =>
  tier === "Platinum" ? "bg-deep text-ink-inverse" : tier === "Gold" ? "bg-warn-soft text-warn" : "bg-sunken text-ink-soft";

/**
 * Ride Club members: balance and tier per customer, points history, and
 * (super admin) audited point corrections.
 */
export function MembershipManager({ canAdjust }: { canAdjust: boolean }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const correctionRequest = useRef<{ key: string; id: string } | null>(null);

  const load = useCallback(async (value = "") => {
    const res = await fetch(`/api/admin/membership?search=${encodeURIComponent(value)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error("Unable to load members.");
    setMembers(data.members);
    setReady(data.ready);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => {
      setError("Unable to load members. Please try again.");
      setMembers([]);
    });
  }, [load]);

  async function select(member: Member) {
    setSelected(member);
    setSummary(null);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/membership?userId=${encodeURIComponent(member.id)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSummary(data.summary ?? null);
    } catch {
      setError("Unable to load the points history.");
    }
  }

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    // The same correction retried after a network error keeps its request id, so it is applied once.
    const key = JSON.stringify([selected.id, Number(points), reason]);
    if (correctionRequest.current?.key !== key) correctionRequest.current = { key, id: crypto.randomUUID() };
    try {
      const res = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, points: Number(points), reason, requestId: correctionRequest.current.id }),
      });
      if (!res.ok) throw new Error("Correction failed. Check the available points and try again.");
      correctionRequest.current = null;
      setPoints("");
      setReason("");
      setMsg(`Correction recorded for ${selected.name}.`);
      await load(search);
      await select(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/membership/setup", { method: "POST" });
      if (!res.ok) throw new Error();
      await load(search);
    } catch {
      setError("Setup could not complete. Ask your database administrator to apply migration 0009_ride_club.sql.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Werigo Ride Club</p>
      <h1 className="font-display text-3xl text-ink">Membership</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Members earn Ride Points on completed rentals: Silver 2%, Gold 2.5%, Platinum 3% of the rental amount. Corrections need a
        reason and are written to the audit log.
      </p>

      {msg ? <p role="status" className="mt-4 rounded-[10px] bg-ok-soft px-3 py-2 text-sm text-ok">{msg}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {ready === false ? (
        <div className="mt-6 rounded-[14px] border border-line bg-card p-5 text-sm">
          <p className="font-semibold text-ink">Ride Club is not set up on this database yet.</p>
          <p className="mt-1 text-ink-soft">Bookings and vouchers keep working. Activating creates the membership tables (migration 0009).</p>
          {canAdjust ? (
            <Button variant="primary" className="mt-4" disabled={busy} onClick={() => void activate()}>
              {busy ? "Setting up…" : "Activate Ride Club"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {ready ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void load(search).catch(() => setError("Search failed."));
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <input aria-label="Find member by name or email" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className={`${inputClass} pl-9`} />
              </div>
              <Button type="submit" variant="primary">Search</Button>
            </form>

            <div className="mt-4 overflow-x-auto rounded-[14px] border border-line bg-card">
              {members === null ? (
                <div className="h-40 animate-pulse bg-sunken" aria-busy="true" />
              ) : members.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink-soft">No members match.</p>
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">Tier</th>
                      <th className="px-4 py-3 text-right font-semibold">12-month rentals</th>
                      <th className="px-4 py-3 text-right font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => void select(m)}
                        className={`cursor-pointer transition-colors hover:bg-sunken ${selected?.id === m.id ? "bg-primary-faint" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <button type="button" className="cursor-pointer text-left font-medium text-ink" onClick={() => void select(m)}>
                            {m.name}
                          </button>
                          <span className="block text-xs text-ink-faint">{m.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierClass(m.tier)}`}>{m.tier}</span>
                        </td>
                        <td className="tnum px-4 py-3 text-right text-ink-soft">{formatIdr(Number(m.spend))}</td>
                        <td className="tnum px-4 py-3 text-right font-semibold text-ink">{m.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="rounded-[14px] border border-line bg-card p-5 text-sm lg:sticky lg:top-10 lg:self-start">
            {!selected ? (
              <div className="py-10 text-center">
                <Award className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
                <p className="mt-3 text-ink-soft">Pick a member to see their points history{canAdjust ? " and record a correction" : ""}.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg text-ink">{selected.name}</h2>
                    <Link href={`/admin/customers/${selected.id}`} className="text-xs text-primary hover:text-primary-strong">
                      Open customer page →
                    </Link>
                  </div>
                  <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="cursor-pointer text-ink-faint hover:text-ink">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {summary ? (
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-[10px] bg-sunken p-3">
                      <dt className="text-xs text-ink-faint">Balance</dt>
                      <dd className="tnum mt-1 font-display text-2xl text-ink">{summary.balance}</dd>
                    </div>
                    <div className="rounded-[10px] bg-sunken p-3">
                      <dt className="text-xs text-ink-faint">Tier</dt>
                      <dd className="mt-1 font-semibold text-ink">{summary.tier}</dd>
                    </div>
                    <div className="rounded-[10px] bg-sunken p-3">
                      <dt className="text-xs text-ink-faint">Member since</dt>
                      <dd className="tnum mt-1 font-semibold text-ink">{fmtDate(summary.joinedAt)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mt-4 h-20 animate-pulse rounded-[10px] bg-sunken" aria-busy="true" />
                )}

                {summary ? (
                  <>
                    <h3 className="mt-5 font-semibold text-ink">Points earned</h3>
                    {summary.history.length === 0 ? (
                      <p className="mt-1 text-ink-soft">No points yet.</p>
                    ) : (
                      <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto">
                        {summary.history.map((h) => (
                          <li key={h.id} className="flex justify-between gap-3 py-2">
                            <span className="min-w-0">
                              <span className="block truncate text-ink">{h.note}</span>
                              <span className="tnum block text-xs text-ink-faint">
                                {fmtDate(h.created_at)} · {h.revoked ? "reversed" : `${h.remaining} left, expires ${fmtDate(h.expires_at)}`}
                              </span>
                            </span>
                            <span className={`tnum whitespace-nowrap font-semibold ${h.revoked ? "text-ink-faint line-through" : "text-ink"}`}>+{h.points}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {summary.redemptions.length > 0 ? (
                      <>
                        <h3 className="mt-4 font-semibold text-ink">Points used on bookings</h3>
                        <ul className="mt-2 divide-y divide-line">
                          {summary.redemptions.map((r) => (
                            <li key={r.booking_code} className="flex justify-between gap-3 py-2">
                              <Link href={`/admin/bookings?q=${r.booking_code}`} className="tnum text-primary hover:text-primary-strong">{r.booking_code}</Link>
                              <span className="tnum text-ink-soft">
                                −{r.points} ·{" "}
                                {r.payment_status === "refunded" || ["cancelled", "expired"].includes(r.status) ? "released" : r.payment_status === "paid" ? "used" : "reserved"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {summary.adjustments.length > 0 ? (
                      <>
                        <h3 className="mt-4 font-semibold text-ink">Corrections</h3>
                        <ul className="mt-2 divide-y divide-line">
                          {summary.adjustments.map((a, i) => (
                            <li key={i} className="py-2">
                              <span className="tnum font-semibold text-ink">{a.points}</span> <span className="text-ink-soft">· {a.reason}</span>
                              <span className="tnum block text-xs text-ink-faint">{fmtDate(a.created_at)}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </>
                ) : null}

                {canAdjust ? (
                  <form onSubmit={adjust} className="mt-5 border-t border-line pt-4">
                    <h3 className="font-semibold text-ink">Record a correction</h3>
                    <p className="mt-1 text-xs text-ink-faint">Positive adds points, negative removes them. Logged with your name.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
                      <div>
                        <label htmlFor="rc-points" className="mb-1.5 block font-medium text-ink">Points</label>
                        <input id="rc-points" required type="number" min="-10000" max="10000" value={points} onChange={(e) => setPoints(e.target.value)} className={`tnum ${inputClass}`} />
                      </div>
                      <div>
                        <label htmlFor="rc-reason" className="mb-1.5 block font-medium text-ink">Reason</label>
                        <input id="rc-reason" required minLength={5} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. goodwill after a late delivery" className={inputClass} />
                      </div>
                    </div>
                    <Button type="submit" variant="primary" className="mt-3" disabled={busy || !points || reason.trim().length < 5}>
                      {busy ? "Saving…" : "Record correction"}
                    </Button>
                  </form>
                ) : null}
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
