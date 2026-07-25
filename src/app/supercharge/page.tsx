import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryCharging,
  Bike,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  Zap,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RouteLine } from "@/components/ui/RouteLine";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { MediaImage } from "@/components/media/MediaImage";
import { MediaVideo } from "@/components/media/MediaVideo";
import {
  superchargeStations,
  compatibleModelSlugs,
  superchargePerformance,
  superchargeSteps,
  superchargeFaq,
} from "@/data/supercharge";
import { getEntry, specDisclaimer } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { findMedia } from "@/data/media";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { faqSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Supercharge — Fast Charging for Electric Motorcycles in Bali",
  description:
    "Wedison Supercharge through Werigo: compatible Wedison electric motorcycles recharge from approximately 10% to 80% starting from 15 minutes at supported locations in Bali.",
  alternates: { canonical: "/supercharge" },
};

export default function SuperchargePage() {
  const compatibleModels = compatibleModelSlugs
    .map((id) => getEntry(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <>
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent-soft/70 via-primary-faint to-page"
        />
        <Section className="!pb-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="rise-in">
              <p className="eyebrow mb-4">
                <Zap className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Wedison Supercharge
              </p>
              <h1 className="font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
                {superchargePerformance.headline}
              </h1>
              <p className="mt-4 font-display text-2xl text-accent">
                {superchargePerformance.message}
              </p>
              <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
                Overnight charging at your villa covers most Bali days. For the
                big ones — Uluwatu to Ubud and back, a full-island loop —
                there&apos;s Wedison Supercharge.{" "}
                {superchargePerformance.statement}
              </p>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-faint">
                {superchargePerformance.caveat}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/book" variant="accent" size="lg">
                  Book a compatible ride
                </ButtonLink>
                <a
                  href={buildSupportWhatsAppUrl(
                    "Hi Werigo! Which models support Supercharge for my dates?"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Ask about compatibility
                </a>
              </div>
            </div>
            <div className="rise-in rise-in-delay-2 mx-auto w-full max-w-sm lg:max-w-md">
              {findMedia("supercharge-video")?.available ? (
                <MediaVideo id="supercharge-video" autoPlay />
              ) : (
                <MediaImage
                  id="supercharge-unit"
                  ratio="3/4"
                  fit="contain-bare"
                  sizes="(max-width: 1024px) 384px, 448px"
                  priority
                />
              )}
            </div>
          </div>
        </Section>
        <RouteLine className="-mt-2" />
      </div>

      {/* ===== What it is / key numbers ===== */}
      <Section labelledBy="what-heading" className="!pt-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[14px] border border-line bg-card p-6">
            <Clock className="h-6 w-6 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">
              From 15 minutes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A Supercharge session starts from approximately 15 minutes on
              compatible Wedison models — plan it around a coffee, not around
              your day.
            </p>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-6">
            <Route className="h-6 w-6 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">10% → 80%</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Compatible Wedison models recharge from approximately 10% to 80%
              at supported Supercharge locations — from the Bukit cliffs to the
              Ubud ridges without watching the gauge.
            </p>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-6">
            <BatteryCharging className="h-6 w-6 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">We handle it</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              On-site staff connect your motorcycle to the Wedison Supercharge
              system. Sessions are logged to your rental — no payment at the
              point.
            </p>
          </div>
        </div>
        <h2 id="what-heading" className="sr-only">
          What Wedison Supercharge is
        </h2>
      </Section>

      {/* ===== Three-step process ===== */}
      <Section tone="wash" labelledBy="steps-heading">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, one coffee"
          id="steps-heading"
        />
        <ol className="grid gap-6 md:grid-cols-3">
          {superchargeSteps.map((step, i) => (
            <li key={step.title} className="rounded-[14px] border border-line bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
                  <Zap className="h-5 w-5" aria-hidden="true" />
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <MediaImage id="supercharge-process-01" ratio="4/3" />
          <MediaImage id="supercharge-process-02" ratio="4/3" />
          <MediaImage id="supercharge-process-03" ratio="4/3" />
        </div>
      </Section>

      {/* ===== Compatible motorcycles ===== */}
      <Section labelledBy="compatible-heading">
        <SectionHeading
          eyebrow="Compatibility"
          title="Which rides can Supercharge?"
          lede="Confirmed compatible Wedison models are listed below. Every model still charges from a standard outlet at your accommodation — Supercharge is the express lane. The Wedison Bees uses home charging."
          id="compatible-heading"
        />
        {compatibleModels.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {compatibleModels.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/fleet/${v.modelSlug}`}
                  className="group flex h-full flex-col rounded-[14px] border border-line bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]"
                >
                  <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="mt-2.5 font-display text-lg text-ink group-hover:text-primary">
                    {v.displayName}
                  </span>
                  <span className="tnum mt-1 text-xs text-ink-soft">
                    LFP {v.batteryWh.toLocaleString("en-US")} Wh · 10–80% from
                    15 min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8">
            <Bike className="h-6 w-6 text-ink-faint" aria-hidden="true" />{/* fallback if list is ever emptied */}
            <h3 className="mt-3 font-display text-xl text-ink">
              Confirmed per model, honestly
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              We publish per-model Supercharge badges only after each
              configuration is verified by our operations team. Until your
              model appears here, ask us on WhatsApp — we&apos;ll confirm
              exactly what your motorcycle supports for your dates before you
              book.
            </p>
            <a
              href={buildSupportWhatsAppUrl(
                "Hi Werigo! Which models support Supercharge for my dates?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Check my model on WhatsApp
            </a>
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {specDisclaimer}
        </p>
      </Section>

      {/* ===== Locations ===== */}
      <Section tone="wash" labelledBy="locations-heading">
        <SectionHeading
          eyebrow="Charging points"
          title="Where to Supercharge"
          lede="Only verified, operating locations are published here — never planned ones."
          id="locations-heading"
        />
        {superchargeStations.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {superchargeStations.map((station) => {
              const area = getArea(station.areaSlug);
              return (
                <li
                  key={station.slug}
                  className="flex flex-col rounded-[14px] border border-line bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
                    <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-medium text-ok">
                      Live
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl text-ink">
                    {station.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {area?.name} · {station.address}
                  </p>
                  <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-faint">Hours</dt>
                      <dd className="tnum text-ink-soft">{station.hours}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-faint">Bays</dt>
                      <dd className="tnum text-ink-soft">{station.bays}</dd>
                    </div>
                  </dl>
                  <a
                    href={station.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong"
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    Open in Maps
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8">
            <Navigation className="h-6 w-6 text-ink-faint" aria-hidden="true" />
            <h3 className="mt-3 font-display text-xl text-ink">
              Location cards appear here as points are verified
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              We list charging points only once they&apos;re operating — with
              address, hours, bays and a maps link on each card. For
              today&apos;s nearest charging option, message the team mid-ride
              and we&apos;ll route you live.
            </p>
            <a
              href={buildSupportWhatsAppUrl(
                "Hi Werigo! Where's my nearest charging point right now?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Find my nearest point
            </a>
          </div>
        )}
      </Section>

      {/* ===== Support during charging ===== */}
      <Section tone="deep" labelledBy="support-charging-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <SectionHeading
            eyebrow="While you charge"
            title="Supported from plug-in to ride-out"
            lede="Every Supercharge session is backed by the same WhatsApp thread as your rental. Busy point, battery question, anything unexpected — a local rider answers during all riding hours."
            id="support-charging-heading"
            inverse
          />
          <div className="lg:justify-self-end">
            <a
              href={buildSupportWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Message the team
            </a>
          </div>
        </div>
      </Section>

      {/* ===== FAQ ===== */}
      <Section labelledBy="sc-faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading
            eyebrow="Charging questions"
            title="Supercharge, explained"
            id="sc-faq-heading"
          />
          <Accordion items={superchargeFaq} />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(superchargeFaq)) }}
        />
      </Section>

      {/* ===== Booking CTA ===== */}
      <Section labelledBy="sc-cta-heading">
        <div className="relative overflow-hidden rounded-[14px] bg-primary px-6 py-14 text-center sm:px-12">
          <RouteLine className="absolute inset-x-0 top-4 opacity-40" />
          <h2
            id="sc-cta-heading"
            className="font-display text-3xl leading-tight text-white md:text-4xl"
          >
            Big riding days deserve a fast top-up
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
            Book your electric ride, tell us your route, and we&apos;ll make
            sure charging never shortens your day.
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
