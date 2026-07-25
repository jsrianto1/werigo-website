import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryCharging,
  CalendarCheck,
  KeyRound,
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
} from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { getFeaturedVehicles } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";
import { faqCategories } from "@/data/faqs";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { faqSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Electric Scooter & Motorcycle Rental in Bali — Delivered to You",
  description:
    "Rent a premium electric motorcycle in Bali with Werigo. Hotel and villa delivery in Canggu, Seminyak, Ubud, Uluwatu and beyond. Charged, helmeted and booked online in minutes.",
  alternates: { canonical: "/" },
};

const trustPoints = [
  {
    icon: Truck,
    title: "Delivered to your door",
    text: "Hotel, villa or guesthouse — your ride arrives charged and ready.",
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
    text: "Hear the rice fields, the waves, the gamelan — not an engine. Electric riding keeps Bali's soundtrack intact.",
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
    title: "Book online",
    text: "Pick your area, dates and model. Confirm your details and get your booking reference in minutes.",
  },
  {
    icon: Truck,
    title: "We deliver",
    text: "Your motorcycle arrives at your accommodation fully charged, with helmets fitted and a quick riding briefing.",
  },
  {
    icon: KeyRound,
    title: "You ride",
    text: "Explore the island on your schedule. Charge overnight, message us anytime, and we collect it when you're done.",
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
  const featured = getFeaturedVehicles();

  return (
    <>
      {/* ================= HERO + SEARCH ================= */}
      <div className="relative overflow-hidden">
        {/* soft laguna wash behind hero */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary-soft/80 via-primary-faint to-page"
        />
        <Section className="!py-0">
          <div className="grid items-center gap-10 pb-14 pt-12 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-20">
            <div className="rise-in">
              <p className="eyebrow mb-4">Electric motorcycle rental · Bali</p>
              <h1 className="font-display text-4xl leading-[1.08] text-ink sm:text-5xl lg:text-[3.4rem]">
                Ride Bali the quiet&nbsp;way.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Premium electric motorcycles delivered to your hotel or villa —
                charged, helmeted and ready. No fuel stops, no engine noise, no
                hassle. Just the island.
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

            <div className="rise-in rise-in-delay-2">
              <h2 className="sr-only">Search rental availability</h2>
              <SearchWidget />
            </div>
          </div>
        </Section>
        <RouteLine className="-mt-4" />
      </div>

      {/* ================= TRUST STRIP ================= */}
      <Section labelledBy="trust-heading" className="!py-0">
        <h2 id="trust-heading" className="sr-only">
          Why rent with Werigo
        </h2>
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <li key={point.title} className="bg-card p-5">
              <point.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-ink">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{point.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ================= FEATURED FLEET ================= */}
      <Section labelledBy="fleet-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="The fleet"
            title="Four electric rides, one for every kind of day"
            lede="From nimble café hoppers to full-day cruisers — every Werigo model is maintained in-house and delivered fully charged."
            id="fleet-heading"
          />
          <Link
            href="/fleet"
            className="mb-10 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-strong md:mb-14"
          >
            Compare all models
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((vehicle) => (
            <VehicleCard key={vehicle.slug} vehicle={vehicle} />
          ))}
        </div>
      </Section>

      {/* ================= HOW IT WORKS ================= */}
      <Section tone="wash" labelledBy="how-heading">
        <SectionHeading
          eyebrow="How Werigo works"
          title="Three steps between you and the open road"
          id="how-heading"
        />
        <ol className="grid gap-6 md:grid-cols-3">
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

      {/* ================= ELECTRIC BENEFITS ================= */}
      <Section labelledBy="benefits-heading">
        <SectionHeading
          eyebrow="Why electric"
          title="The island sounds better without an engine"
          lede="Electric riding isn't a compromise in Bali — it's the upgrade."
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
          lede="Free delivery in our home zones, small fees elsewhere — always shown before you book."
          id="areas-heading"
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {serviceAreas.map((area) => (
            <li key={area.slug}>
              <Link
                href={`/delivery-areas/${area.slug}`}
                className="group flex h-full flex-col rounded-[14px] border border-line bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]"
              >
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="mt-2.5 font-display text-lg text-ink transition-colors group-hover:text-primary">
                  {area.name}
                </span>
                <span className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {area.deliveryFee === 0 ? "Free delivery" : "Delivery available"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* ================= CHARGING & RANGE ================= */}
      <Section labelledBy="charging-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
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
                    Real-world range, honestly stated
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    Our 65–120 km range figures are estimated for two riders in
                    Bali traffic — not laboratory numbers. A typical exploring
                    day uses half a charge.
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
                { label: "22:30 — plugged in at the villa", pct: 35 },
                { label: "07:00 — full charge, coffee first", pct: 100 },
                { label: "17:45 — back from Uluwatu loop", pct: 52 },
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
                A typical Werigo day — overnight charging covers everything.
              </p>
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
                  Live WhatsApp support for anything — directions, charging,
                  extensions, swaps.
                </p>
              </li>
              <li className="rounded-[14px] border border-ink-inverse/15 p-4">
                <h3 className="font-semibold text-ink-inverse">Emergencies</h3>
                <p className="mt-1 leading-relaxed text-ink-inverse/70">
                  A dedicated emergency line comes with every booking
                  confirmation — printed on the key tag too.
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

      {/* ================= REVIEWS (prepared for genuine data) ================= */}
      <Section labelledBy="reviews-heading">
        <SectionHeading
          eyebrow="Rider reviews"
          title="What riders say"
          id="reviews-heading"
        />
        {/* Reviews intentionally empty until genuine reviews exist.
            Wire this block to a verified review source before launch. */}
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
          <Star className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h3 className="mt-3 font-display text-xl text-ink">
            Reviews arrive with our first riders
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Werigo is launching soon in Bali. Genuine, verified rider reviews
            will appear here — we don&apos;t publish placeholders or borrowed
            testimonials.
          </p>
        </div>
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
            Check availability for your dates — booking takes a few minutes,
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
