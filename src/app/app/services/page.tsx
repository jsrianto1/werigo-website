import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Gift } from "lucide-react";

export default function ServicesPage() {
  return <section className="wr-services-page"><h1 className="ra-page-title">Services</h1><h2>Go somewhere good.</h2><div className="wr-service-tiles">
    <Link href="/app/rent?start=1"><Image src="/app/edpower-red.webp" alt="Red Wedison EdPower" width={150} height={130} /><strong>Rent</strong></Link>
    <Link href="/app/charge"><Image src="/media/supercharge/supercharge-unit.webp" alt="Wedison SuperCharge" width={120} height={160} /><strong>Charging</strong></Link>
    <Link href="/app/explore"><Compass size={42} /><strong>What to do?</strong></Link>
  </div><Link className="wr-services-membership" href="/app/rewards"><Gift size={28} /><span><strong>Werigo Ride Club</strong><small>Your membership, points and benefits</small></span><ArrowRight size={20} /></Link></section>;
}
