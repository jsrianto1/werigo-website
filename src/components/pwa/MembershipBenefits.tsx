import { Check, Gem, Medal, Star } from "lucide-react";
import { RIDE_TIERS, POINT_VALUE_IDR } from "@/lib/rideClubRules";
import { formatIdr } from "@/lib/pricing";
const icons = { Silver: Medal, Gold: Star, Platinum: Gem };
export function MembershipBenefits({ currentTier }: { currentTier?: string }) {
  return <section className="wr-membership-benefits" aria-labelledby="membership-levels"><div className="wr-membership-heading"><p className="wr-kicker">Three levels. More rewarding rides.</p><h2 id="membership-levels">Meet your membership.</h2><p>The more you ride, the faster you earn. Your level is based on eligible completed rentals over the last 12 months.</p></div><div className="wr-tier-cards">{RIDE_TIERS.map(tier => {
    const Icon = icons[tier.name];
    const bonus = Math.round((tier.multiplier - 1) * 100);
    const points = Math.floor(100 * tier.multiplier);
    return <article className={`wr-tier-card wr-tier-${tier.name.toLowerCase()}`} key={tier.name} aria-label={`${tier.name} membership benefits`}>
      <div className="wr-tier-card-top"><Icon size={24}/><span>{currentTier === tier.name ? "Your level" : "Ride Club"}</span></div>
      <h3>{tier.name}</h3><p className="wr-tier-entry">{tier.spend ? `From ${formatIdr(tier.spend)} in eligible rentals` : "Free with your Werigo account"}</p>
      <div className="wr-tier-rate"><strong>{tier.multiplier}<small>×</small></strong><span>Ride Points<br/>{bonus ? `${bonus}% more than Silver` : "Your standard earning rate"}</span></div>
      <ul><li><Check size={15}/>{tier.multiplier} {tier.multiplier === 1 ? "point" : "points"} per Rp10,000 of net rental</li><li><Check size={15}/>{bonus ? `${bonus}% faster rewards on eligible rentals` : "Earn on every eligible completed rental"}</li></ul>
      <div className="wr-tier-example"><small>For Rp1,000,000 in net rental charges</small><strong>{points} points <span>· {formatIdr(points * POINT_VALUE_IDR)} in rewards</span></strong></div>
    </article>;
  })}</div><p className="wr-membership-fineprint">Your level when you book sets your earning rate. Points are rounded down once per booking and awarded after full payment and completion. Delivery, deposits and other fees earn no points.</p></section>;
}
