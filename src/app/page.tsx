import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Check, HardHat, MessageCircle, Truck } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { StickyBookCTA } from "@/components/booking/StickyBookCTA";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { MonthlyRates } from "@/components/home/MonthlyRates";
import { AreaImage } from "@/components/areas/AreaImage";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { getPrimaryCards } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";
import { confirmedBenefits } from "@/data/commercialTerms";
import { marketingFaqs } from "@/data/marketingFaqs";
import { faqSchema, jsonLd } from "@/lib/schema";
import { ratesIdrPerDay, formatIdr } from "@/lib/pricing";
import { getEpisodes, coverSrc } from "@/data/saga";

export const metadata = pageMetadata("Electric Scooter Rental Bali | Daily & Monthly", "Rent a Wedison electric scooter in Bali from Rp90,000/day. Hotel and villa delivery, two helmets included, plus weekly and monthly rates. Check your dates.", "/");

const proof = [
  { icon: Truck, title: "Delivered to your stay", detail: "Hotel and villa handover" },
  { icon: HardHat, title: "Two helmets included", detail: "Plus an installed phone holder" },
  { icon: BatteryCharging, title: "Charge at your stay", detail: "Guidance at handover" },
  { icon: MessageCircle, title: "A local team", detail: "Daily, 08:00 to 20:00 WITA" },
];
const steps = [
  ["Choose your ride", "Compare the models, select your dates and tell us where you are staying."],
  ["Review your estimate", "See the rental rate and optional extras before you send your request."],
  ["Confirm on WhatsApp", "Our team checks availability and agrees the final quote and delivery time with you."],
  ["Meet your motorcycle", "Get your helmets, a condition check and a riding and charging briefing at handover."],
];

