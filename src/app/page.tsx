
import { T } from "@/components/i18n/LanguageProvider";
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
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { SagaTeaser } from "@/components/home/SagaTeaser";

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
  return (
    <>
      <section className="home-video-hero" aria-labelledby="home-title">
        <HeroBackdrop />
        <div className="home-hero-inner"><div className="hero-copy">
          <p className="eyebrow"><T>{"Electric scooter rental in Bali"}</T></p>
          <h1 id="home-title"><T>{"Your Bali."}</T><br /><T>{"Your own ride."}</T></h1>
          <p className="hero-lede"><T>{"Electric scooters delivered to your stay. Two helmets included. Daily, weekly and monthly rates."}</T></p>
          <div className="hero-actions"><ButtonLink href="#hero-booking" variant="accent" size="lg"><T>{"Check availability"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><Link href="/monthly-scooter-rental-bali" className="text-link"><T>{"Monthly rentals"}</T></Link></div>
        </div>
        </div>
      </section>

      <div className="proof-strip" aria-label="Included with your rental">{proof.map(({icon: Icon, title, detail}) => <div key={title}><Icon aria-hidden="true" /><p><strong><T>{title}</T></strong><span><T>{detail}</T></span></p></div>)}</div>

      <Section id="hero-booking" labelledBy="booking-title" className="!py-10 md:!py-14">
        <div className="booking-heading"><h2 id="booking-title" className="font-display text-2xl"><T>{"Where will Bali take you?"}</T></h2><p><T>{"From"}</T>{" "}<strong>{formatIdr(ratesIdrPerDay.bees.daily)}<T>{"/day"}</T></strong>{" "}<T>{"for Wedison Bees. Minimum 2 days."}</T></p></div>
        <SearchWidget compact />
      </Section>
      <StickyBookCTA targetId="hero-booking" />

      <Section labelledBy="fleet-heading" className="!pt-6">
        <div className="section-intro"><h2 id="fleet-heading"><T>{"Find your Bali ride."}</T></h2><p><T>{"Four electric models for different kinds of days. Compare rates, then choose the one that fits your plans."}</T></p></div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{bikes.map(entry => <VehicleCard key={entry.id} entry={entry} />)}</div>
        <p className="mt-5 text-sm text-ink-soft"><T>{"Rates are per motorcycle, per day. Daily tier: 2 to 6 days. Monthly tier: 1 month or longer. Availability and final quote confirmed on WhatsApp."}</T></p>
        <Link href="/fleet" className="text-link mt-6"><T>{"Compare all models"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Section>

      <Section tone="wash" labelledBy="monthly-heading">
        <div className="monthly-feature">
          <div className="monthly-story"><p className="eyebrow"><T>{"Stay a little longer"}</T></p><h2 id="monthly-heading" className="marketing-heading"><T>{"Make it your"}</T><br /><T>{"everyday ride."}</T></h2><p><T>{"Your coffee run, coworking commute and sunset stop. Monthly electric scooter rental gives your Bali routine a ride of its own."}</T></p><ButtonLink href="/monthly-scooter-rental-bali" variant="accent" size="lg"><T>{"Explore monthly rentals"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><AreaImage slug="ubud" className="mt-8 h-56 rounded-[14px]" sizes="(max-width: 768px) 100vw, 45vw" /></div>
          <MonthlyRates />
        </div>
      </Section>

      <SagaTeaser />

      <Section labelledBy="includes-heading">
        <div className="essentials-layout">
          <div><h2 id="includes-heading" className="marketing-heading"><T>{"The essentials."}</T><br /><T>{"Already sorted."}</T></h2><p className="mt-5 max-w-lg leading-relaxed text-ink-soft"><T>{"Your rental is more than a motorcycle. Here is what comes with every Werigo ride."}</T></p><ul className="essentials-list">{confirmedBenefits.map(b => <li key={b.id}><Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><span><strong><T>{b.label}</T></strong><span><T>{b.description}</T></span></span></li>)}</ul><p className="mt-6 text-sm leading-relaxed text-ink-soft"><T>{"A rain poncho and protection options can be added on request. Ask our team about availability, pricing and conditions."}</T></p></div>
          <div className="charging-panel"><Image src="/media/supercharge/supercharge-unit.png" alt="Official Wedison SuperCharge charging unit" width={1200} height={1600} sizes="(max-width: 768px) 80vw, 360px" className="charging-photo" /><h3 className="font-display text-2xl"><T>{"A charging plan that fits your day."}</T></h3><p className="mt-3 leading-relaxed text-ink-soft"><T>{"Charge at your accommodation with a suitable outlet and the official charger. For compatible models, ask us about Wedison SuperCharge locations."}</T></p><Link href="/supercharge" className="text-link mt-5"><T>{"Explore SuperCharge"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        </div>
      </Section>

      <Section labelledBy="how-heading" tone="wash"><div className="section-intro"><h2 id="how-heading"><T>{"A few steps. Then you are off."}</T></h2><p><T>{"Check your estimate online. Finalise the details with a real person."}</T></p></div><ol className="rental-steps">{steps.map(([title, detail], i) => <li key={title}><span className="step-number" aria-hidden="true">0{i+1}</span><h3><T>{title}</T></h3><p><T>{detail}</T></p></li>)}</ol><Link href="/how-it-works" className="text-link mt-8"><T>{"How it works"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Section>

      <Section labelledBy="areas-heading"><div className="section-intro"><h2 id="areas-heading"><T>{"Your stay is our starting point."}</T></h2><p><T>{"Arrange scooter delivery to your hotel or villa in eight Bali service areas. Airport handover is also available by arrangement."}</T></p></div><div className="destination-grid">{["canggu", "ubud", "uluwatu"].map(slug => <Link key={slug} href={`/delivery-areas/${slug}`} className="destination-tile"><AreaImage slug={slug} className="h-full" sizes="(max-width: 640px) 100vw, 33vw" /><span><T>{serviceAreas.find(a => a.slug === slug)?.name}</T> <ArrowRight aria-hidden="true" className="h-5 w-5" /></span></Link>)}</div><div className="area-links">{serviceAreas.map(area => <Link href={`/delivery-areas/${area.slug}`} key={area.slug}><T>{area.name}</T></Link>)}</div><p className="mt-4 text-sm text-ink-soft"><T>{"Delivery timing and fees are confirmed for your booking."}</T></p></Section>

      <Section tone="wash" labelledBy="faq-heading"><div className="faq-layout"><div><h2 id="faq-heading" className="marketing-heading"><T>{"Good questions."}</T><br /><T>{"Clear answers."}</T></h2><p className="mt-5 text-ink-soft"><T>{"A little planning makes a better ride."}</T></p><Link href="/help-center" className="text-link mt-6"><T>{"Visit the Help Center"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div><Accordion items={marketingFaqs} /></div></Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd(faqSchema(marketingFaqs))}} />

      <Section labelledBy="cta-heading"><div className="closing-cta"><h2 id="cta-heading"><T>{"Give your Bali plans"}</T><br /><T>{"a ride of their own."}</T></h2><p><T>{"Choose your dates. We will help with the rest."}</T></p><ButtonLink href="/book" variant="accent" size="lg"><T>{"Check availability"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink></div></Section>
    </>
  );
}
