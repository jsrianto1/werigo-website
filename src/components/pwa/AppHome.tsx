"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, Compass, MessageCircle, Search, Store } from "lucide-react";
import { AppBrand } from "./AppBrand";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

export function AppHome({ onRent, firstName }: { onRent: () => void; firstName?: string }) {
  return <section className="wr-reference-home">
    <h1 className="sr-only">Where we go?</h1>
    <div className="wr-home-location"><button type="button" onClick={onRent}><span className="wr-gps-dot" /><span>Bali, Indonesia</span><ChevronDown size={15} /></button><a href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />Help</a></div>
    <div className="wr-home-wordmark"><AppBrand /></div>
    <div className="wr-home-search"><button type="button" className="wr-home-search-main" onClick={onRent}><Search size={23} /><span>{firstName ? `Hi, ${firstName}` : "Where we go?"}</span></button><button type="button" className="wr-home-later" onClick={onRent}><CalendarDays size={16} />Later</button></div>
    <button type="button" className="wr-home-showroom" onClick={onRent}><span><Store size={23} /></span><span><strong>Pick up at Werigo</strong><small>Gatot Subroto Tengah No.93, Denpasar</small></span><ChevronRight size={20} /></button>
    <Link className="wr-home-club" href="/app/rewards"><span><strong>Every ride.<br />More rewards.</strong><small>Discover Werigo Ride Club</small><b>View membership</b></span><Image src="/media/fleet/victory/catalog.webp" alt="Wedison Victory electric motorcycle, shown in full" width={760} height={720} sizes="(max-width:760px) 42vw, 250px" priority /></Link>
    <div className="wr-home-section-heading"><h2>For you</h2><Link href="/app/services" aria-label="See all Werigo services"><ChevronRight size={18} /></Link></div>
    <div className="wr-home-service-circles"><button type="button" onClick={onRent}><span><Image src="/media/fleet/victory/catalog.webp" alt="" width={150} height={130} /></span><b>Rent</b></button><Link href="/app/charge"><span><Image src="/media/supercharge/supercharge-unit.webp" alt="" width={120} height={160} /></span><b>Charging</b></Link><Link href="/app/explore"><span><Compass size={40} /></span><b>What to do?</b></Link></div>
  </section>;
}
