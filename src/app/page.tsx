import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryCharging,
  CalendarCheck,
  Leaf,
  MapPin,
  MessageCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Truck,
  Volume2,
  Wallet,
  ArrowRight,
  Star,
  Zap,
  Send,
  Package,
} from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { StickyBookCTA } from "@/components/booking/StickyBookCTA";
import { MediaImage } from "@/components/media/MediaImage";
import { MediaVideo } from "@/components/media/MediaVideo";
import { findMedia } from "@/data/media";
import { AreaImage } from "@/components/areas/AreaImage";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { getPrimaryCards } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";
import { faqCategories } from "@/data/faqs";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { faqSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Electric Scooter and Motorcycle Rental in Bali, Delivered to You",
  description:
    "Rent a premium electric motorcycle in Bali with Werigo. Hotel and villa delivery in Canggu, Seminyak, Ubud, Uluwatu and beyond. Charged, helmeted and booked online in minutes.",
  alternates: { canonical: "/" },
};

const trustPoints = [
  {
    icon: Truck,
    title: "Delivered to your door",
    text: "We deliver to your hotel, villa or guesthouse. Your ride arrives fully charged.",
  },
  {
    icon: BatteryCharging,
    title: "Charges from any outlet",
    text: "Plug in overnight like a phone. No fuel stations, ever.",
  },
  {
    icon: ShieldCheck,
    title: "Helmets & briefing included",
    text: "Two helmets, a phone holder and a proper handover on every rental.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp support",
    text: "A real local team on the number you already use.",
  },
];

const electricBenefits = [
  {
    icon: Volume2,
    title: "Silence is the luxury",
    text: "Hear the rice fields, the waves and the gamelan instead of an engine. Electric riding keeps Bali's soundtrack intact.",
  },
  {
    icon: Leaf,
    title: "Zero exhaust in paradise",
    text: "No fumes at traffic lights, no oil drips at your villa. The island stays as clean as you found it.",
  },
  {
    icon: Wallet,
    title: "No fuel stops, no fuel costs",
    text: "Skip the roadside petrol bottles. A full overnight charge costs a fraction of a tank and starts every day at 100%.",
  },
  {
    icon: Sparkles,
    title: "Torque that tames traffic",
    text: "Instant, smooth acceleration makes filtering through Bali traffic calmer and safer than any petrol scooter.",
  },
];

const steps = [
  {
    icon: CalendarCheck,
    title: "Choose your ride",
    text: "Choose your area, rental dates and preferred Wedison model. We confirm the rate with your quote.",
  },
  {
    icon: Send,
    title: "Send your request",
    text: "Review your details and send your booking request to our team on WhatsApp.",
  },
  {
    icon: MessageCircle,
    title: "We confirm on WhatsApp",
    text: "Our local team confirms availability, your rate and the delivery window with you.",
  },
  {
    icon: Truck,
    title: "Ride charged and ready",
    text: "Your motorcycle arrives fully charged, with helmets fitted and a riding briefing.",
  },
];

// FAQ preview: a hand-picked question from the most useful categories
const faqPreview = [
  faqCategories.find((c) => c.id === "general")!.items[1],
  faqCategories.find((c) => c.id === "battery")!.items[0],
  faqCategories.find((c) => c.id === "license")!.items[0],
  faqCategories.find((c) => c.id === "delivery")!.items[0],
  faqCategories.find((c) => c.id === "reservations")!.items[0],
];

