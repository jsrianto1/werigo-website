import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { getSessionUser } from "@/lib/session";
import { rideSummary } from "@/lib/rideClub";
import { RIDE_TIERS } from "@/lib/rideClubRules";
import { formatIdr } from "@/lib/pricing";
export const metadata: Metadata = { title: "Werigo Ride Club", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const date = (value: string | Date) => new Date(value).toLocaleDateString("en-GB", {timeZone:"Asia/Makassar",day:"numeric",month:"short",year:"numeric"});
export default async function MembershipPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/account/membership");
  if (user.role === "admin" || user.role === "super_admin") redirect("/admin/membership");
  let summary: Awaited<ReturnType<typeof rideSummary>> = null;
  try { summary = await rideSummary(user.id); } catch { /* Show unavailable without a false zero balance. */ }
  return <Section className="!py-10"><div className="mx-auto max-w-3xl">
    <AccountNav name={user.name} />
    <p className="eyebrow mt-8">Werigo Ride Club</p>
    <h2 className="font-display text-3xl text-ink">Your rides go further.</h2>
    <p className="mt-2 text-ink-soft">Earn Ride Points on completed rentals. Use them toward your next ride or extension.</p>
    {summary ? <div className="mt-6 rounded-[14px] bg-primary p-6 text-white">
      <p className="font-semibold">{summary.tier} member</p>
      <p className="mt-3 text-4xl font-semibold tnum">{Math.max(0,summary.balance)} <span className="text-lg">Ride Points</span></p>
      <p className="mt-2">Worth {formatIdr(Math.max(0,summary.balance)*200)} · minimum redemption 100 points</p>
      <p className="mt-3 text-sm">Qualifying rentals in the last 12 months: {formatIdr(summary.spend)}</p>
      {!summary.welcome && <p className="mt-3 text-sm">Your 50-point welcome bonus unlocks after your first completed, paid rental with a verified email.</p>}
      {summary.balance<0 && <p className="mt-3 text-sm">A refunded rental reversed points you previously used. Future points first cover the adjustment.</p>}
    </div> : <p role="status" className="mt-6 rounded-xl border border-line p-5">Ride Club is not available yet. Your bookings and vouchers remain available.</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{RIDE_TIERS.map(t=><div key={t.name} className="rounded-xl border border-line p-5">
      <h3 className="font-semibold">{t.name}</h3><p className="mt-2 text-sm text-ink-soft">{t.spend?`${formatIdr(t.spend)} in completed rentals over 12 months`:"Free when you create your customer account"}</p>
      <p className="mt-3 font-semibold text-primary">{t.multiplier} points / Rp10,000</p>
    </div>)}</div>
    <p className="mt-5 text-sm text-ink-soft">1 point = Rp200. Points expire 12 months after issue. Redeem up to 10% of the rental charge, separately from promo codes and referrals. Delivery and other fees earn no points. Your tier at booking determines your earning rate. Rentals before the program starts do not earn points.</p>
    <Link href="/book" className="mt-5 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-white">Plan your next ride</Link>
    {summary && <><h3 className="mt-9 text-xl font-semibold">Points history</h3>
      <ul className="mt-3 divide-y divide-line">{summary.history.map(h=><li key={h.id} className="flex justify-between gap-4 py-4 text-sm">
        <div><p className="font-semibold">{h.note}</p><p className="text-ink-soft">{date(h.created_at)} · expires {date(h.expires_at)}</p><p className="text-ink-soft">{h.revoked?"Reversed":new Date(h.expires_at)<=new Date()?"Expired":`${h.remaining} remaining`}</p></div><span className="whitespace-nowrap font-semibold">+{h.points} points</span></li>)}</ul>
      {summary.history.length===0 && <p className="mt-3 text-sm text-ink-soft">Your first completed rental starts your points history.</p>}
      {summary.redemptions.map(r=><p key={r.booking_code} className="mt-3 text-sm">{r.booking_code}: {r.points} points · {r.payment_status==='refunded'||['cancelled','expired'].includes(r.status)?"released":r.payment_status==='paid'?"used":"reserved during payment"}</p>)}
      {summary.adjustments.map((a,i)=><p key={i} className="mt-3 text-sm">{date(a.created_at)}: {a.points} points · {a.reason}</p>)}
    </>}
  </div></Section>;
}
