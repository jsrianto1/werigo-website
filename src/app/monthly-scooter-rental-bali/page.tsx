
import { T } from "@/components/i18n/LanguageProvider";
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

export const metadata = pageMetadata("Monthly Electric Scooter Rental Bali", "Monthly electric scooter rental in Bali from Rp50,000/day for 1 month or longer. Official Wedison models, two helmets and local support. Check your dates.", "/monthly-scooter-rental-bali");

const faqs = [marketingFaqs[1], marketingFaqs[3], marketingFaqs[4], {question: "What delivery fees apply to a monthly rental?", answer: deliveryFeeWaiverNote}, marketingFaqs[5]];

export default function MonthlyRentalPage() {
  return <>
    <section className="marketing-hero monthly-hero" aria-labelledby="monthly-title"><div className="hero-copy"><p className="eyebrow"><T>{"Monthly electric scooter rental in Bali"}</T></p><h1 id="monthly-title"><T>{"Settle in."}</T><br /><T>{"Ride your way."}</T></h1><p className="hero-lede"><T>{"One electric scooter for your everyday Bali. Monthly rates, two helmets and a local team on WhatsApp."}</T></p><div className="hero-actions"><ButtonLink href="/book?duration=monthly" size="lg" variant="accent"><T>{"Check availability"}</T>{" "}<ArrowRight aria-hidden="true" className="h-4 w-4" /></ButtonLink><a href="#monthly-rates" className="text-link"><T>{"See monthly rates"}</T></a></div></div><figure className="hero-product"><Image src="/media/fleet/victory/catalog.webp" alt="Official Wedison Victory electric motorcycle for monthly rental in Bali" width={760} height={720} priority sizes="(max-width: 767px) 100vw, 52vw" className="hero-bike" /><figcaption><span><T>{"Wedison Victory"}</T></span><span><T>{"Powered by Wedison"}</T></span></figcaption></figure></section>
    <Section labelledBy="routine-title"><div className="section-intro"><h2 id="routine-title"><T>{"Less organising. More living here."}</T></h2><p><T>{"For your coworking commute, grocery run and favourite beach. Keep a motorcycle for your stay and make getting around part of your routine."}</T></p></div><div className="monthly-benefits">{[{icon:CalendarDays,title:"A lower daily rate",text:"The monthly tier applies to rentals of 1 month or longer. Your total follows your actual dates."},{icon:BatteryCharging,title:"Charging, explained",text:"Ask your host about a suitable outlet. We explain your model and official charger at handover."},{icon:MessageCircle,title:"People you can reach",text:"Our Bali team replies daily from 08:00 to 20:00 WITA. Ask about your rental, charging or an extension."}].map(({icon:Icon,title,text})=><div key={title}><Icon className="h-7 w-7 text-primary" aria-hidden="true"/><h3 className="mt-5 font-display text-xl"><T>{title}</T></h3><p className="mt-3 leading-relaxed text-ink-soft"><T>{text}</T></p></div>)}</div></Section>
    <Section id="monthly-rates" tone="wash" labelledBy="rates-title"><div className="monthly-feature"><div><h2 id="rates-title" className="marketing-heading"><T>{"Choose a ride"}</T><br /><T>{"for your routine."}</T></h2><p className="mt-5 max-w-lg leading-relaxed text-ink-soft"><T>{"All four models are official Wedison motorcycles. Each rental includes two sanitised helmets, an installed phone holder, a briefing and at least 80% battery at handover."}</T></p><p className="mt-4 text-sm leading-relaxed text-ink-soft"><T>{"Wedison EdPower requires a rider aged 25 or older. Availability, final quote and delivery time are confirmed on WhatsApp."}</T></p><Link href="/fleet" className="text-link mt-6"><T>{"Compare all models"}</T>{" "}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div><MonthlyRates /></div></Section>
    <Section labelledBy="stay-title"><div className="monthly-feature"><AreaImage slug="canggu" className="h-[420px] rounded-[14px]" sizes="(max-width: 767px) 100vw, 45vw" /><div><h2 id="stay-title" className="marketing-heading"><T>{"From your front door"}</T><br /><T>{"to your next favourite."}</T></h2><p className="mt-5 leading-relaxed text-ink-soft"><T>{"Arrange delivery and collection at your Bali hotel, villa or guesthouse."}</T></p><p className="mt-4 text-sm leading-relaxed text-ink-soft"><T>{deliveryFeeWaiverNote}</T></p><div className="area-links">{serviceAreas.map(area=><Link key={area.slug} href={`/delivery-areas/${area.slug}`}><T>{area.name}</T></Link>)}</div><ButtonLink href="/book?duration=monthly" variant="accent" size="lg" className="mt-8"><T>{"Check availability"}</T></ButtonLink></div></div></Section>
    <Section tone="wash" labelledBy="monthly-faq"><div className="faq-layout"><h2 id="monthly-faq" className="marketing-heading"><T>{"Before you"}</T><br /><T>{"make it a month."}</T></h2><Accordion items={faqs}/></div></Section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(faqSchema(faqs))}} />
  </>;
}
