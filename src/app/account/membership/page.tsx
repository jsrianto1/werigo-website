import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { getSessionUser } from "@/lib/session";
import { rideSummary } from "@/lib/rideClub";
import { RIDE_TIERS } from "@/lib/rideClubRules";
import { formatIdr } from "@/lib/pricing";

export const metadata: Metadata = { title: "Werigo Ride Club", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const date = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric" });

export default async function MembershipPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/membership");
  if (user.role === "admin" || user.role === "super_admin") redirect("/admin/membership");
  let summary: Awaited<ReturnType<typeof rideSummary>> = null;
  try {
    summary = await rideSummary(user.id);
  } catch {
    /* Show unavailable without a false zero balance. */
  }
  const balance = summary ? Math.max(0, summary.balance) : 0;

  return (
    <AccountShell name={user.name} email={user.email} title="Werigo Ride Club" lede="Earn Ride Points on completed rentals and use them toward your next ride or extension.">
      {summary ? (
        <div className="rounded-[14px] bg-primary p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/80">{summary.tier} member</p>
          <p className="tnum mt-3 font-display text-5xl">
            {balance} <span className="font-sans text-lg font-normal">Ride Points</span>
          </p>
          <p className="mt-2 text-sm text-white/90">Worth {formatIdr(balance * 200)} · minimum redemption 100 points</p>
          <p className="mt-4 text-sm text-white/80">Qualifying rentals in the last 12 months: {formatIdr(summary.spend)}</p>
          {!summary.welcome ? <p className="mt-2 text-sm text-white/80">Your 50-point welcome bonus unlocks after your first completed, paid rental with a verified email.</p> : null}
          {summary.balance < 0 ? <p className="mt-2 text-sm text-white/80">A refunded rental reversed points you previously used. Future points first cover the adjustment.</p> : null}
        </div>
      ) : (
        <p role="status" className="rounded-[14px] border border-line bg-card p-5 text-sm text-ink-soft">
          Ride Club is not available yet. Your bookings and vouchers remain available.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {RIDE_TIERS.map((t) => (
          <div key={t.name} className={`rounded-[14px] border bg-card p-5 ${summary?.tier === t.name ? "border-primary" : "border-line"}`}>
            <h2 className="font-display text-lg text-ink">{t.name}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t.spend ? `${formatIdr(t.spend)} in completed rentals over 12 months` : "Free when you create your customer account"}</p>
            <p className="mt-3 text-sm font-semibold text-primary">{t.multiplier} points / Rp10,000</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        1 point = Rp200. Points expire 12 months after issue. Redeem up to 10% of the rental charge, separately from promo codes and
        referrals. Delivery and other fees earn no points. Your tier at booking determines your earning rate. Rentals before the
        program starts do not earn points.
      </p>
      <Link href="/book" className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-strong">
        Plan your next ride
      </Link>

      {summary ? (
        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">Points history</h2>
          {summary.history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Your first completed rental starts your points history.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line bg-card">
              {summary.history.map((h) => (
                <li key={h.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{h.note}</p>
                    <p className="text-ink-soft">
                      {date(h.created_at)} · expires {date(h.expires_at)} ·{" "}
                      {h.revoked ? "reversed" : new Date(h.expires_at) <= new Date() ? "expired" : `${h.remaining} remaining`}
                    </p>
                  </div>
                  <span className="tnum whitespace-nowrap font-semibold text-ink">+{h.points}</span>
                </li>
              ))}
            </ul>
          )}
          {summary.redemptions.length > 0 || summary.adjustments.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-ink-soft">
              {summary.redemptions.map((r) => (
                <li key={r.booking_code} className="tnum">
                  {r.booking_code}: {r.points} points ·{" "}
                  {r.payment_status === "refunded" || ["cancelled", "expired"].includes(r.status) ? "released" : r.payment_status === "paid" ? "used" : "reserved during payment"}
                </li>
              ))}
              {summary.adjustments.map((a, i) => (
                <li key={i} className="tnum">
                  {date(a.created_at)}: {a.points} points · {a.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </AccountShell>
  );
}
