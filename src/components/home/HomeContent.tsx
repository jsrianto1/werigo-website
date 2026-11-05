import { CmsText, CmsFaqs } from "@/components/cms/CmsText";
import type { HomeContentData } from "@/lib/cmsRules";

import { T } from "@/components/i18n/LanguageProvider";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Check, HardHat, MessageCircle, Truck } from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { StickyBookCTA } from "@/components/booking/StickyBookCTA";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { MonthlyRates } from "@/components/home/MonthlyRates";
import { AreaImage } from "@/components/areas/AreaImage";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { getPrimaryCards } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";
import { confirmedBenefits } from "@/data/commercialTerms";
import { faqSchema, homePageSchema, jsonLd } from "@/lib/schema";
import { ratesIdrPerDay, formatIdr } from "@/lib/pricing";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { SagaTeaser } from "@/components/home/SagaTeaser";

const proof = [
  { icon: Truck, title: "Delivered to your stay", detail: "Hotel and villa handover" },
  { icon: HardHat, title: "Helmets on request", detail: "Choose 0 to 2 at checkout" },
  { icon: BatteryCharging, title: "Charge at your stay", detail: "Guidance at handover" },
  { icon: MessageCircle, title: "A local team", detail: "Daily, 08:00 to 20:00 WITA" },
];
export function HomeContent({ content }: { content: HomeContentData }) {
  const bikes = getPrimaryCards();
  return (
    <>
      <section className="home-video-hero" aria-labelledby="home-title">
        <HeroBackdrop />
        <div className="home-hero-inner"><div className="hero-copy">
          <p className="eyebrow"><CmsText value={content.copy.heroEyebrow}/></p>
          <h1 id="home-title"><CmsText value={content.copy.heroTitle1}/><br /><CmsText value={content.copy.heroTitle2}/></h1>
          <p className="hero-lede"><CmsText value={content.copy.heroIntro}/></p>
          <div className="hero-actions"><ButtonLink href="#hero-booking" variant="accent" size="lg"><CmsText value={content.copy.heroPrimary}/>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><Link href="/monthly-scooter-rental-bali" className="text-link"><CmsText value={content.copy.heroSecondary}/></Link></div>
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
        <div className="section-intro"><h2 id="fleet-heading"><CmsText value={content.copy.fleetTitle}/></h2><p><CmsText value={content.copy.fleetIntro}/></p></div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{bikes.map(entry => <VehicleCard key={entry.id} entry={entry} />)}</div>
        <p className="mt-5 text-sm text-ink-soft"><T>{"Rates are per motorcycle, per day. Daily tier: 2 to 6 days. Monthly tier: 1 month or longer. Availability and final quote confirmed on WhatsApp."}</T></p>
        <Link href="/fleet" className="text-link mt-6"><T>{"Compare all models"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Section>

      <Section tone="wash" labelledBy="monthly-heading">
        <div className="monthly-feature">
          <div className="monthly-story"><p className="eyebrow"><CmsText value={content.copy.monthlyEyebrow}/></p><h2 id="monthly-heading" className="marketing-heading"><CmsText value={content.copy.monthlyTitle1}/><br /><CmsText value={content.copy.monthlyTitle2}/></h2><p><CmsText value={content.copy.monthlyIntro}/></p><ButtonLink href="/monthly-scooter-rental-bali" variant="accent" size="lg"><CmsText value={content.copy.monthlyCta}/>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink><AreaImage slug="ubud" className="mt-8 h-56 rounded-[14px]" sizes="(max-width: 768px) 100vw, 45vw" /></div>
          <MonthlyRates />
        </div>
      </Section>

      <SagaTeaser />

      <Section labelledBy="includes-heading">
        <div className="essentials-layout">
          <div><h2 id="includes-heading" className="marketing-heading"><CmsText value={content.copy.essentialsTitle1}/><br /><CmsText value={content.copy.essentialsTitle2}/></h2><p className="mt-5 max-w-lg leading-relaxed text-ink-soft"><CmsText value={content.copy.essentialsIntro}/></p><ul className="essentials-list">{confirmedBenefits.map(b => <li key={b.id}><Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><span><strong><T>{b.label}</T></strong><span><T>{b.description}</T></span></span></li>)}</ul><p className="mt-6 text-sm leading-relaxed text-ink-soft"><T>{"Need helmets? Choose 0 to 2 during booking. No helmets are added automatically."}</T></p></div>
          <div className="charging-panel"><Image src="/media/supercharge/supercharge-unit.png" alt="Official Wedison SuperCharge charging unit" width={1200} height={1600} sizes="(max-width: 768px) 80vw, 360px" className="charging-photo" /><h3 className="font-display text-2xl"><T>{"A charging plan that fits your day."}</T></h3><p className="mt-3 leading-relaxed text-ink-soft"><T>{"Charge at your accommodation with a suitable outlet and the official charger. For compatible models, ask us about Wedison SuperCharge locations."}</T></p><Link href="/supercharge" className="text-link mt-5"><T>{"Explore SuperCharge"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        </div>
      </Section>

      <Section id="how-to-rent" labelledBy="how-heading" tone="wash">
        <div className="rental-guide">
          <div className="rental-guide-heading">
            <p className="eyebrow"><T>{"How it works"}</T></p>
            <h2 id="how-heading" className="marketing-heading"><CmsText value={content.copy.howTitle}/></h2>
            <p className="rental-guide-intro"><CmsText value={content.copy.howIntro}/></p>
          </div>
          <ol className="rental-steps">
            {content.steps.map(({ title, detail }, i) => (
              <li key={title.en}>
                <span className="step-number" aria-hidden="true">0{i + 1}</span>
                <div><h3><CmsText value={title}/></h3><p><CmsText value={detail}/></p></div>
              </li>
            ))}
          </ol>
          <ButtonLink href="/book" className="rental-guide-action"><CmsText value={content.copy.howCta}/><ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink>
        </div>
      </Section>

      <Section labelledBy="areas-heading"><div className="section-intro"><h2 id="areas-heading"><CmsText value={content.copy.areasTitle}/></h2><p><CmsText value={content.copy.areasIntro}/></p></div><div className="destination-grid">{["canggu", "ubud", "uluwatu"].map(slug => <Link key={slug} href={`/delivery-areas/${slug}`} className="destination-tile"><AreaImage slug={slug} className="h-full" sizes="(max-width: 640px) 100vw, 33vw" /><span><T>{serviceAreas.find(a => a.slug === slug)?.name}</T> <ArrowRight aria-hidden="true" className="h-5 w-5" /></span></Link>)}</div><div className="area-links">{serviceAreas.map(area => <Link href={`/delivery-areas/${area.slug}`} key={area.slug}><T>{area.name}</T></Link>)}</div><p className="mt-4 text-sm text-ink-soft"><T>{"Delivery timing and fees are confirmed for your booking."}</T></p></Section>

      <Section tone="wash" labelledBy="faq-heading"><div className="faq-layout"><div><h2 id="faq-heading" className="marketing-heading"><CmsText value={content.copy.faqTitle1}/><br /><CmsText value={content.copy.faqTitle2}/></h2><p className="mt-5 text-ink-soft"><CmsText value={content.copy.faqIntro}/></p><Link href="/help-center" className="text-link mt-6"><T>{"Visit the Help Center"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div><CmsFaqs items={content.faqs} /></div></Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd({ "@context": "https://schema.org", "@graph": [{ ...homePageSchema(), name: content.copy.seoTitle.en, description: content.copy.seoDescription.en }, faqSchema(content.faqs.map(item => ({ question: item.question.en, answer: item.answer.en })))] })}} />

      <Section labelledBy="cta-heading"><div className="closing-cta"><h2 id="cta-heading"><CmsText value={content.copy.closingTitle1}/><br /><CmsText value={content.copy.closingTitle2}/></h2><p><CmsText value={content.copy.closingIntro}/></p><ButtonLink href="/book" variant="accent" size="lg"><CmsText value={content.copy.closingCta}/>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" /></ButtonLink></div></Section>
    </>
  );
}
