import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";
import { rideSummary } from "@/lib/rideClub";
import { RIDE_TIERS } from "@/lib/rideClubRules";
import { formatIdr } from "@/lib/pricing";
export const dynamic = "force-dynamic";
const date = (value: string | Date) => new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric" });
export default async function RewardsPage() {
  const user = await getSessionUser();
  let summary: Awaited<ReturnType<typeof rideSummary>> = null;
  if (user) try { summary = await rideSummary(user.id); } catch { /* Show unavailable, not a false balance. */ }
  return <><p className="ra-eyebrow">Werigo Ride Club</p><h1 className="ra-page-title">Your rides.<br/>A little extra back.</h1><section className="ra-points"><span>{summary ? `${summary.tier} member` : "Your riding rewards"}</span><h2>{summary ? Math.max(0, summary.balance).toLocaleString("en-GB") : "Ride Points"}</h2><p>{summary ? `Ride Points · worth ${formatIdr(Math.max(0, summary.balance) * 200)}` : user ? "Your membership balance is unavailable right now. Please try again later." : "Sign in to see your points balance, tier and rewards history."}</p><Link className="ra-light-button" href={user ? "/app/rent" : "/app/login?next=/app/rewards"}>{user ? "Plan your next rental" : "Sign in to Ride Club"}</Link></section><Image className="ra-rewards-image" src="/media/membership/ride-club-premium-v2.webp" alt="Werigo Silver, Gold and Platinum membership cards" width={1536} height={1024} sizes="(max-width:1100px) 100vw,1100px"/>
    <section className="ra-empty"><h2>Membership, made simple.</h2>{RIDE_TIERS.map(tier => <div className="wr-tier-row" key={tier.name}><span><b>{tier.name}</b><small>{tier.spend ? `${formatIdr(tier.spend)} in completed rentals over 12 months` : "Free with your customer account"}</small></span><strong>{tier.multiplier} pts / Rp10,000</strong></div>)}<p>Points are earned after a rental is paid and completed. 1 point = Rp200. Redeem from 100 points, up to 10% of rental charges. Points expire after 12 months. Choose one discount per booking.</p></section>
    {summary && <section><h2 className="ra-section-title">Points history</h2>{summary.balance < 0 && <p className="ra-footnote">A refunded rental reversed previously used points. Future points first cover that adjustment.</p>}{summary.history.length === 0 ? <p className="ra-lead">Your first completed, paid rental starts your points history.</p> : <ul className="wr-points-history">{summary.history.map(item => <li key={item.id}><span><b>{item.note}</b><small>{date(item.created_at)} · expires {date(item.expires_at)} · {item.revoked ? "reversed" : new Date(item.expires_at) <= new Date() ? "expired" : `${item.remaining} remaining`}</small></span><b>+{item.points}</b></li>)}</ul>}{summary.redemptions.map(item => <p className="ra-footnote" key={item.booking_code}>{item.booking_code}: {item.points} points · {item.payment_status === "refunded" || ["cancelled", "expired"].includes(item.status) ? "released" : item.payment_status === "paid" ? "used" : "reserved during payment"}</p>)}</section>}
  </>;
}
