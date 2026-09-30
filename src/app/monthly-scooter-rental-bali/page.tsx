import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, CalendarDays, MessageCircle } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { MonthlyRates } from "@/components/home/MonthlyRates";
import { Accordion } from "@/components/ui/Accordion";
import { AreaImage } from "@/components/areas/AreaImage";
import { faqSchema, jsonLd } from "@/lib/schema";
import { marketingFaqs } from "@/data/marketingFaqs";
import { deliveryFeeWaiverNote, serviceAreas } from "@/data/locations";

export const metadata = pageMetadata("Monthly Scooter Rental Bali | Electric Long-Stay Rentals", "Monthly electric scooter rental in Bali from Rp50,000/day for 1 month or longer. Official Wedison models, two helmets and local support. Check your dates.", "/monthly-scooter-rental-bali");

const faqs = [marketingFaqs[1], marketingFaqs[3], marketingFaqs[4], {question: "What delivery fees apply to a monthly rental?", answer: deliveryFeeWaiverNote}, marketingFaqs[5]];

export default function MonthlyRentalPage() {
  return <>
    <section className="marketing-hero monthly-hero" aria-labelledby="monthly-title"><div className="hero-copy"><p className="eyebrow">Monthly electric scooter rental in Bali</p><h1 id="monthly-title">Settle in.<br />Ride your way.</h1><p className="hero-lede">One electric scooter for your everyday Bali. Monthly rates, two helmets and a local team on WhatsApp.</p><div className="hero-actions"><ButtonLink href="/book?duration=monthly" size="lg" variant="accent">Check availability <ArrowRight aria-hidden="true" className="h-4 w-4" /></ButtonLink><a href="#monthly-rates" className="text-link">See monthly rates</a></div></div><figure className="hero-product"><Image src="/media/fleet/victory/catalog.webp" alt="Official Wedison Victory electric motorcycle for monthly rental in Bali" width={760} height={720} priority sizes="(max-width: 767px) 100vw, 52vw" className="hero-bike" /><figcaption><span>Wedison Victory</span><span>Powered by Wedison</span></figcaption></figure></section>
    <Section labelledBy="routine-title"><div className="section-intro"><h2 id="routine-title">Less organising. More living here.</h2><p>For your coworking commute, grocery run and favourite beach. Keep a motorcycle for your stay and make getting around part of your routine.</p></div><div className="monthly-benefits">{[{icon:CalendarDays,title:"A lower daily rate",text:"The monthly tier applies to rentals of 1 month or longer. Your total follows your actual dates."},{icon:BatteryCharging,title:"Charging, explained",text:"Ask your host about a suitable outlet. We explain your model and official charger at handover."},{icon:MessageCircle,title:"People you can reach",text:"Our Bali team replies daily from 08:00 to 20:00 WITA. Ask about your rental, charging or an extension."}].map(({icon:Icon,title,text})=><div key={title}><Icon className="h-7 w-7 text-primary" aria-hidden="true"/><h3 className="mt-5 font-display text-xl">{title}</h3><p className="mt-3 leading-relaxed text-ink-soft">{text}</p></div>)}</div></Section>
    <Section id="monthly-rates" tone="wash" labelledBy="rates-title"><div className="monthly-feature"><div><h2 id="rates-title" className="marketing-heading">Choose a ride<br />for your routine.</h2><p className="mt-5 max-w-lg leading-relaxed text-ink-soft">All four models are official Wedison motorcycles. Each rental includes two sanitised helmets, an installed phone holder, a briefing and at least 80% battery at handover.</p><p className="mt-4 text-sm leading-relaxed text-ink-soft">Wedison EdPower requires a rider aged 25 or older. Availability, final quote and delivery time are confirmed on WhatsApp.</p><Link href="/fleet" className="text-link mt-6">Compare all models <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div><MonthlyRates /></div></Section>
    <Section labelledBy="stay-title"><div className="monthly-feature"><AreaImage slug="canggu" className="h-[420px] rounded-[14px]" sizes="(max-width: 767px) 100vw, 45vw" /><div><h2 id="stay-title" className="marketing-heading">From your front door<br />to your next favourite.</h2><p className="mt-5 leading-relaxed text-ink-soft">Arrange delivery and collection at your Bali hotel, villa or guesthouse.</p><p className="mt-4 text-sm leading-relaxed text-ink-soft">{deliveryFeeWaiverNote}</p><div className="area-links">{serviceAreas.map(area=><Link key={area.slug} href={`/delivery-areas/${area.slug}`}>{area.name}</Link>)}</div><ButtonLink href="/book?duration=monthly" variant="accent" size="lg" className="mt-8">Check availability</ButtonLink></div></div></Section>
    <Section tone="wash" labelledBy="monthly-faq"><div className="faq-layout"><h2 id="monthly-faq" className="marketing-heading">Before you<br />make it a month.</h2><Accordion items={faqs}/></div></Section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(faqSchema(faqs))}} />
  </>;
}