export default function HomePage() {
  const featured = getPrimaryCards();

  return (
    <>
      {/* ================= HERO + SEARCH ================= */}
      <div className="relative overflow-hidden">
        {/* soft laguna wash paints before the poster loads */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary-soft/80 via-primary-faint to-page"
        />
        <HeroBackdrop />
        <Section className="!py-0">
          <div className="grid items-center gap-10 pb-14 pt-12 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-20">
            <div className="rise-in">
              <p className="eyebrow mb-4">
                Electric motorcycle rental · Bali · Powered by Wedison
              </p>
              <h1 className="font-display text-4xl leading-[1.08] text-ink sm:text-5xl lg:text-[3.4rem]">
                Ride Bali the quiet&nbsp;way.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Ride Bali on a fully electric Wedison motorcycle. We deliver
                it to your hotel or villa, fully charged and ready to go, with
                helmets included.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  8 delivery areas
                </li>
                <li className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-primary" aria-hidden="true" />
                  Charges from any outlet
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  Helmets included
                </li>
              </ul>
            </div>

            <div id="hero-booking" className="rise-in rise-in-delay-2">
              <h2 className="sr-only">Search rental availability</h2>
              <SearchWidget />
            </div>
          </div>
        </Section>
        <RouteLine className="-mt-4" />
      </div>

      {/* ================= HERO MEDIA BAND =================
          Renders only once real hero photography/video is published
          in src/data/media.ts — layout is unchanged until then. */}
      {findMedia("hero-video")?.available || findMedia("hero-photo")?.available ? (
        <Section className="!pb-0 !pt-10">
          {findMedia("hero-video")?.available ? (
            <MediaVideo id="hero-video" autoPlay />
          ) : (
            <MediaImage id="hero-photo" ratio="16/9" sizes="100vw" priority />
          )}
        </Section>
      ) : null}

      {/* ================= TRUST STRIP ================= */}
      <Section labelledBy="trust-heading" className="!py-0">
        <h2 id="trust-heading" className="sr-only">
          Why rent with Werigo
        </h2>
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <li key={point.title} className="bg-card p-5 xl:p-6">
              <point.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ink">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{point.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ================= EVERY RENTAL INCLUDES ================= */}
      <Section labelledBy="includes-heading" className="!pb-0 !pt-8 md:!pt-10">
        <div className="rounded-[14px] border border-line bg-primary-faint p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="includes-heading" className="font-display text-2xl text-ink">
              Every rental includes
            </h2>
            <p className="text-xs text-ink-faint">
              Included in every approved quote, with no add-on surprises.
            </p>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-ink-soft sm:grid-cols-3 lg:grid-cols-6">
            {[
              "Two helmets",
              "Phone holder",
              "Fully charged handover",
              "Delivery to hotel or villa",
              "Riding & charging briefing",
              "Local WhatsApp support",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ================= FEATURED FLEET ================= */}
      <Section labelledBy="fleet-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="The fleet · Powered by Wedison"
            title="Official Wedison electric motorcycles, one for every kind of day"
            lede="Choose from four official Wedison electric motorcycles. Every bike is maintained by our team and delivered fully charged."
            id="fleet-heading"
          />
          <Link
            href="/fleet"
            className="mb-10 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-strong md:mb-12"
          >
            Compare all models
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-7">
          {featured.map((entry) => (
            <VehicleCard key={entry.id} entry={entry} />
          ))}
        </div>
      </Section>

      {/* ================= HOW IT WORKS ================= */}
      <Section tone="wash" labelledBy="how-heading" className="md:!pb-12 lg:!pb-14">
        <SectionHeading
          eyebrow="How Werigo works"
          title="Four steps between you and the open road"
          id="how-heading"
        />
        <ol className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-7">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-[14px] border border-line bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="tnum text-sm font-semibold text-ink-faint">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <ButtonLink href="/how-it-works" variant="ghost">
            See the full journey
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </Section>

      <RidingMotorcycle />

      {/* ================= ELECTRIC BENEFITS ================= */}
      <Section labelledBy="benefits-heading" className="md:!pt-6 lg:!pt-8">
        <SectionHeading
          eyebrow="Why electric"
          title="The island sounds better without an engine"
          lede="Electric riding isn't a compromise in Bali. It's the upgrade."
          id="benefits-heading"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {electricBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 rounded-[14px] border border-line bg-card p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <benefit.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {benefit.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ================= DELIVERY AREAS ================= */}
      <Section tone="wash" labelledBy="areas-heading">
        <SectionHeading
          eyebrow="Delivery areas"
          title="We come to you, across the south and centre"
          lede="Delivery is free in our home zones, with small fees elsewhere. Your quote always shows this before you book."
          id="areas-heading"
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {serviceAreas.map((area) => (
            <li key={area.slug}>
              <div className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-card transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]">
                <Link
                  href={`/delivery-areas/${area.slug}`}
                  aria-label={`Explore ${area.name}`}
                  className="block"
                >
                  <AreaImage
                    slug={area.slug}
                    variant="card"
                    className="h-24 w-full sm:h-28 lg:h-32 xl:h-36"
                    sizes="(max-width: 640px) 50vw, 300px"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-4 xl:p-5">
                  <span className="font-display text-lg text-ink">{area.name}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                    {area.vibe}
                  </span>
                  <span className="mt-1 text-xs font-medium text-ok">
                    {area.deliveryFee === 0 ? "Free delivery" : "Delivery available"}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs font-semibold">
                    <Link
                      href={`/delivery-areas/${area.slug}`}
                      className="text-primary hover:text-primary-strong"
                    >
                      Explore area
                    </Link>
                    <Link
                      href="/book"
                      className="text-accent hover:text-accent-strong"
                    >
                      Check availability
                    </Link>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* ================= CHARGING & RANGE ================= */}
      <Section labelledBy="charging-heading" className="lg:!py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading
              eyebrow="Charging & range"
              title="If you can charge a phone, you can charge a Werigo"
              id="charging-heading"
            />
            <ul className="space-y-5">
              <li className="flex gap-4">
                <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">Any standard outlet works</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    Every model charges from the normal wall sockets in your
                    hotel or villa. Plug in when you get home, wake up full.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <BatteryCharging className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">
                    Official Wedison specifications
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    Specifications are based on official Wedison product
                    information. Actual riding range varies depending on riding
                    style, passenger load, terrain, traffic, and weather.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">Never stranded</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    Generous low-battery warnings, and our support team one
                    message away if you misjudge a mountain road.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div aria-hidden="true" className="rounded-[14px] border border-line bg-sunken p-8">
            {/* Simple charge-day illustration */}
            <div className="space-y-4">
              {[
                { label: "22:30, plugged in at the villa", pct: 35 },
                { label: "07:00, full charge, coffee first", pct: 100 },
                { label: "17:45, back from the Uluwatu loop", pct: 52 },
              ].map((row) => (
                <div key={row.label}>
                  <p className="mb-1.5 text-xs font-medium text-ink-soft">{row.label}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-card">
                    <div
                      className={`h-full rounded-full ${
                        row.pct === 100 ? "bg-ok" : "bg-primary"
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-2 text-xs text-ink-faint">
                This is a typical Werigo day. Overnight charging covers everything.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ================= SUPERCHARGE ================= */}
      <Section labelledBy="supercharge-heading">
        <div className="relative overflow-hidden rounded-[14px] bg-deep px-6 py-12 sm:px-10 md:py-16">
          <RouteLine className="absolute inset-x-0 bottom-4 opacity-30" />
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_auto]">
            <div>
              <p className="eyebrow mb-3 !text-accent">
                <Zap className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Wedison SuperCharge
              </p>
              <h2
                id="supercharge-heading"
                className="font-display text-3xl leading-tight text-ink-inverse md:text-4xl"
              >
                Charge Fast. Ride Farther.
              </h2>
              <p className="mt-3 font-display text-xl text-accent-soft">
                30% to 90% in approx. 10 min*
              </p>
              <p className="mt-1 font-display text-lg text-ink-inverse/90">
                100+ km total range on selected models*
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-inverse/80">
                Compatible Wedison models have been tested to charge from 30%
                to 90% in approximately 10 minutes at supported Wedison
                SuperCharge locations, handled by our team while you take a
                break. Selected Wedison models offer more than 100 km of total
                claimed riding range.
              </p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-inverse/50">
                *Based on internal Wedison testing under specific conditions.
                Actual charging time and riding range may vary depending on
                model, battery condition, battery temperature, starting charge
                level, load, riding style, charger availability, and operating
                conditions. SuperCharge is available only for compatible
                Wedison models at supported locations.
              </p>
              <div className="mt-7">
                <ButtonLink href="/supercharge" variant="accent" size="lg">
                  Explore SuperCharge
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              </div>
            </div>
            <div className="mx-auto w-56 sm:w-64 lg:mx-0">
              <MediaImage
                id="supercharge-unit"
                ratio="3/4"
                fit="contain-bare"
                sizes="256px"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ================= SUPPORT ================= */}
      <Section tone="deep" labelledBy="support-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading
              eyebrow="Local support"
              title="A Bali team, one WhatsApp message away"
              lede="Flat tyre in Pererenan? Battery question at midnight in Ubud? Our operations team lives here, rides here, and answers on the app you already use."
              id="support-heading"
              inverse
            />
            <ul className="grid gap-4 text-sm sm:grid-cols-2">
              <li className="rounded-[14px] border border-ink-inverse/15 p-4">
                <h3 className="font-semibold text-ink-inverse">During riding hours</h3>
                <p className="mt-1 leading-relaxed text-ink-inverse/70">
                  Need help during your rental? Message our local team on
                  WhatsApp for charging questions, directions, extensions or
                  motorcycle support.
                </p>
              </li>
              <li className="rounded-[14px] border border-ink-inverse/15 p-4">
                <h3 className="font-semibold text-ink-inverse">Emergencies</h3>
                <p className="mt-1 leading-relaxed text-ink-inverse/70">
                  A dedicated emergency line comes with every booking
                  confirmation, and it is printed on the key tag too.
                </p>
              </li>
            </ul>
          </div>
          <div className="lg:justify-self-end">
            <a
              href={buildSupportWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Chat with the team
            </a>
          </div>
        </div>
      </Section>

      {/* ================= THE WERIGO STANDARD (service assurance) =================
          Replace or extend with verified rider reviews once collected —
          never invented or borrowed testimonials. */}
      <Section labelledBy="standard-heading">
        <SectionHeading
          eyebrow="The Werigo standard"
          title="What every rider can hold us to"
          lede="We'd rather make promises we control than borrow praise we haven't earned. These four are checked on every single rental."
          id="standard-heading"
        />
        <ul className="grid gap-6 sm:grid-cols-2">
          {[
            {
              title: "Full charge at handover",
              text: "Your motorcycle is delivered with a full battery, and we complete a condition walk-around together at handover. There are no surprises during the ride or at return.",
            },
            {
              title: "The price you saw is the price",
              text: "Rental, extras and delivery are itemised before you confirm. Nothing is added after checkout, and nothing is charged before you approve the quote.",
            },
            {
              title: "Honest numbers",
              text: "Specifications come straight from official Wedison product information, always stated as 'up to'. Actual range varies with riding style, load, terrain, traffic and weather, so we never guarantee it.",
            },
            {
              title: "A person answers",
              text: "Your booking thread on WhatsApp is staffed by the same local team that delivers your ride. During riding hours, real people answer your questions.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-[14px] border border-line bg-card p-6"
            >
              <Star className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-faint">
          Verified rider reviews will be published here as they come in. We
          never invent or borrow reviews.
        </p>
      </Section>

      {/* ================= FAQ ================= */}
      <Section tone="wash" labelledBy="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionHeading
              eyebrow="Questions"
              title="Good to know before you ride"
              id="faq-heading"
            />
            <ButtonLink href="/help-center" variant="outline">
              Visit the Help Center
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <Accordion items={faqPreview} />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(faqPreview)) }}
        />
      </Section>

      <StickyBookCTA targetId="hero-booking" />

      {/* ================= FINAL CTA ================= */}
      <Section labelledBy="cta-heading">
        <div className="relative overflow-hidden rounded-[14px] bg-primary px-6 py-14 text-center sm:px-12">
          <RouteLine className="absolute inset-x-0 top-4 opacity-40" />
          <h2
            id="cta-heading"
            className="font-display text-3xl leading-tight text-white md:text-4xl"
          >
            Your ride can be at the door tomorrow morning
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
            Check availability for your dates. Booking takes a few minutes,
            and delivery is free in Canggu and Seminyak.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/book" variant="accent" size="lg">
              Rent a Bike
            </ButtonLink>
            <ButtonLink
              href="/fleet"
              size="lg"
              className="!bg-white/10 !text-white hover:!bg-white/20"
            >
              Browse the fleet
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
