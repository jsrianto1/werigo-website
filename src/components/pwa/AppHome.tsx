"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Gift, MapPin, MessageCircle } from "lucide-react";
import { AppBrand, WerigoWing } from "./AppBrand";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { ExploreGuideNav } from "./ExploreGuideNav";
import { ChargeFeature } from "./ChargeFeature";

export function AppHome({ onRent, firstName }: { onRent: () => void; firstName?: string }) {
  return <section className="wg-home">
    <div className="wg-home-masthead"><AppBrand/><a className="wg-help" href={buildSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer" aria-label="Get help from Werigo"><MessageCircle size={20}/></a></div>
    <div className="wg-greeting"><p>{firstName ? `Good to see you, ${firstName}.` : "A little more Bali. A lot more freedom."}</p><span><MapPin size={13}/>Bali</span></div>
    <div className="wg-home-grid">
      <section className="wg-ride-hero" aria-labelledby="werigo-home-title">
        <svg className="wg-hero-route" viewBox="0 0 400 460" aria-hidden="true"><path d="M420 34H302c-91 0-91 109 0 109h12c91 0 91 120 0 120H151c-108 0-108 123 0 123h278"/><circle cx="302" cy="34" r="8"/></svg>
        <p className="wg-overline">YOUR ISLAND. YOUR PACE.</p><h1 id="werigo-home-title">Where<br/>we go<span>?</span></h1>
        <p className="wg-hero-description">Bali is better on a Wedison.</p>
        <div className="wg-hero-bike"><Image src="/app/edpower-red.webp" alt="Red Wedison EdPower electric motorcycle, shown in full" width={1100} height={922} sizes="(max-width:600px) 85vw, 470px" priority/></div>
        <span className="wg-bike-caption"><i/>EDPOWER · FULLY ELECTRIC</span>
        <button type="button" className="wg-rent-button" onClick={onRent}><span>Find my ride</span><ArrowRight size={22}/></button>
      </section>
      <ChargeFeature/>
      <div className="wg-home-side">
        <div className="wg-section-heading"><div><p className="wg-overline">YOUR ISLAND GUIDE</p><h2>Make it a Bali day.</h2></div><Link href="/app/services" aria-label="Explore Werigo services"><ArrowUpRight size={22}/></Link></div>
        <ExploreGuideNav visual/>
      </div>
    </div>
    <Link className="wg-club-ticket" href="/app/rewards"><span className="wg-ticket-icon"><Gift size={26}/></span><span><small>WERIGO RIDE CLUB</small><strong>Every ride takes you further.</strong><p>Earn points. Unlock your next level.</p></span><ArrowUpRight size={23}/><WerigoWing className="wg-ticket-wing"/></Link>
    <div className="wg-home-footnote"><span>Electric rides. Island freedom.</span><button type="button" onClick={onRent}>Choose your motorcycle<ArrowRight size={14}/></button></div>
  </section>;
}
