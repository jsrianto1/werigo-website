import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Compass, Gift } from "lucide-react";
import { ExploreGuideNav } from "@/components/pwa/ExploreGuideNav";

export default function ServicesPage() {
  return <section className="wg-services"><p className="wg-overline">THE WERIGO WAY</p><h1 className="ra-page-title">Where we go?</h1><p className="ra-lead">Coffee spots, island stays, wellness and more. Pick your next stop.</p>
    <ExploreGuideNav visual/>
    <div className="wg-services-grid"><Link className="wg-service-rent" href="/app/rent?start=1"><span className="wg-service-number">01 / RIDE</span><h2>Your own<br/>electric escape.</h2><p>Pick a Wedison. Make Bali yours.</p><Image src="/app/edpower-red.webp" alt="Red Wedison EdPower, shown in full" width={1100} height={922} sizes="(max-width:600px) 85vw, 400px"/><span className="wg-service-cta">Rent a motorcycle<ArrowUpRight size={21}/></span></Link>
    <Link className="wg-service-charge" href="/app/charge"><span className="wg-service-number">02 / RECHARGE</span><BatteryCharging size={32}/><h2>Charge & go.</h2><p>Find Wedison SuperCharge locations.</p><ArrowUpRight className="wg-service-arrow" size={22}/></Link>
    <Link className="wg-service-explore" href="/app/explore"><Image src="/media/areas/uluwatu/hero.webp" alt="The Uluwatu coastline in Bali" fill sizes="(max-width:600px) 85vw, 420px"/><span className="wg-discover-shade"/><div><span className="wg-service-number">03 / DISCOVER</span><Compass size={29}/><h2>What to do?</h2><p>A new corner of Bali is calling.</p><ArrowUpRight className="wg-service-arrow" size={22}/></div></Link></div>
    <Link className="wg-services-club" href="/app/rewards"><Gift size={24}/><span><strong>Your rides come with a little extra.</strong><small>Discover Werigo Ride Club</small></span><ArrowUpRight size={22}/></Link>
  </section>;
}