export default function HomePage() {
  const bikes = getPrimaryCards();
  const episodes = getEpisodes();
  const latest = episodes.at(-1);
  return (
    <>
      <section className="marketing-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">Electric scooter rental in Bali</p>
          <h1 id="home-title">Your Bali.<br />Your own ride.</h1>
          <p className="hero-lede">Electric scooters delivered to your stay. Two helmets included. Daily, weekly and monthly rates.</p>
          <div className="hero-actions"><ButtonLink href="#hero-booking" variant="accent" size="lg">Check availability <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><Link href="/monthly-scooter-rental-bali" className="text-link">Monthly rentals</Link></div>
        </div>
        <figure className="hero-product">
          <Image src="/media/fleet/athena/catalog.webp" alt="Official Wedison Athena electric motorcycle in olive green, available for rental in Bali" width={760} height={639} priority sizes="(max-width: 767px) 100vw, 52vw" className="hero-bike" />
          <figcaption><span>Wedison Athena</span><span>Powered by Wedison</span></figcaption>
        </figure>
      </section>

      <div className="proof-strip" aria-label="Included with your rental">{proof.map(({icon: Icon, title, detail}) => <div key={title}><Icon aria-hidden="true" /><p><strong>{title}</strong><span>{detail}</span></p></div>)}</div>

      <Section id="hero-booking" labelledBy="booking-title" className="!py-10 md:!py-14">
        <div className="booking-heading"><h2 id="booking-title" className="font-display text-2xl">Where will Bali take you?</h2><p>From <strong>{formatIdr(ratesIdrPerDay.bees.daily)}/day</strong> for Wedison Bees. Minimum 2 days.</p></div>
        <SearchWidget compact />
      </Section>
      <StickyBookCTA targetId="hero-booking" />

      <Section labelledBy="fleet-heading" className="!pt-6">
        <div className="section-intro"><h2 id="fleet-heading">Find your Bali ride.</h2><p>Four electric models for different kinds of days. Compare rates, then choose the one that fits your plans.</p></div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{bikes.map(entry => <VehicleCard key={entry.id} entry={entry} />)}</div>
        <p className="mt-5 text-sm text-ink-soft">Rates are per motorcycle, per day. Daily tier: 2 to 6 days. Monthly tier: 1 month or longer. Availability and final quote confirmed on WhatsApp.</p>
        <Link href="/fleet" className="text-link mt-6">Compare all models <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Section>

      <Section tone="wash" labelledBy="monthly-heading">
        <div className="monthly-feature">
          <div className="monthly-story"><p className="eyebrow">Stay a little longer</p><h2 id="monthly-heading" className="marketing-heading">Make it your<br />everyday ride.</h2><p>Your coffee run, coworking commute and sunset stop. Monthly electric scooter rental gives your Bali routine a ride of its own.</p><ButtonLink href="/monthly-scooter-rental-bali" variant="accent" size="lg">Explore monthly rentals <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><AreaImage slug="ubud" className="mt-8 h-56 rounded-[14px]" sizes="(max-width: 768px) 100vw, 45vw" /></div>
          <MonthlyRates />
        </div>
      </Section>

      <Section labelledBy="includes-heading">
        <div className="essentials-layout">
          <div><h2 id="includes-heading" className="marketing-heading">The essentials.<br />Already sorted.</h2><p className="mt-5 max-w-lg leading-relaxed text-ink-soft">Your rental is more than a motorcycle. Here is what comes with every Werigo ride.</p><ul className="essentials-list">{confirmedBenefits.map(b => <li key={b.id}><Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><span><strong>{b.label}</strong><span>{b.description}</span></span></li>)}</ul><p className="mt-6 text-sm leading-relaxed text-ink-soft">A rain poncho and protection options can be added on request. Ask our team about availability, pricing and conditions.</p></div>
          <div className="charging-panel"><Image src="/media/supercharge/supercharge-unit.png" alt="Official Wedison SuperCharge charging unit" width={1200} height={1600} sizes="(max-width: 768px) 80vw, 360px" className="charging-photo" /><h3 className="font-display text-2xl">A charging plan that fits your day.</h3><p className="mt-3 leading-relaxed text-ink-soft">Charge at your accommodation with a suitable outlet and the official charger. For compatible models, ask us about Wedison SuperCharge locations.</p><Link href="/supercharge" className="text-link mt-5">Explore SuperCharge <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        </div>
      </Section>

      <Section labelledBy="how-heading" tone="wash"><div className="section-intro"><h2 id="how-heading">A few steps. Then you are off.</h2><p>Check your estimate online. Finalise the details with a real person.</p></div><ol className="rental-steps">{steps.map(([title, detail], i) => <li key={title}><span className="step-number" aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{detail}</p></li>)}</ol><Link href="/how-it-works" className="text-link mt-8">How it works <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Section>

      <Section labelledBy="areas-heading"><div className="section-intro"><h2 id="areas-heading">Your stay is our starting point.</h2><p>Arrange scooter delivery to your hotel or villa in eight Bali service areas. Airport handover is also available by arrangement.</p></div><div className="destination-grid">{["canggu", "ubud", "uluwatu"].map(slug => <Link key={slug} href={`/delivery-areas/${slug}`} className="destination-tile"><AreaImage slug={slug} className="h-full" sizes="(max-width: 640px) 100vw, 33vw" /><span>{serviceAreas.find(a => a.slug === slug)?.name} <ArrowRight aria-hidden="true" className="h-5 w-5" /></span></Link>)}</div><div className="area-links">{serviceAreas.map(area => <Link href={`/delivery-areas/${area.slug}`} key={area.slug}>{area.name}</Link>)}</div><p className="mt-4 text-sm text-ink-soft">Delivery timing and fees are confirmed for your booking.</p></Section>

      <Section tone="wash" labelledBy="faq-heading"><div className="faq-layout"><div><h2 id="faq-heading" className="marketing-heading">Good questions.<br />Clear answers.</h2><p className="mt-5 text-ink-soft">A little planning makes a better ride.</p><Link href="/help-center" className="text-link mt-6">Visit the Help Center <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div><Accordion items={marketingFaqs} /></div></Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd(faqSchema(marketingFaqs))}} />

      {latest ? <Section labelledBy="saga-teaser-heading" className="!py-10"><div className="saga-inline"><Image src={coverSrc(latest)} alt="WERIGO SAGA latest chapter cover" width={96} height={120} className="rounded-lg object-cover" sizes="96px" /><div><h2 id="saga-teaser-heading" className="font-display text-xl">Another side of the ride.</h2><p className="mt-2 text-sm text-ink-soft">Discover WERIGO SAGA, our free Bali adventure webtoon.</p><Link href="/saga" className="text-link mt-2">Read the story <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></div></Section> : null}
      <Section labelledBy="cta-heading"><div className="closing-cta"><h2 id="cta-heading">Give your Bali plans<br />a ride of their own.</h2><p>Choose your dates. We will help with the rest.</p><ButtonLink href="/book" variant="accent" size="lg">Check availability <ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink></div></Section>
    </>
  );
}
