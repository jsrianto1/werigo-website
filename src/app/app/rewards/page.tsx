import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";
import { rideSummary } from "@/lib/rideClub";
import { formatIdr } from "@/lib/pricing";
export const dynamic="force-dynamic";
export default async function RewardsPage(){
  const user=await getSessionUser();
  let summary: Awaited<ReturnType<typeof rideSummary>>=null;
  if(user)try{summary=await rideSummary(user.id);}catch{}
  return <><p className="ra-eyebrow">Werigo Ride Club</p><h1 className="ra-page-title">The next ride<br/>feels even better.</h1><section className="ra-points"><span>{summary ? `${summary.tier} member` : "Your riding rewards"}</span><h2>{summary ? Math.max(0,summary.balance).toLocaleString("en-GB") : "Ride Points"}</h2><p>{summary ? `Ride Points · worth ${formatIdr(Math.max(0,summary.balance)*200)}` : user ? "Your membership balance is unavailable right now. Open your membership to try again." : "Sign in to see your balance, tier and points history."}</p><Link className="ra-light-button" href={user ? "/account/membership" : "/account/login?next=/app/rewards"}>{user ? "Open membership & history" : "Sign in to Ride Club"}</Link></section><Image className="ra-rewards-image" src="/media/membership/ride-club-premium-v2.webp" alt="Werigo Silver, Gold and Platinum membership cards" width={1536} height={1024} sizes="(max-width:1100px) 100vw,1100px"/><section className="ra-empty"><h2>Your rides add up.</h2><p>Earn points after a rental is paid and marked completed. One Ride Point equals Rp200. Redeem from 100 points, for up to 10% of rental charges. Points expire after 12 months; choose one discount per booking.</p><Link className="ra-text-link" href="/ride-club">See all membership rules</Link></section></>;
}
