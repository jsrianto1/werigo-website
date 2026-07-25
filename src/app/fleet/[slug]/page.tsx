import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Battery,
  BatteryCharging,
  Check,
  ChevronRight,
  Gauge,
  MessageCircle,
  Route,
  Ruler,
  Weight,
  Zap,
} from "lucide-react";
import { Section } from "@/components/ui/Section";
import { MediaImage } from "@/components/media/MediaImage";
import { ButtonLink } from "@/components/ui/Button";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import {
  getModel,
  getVariants,
  getPrimaryCards,
  specDisclaimer,
  type WedisonEntry,
} from "@/data/vehicles";
import { vehicleSchema, jsonLd } from "@/lib/schema";
import { buildModelInquiryWhatsAppUrl } from "@/lib/whatsapp";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPrimaryCards().map((e) => ({ slug: e.modelSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getModel(slug);
  if (!entry) return {};
  return {
    title: `${entry.displayName} — Electric Motorcycle Rental in Bali`,
    description: `Rent the ${entry.displayName} in Bali through Werigo. Official Wedison specifications: up to ${entry.claimedRangeKm} km claimed range, up to ${entry.topSpeedKmh} km/h. Rates available upon request.`,
    alternates: { canonical: `/fleet/${slug}` },
  };
}

function specRows(entry: WedisonEntry) {
  return [
    { icon: Zap, label: "Motor", value: `${entry.motorW.toLocaleString("en-US")} W` },
    { icon: Gauge, label: "Top speed", value: `up to ${entry.topSpeedKmh} km/h` },
    {
      icon: Battery,
      label: "Battery",
      value: `LFP, ${entry.batteryWh.toLocaleString("en-US")} Wh`,
    },
    {
      icon: Route,
      label: "Claimed range",
      value: `up to ${entry.claimedRangeKm} km`,
    },
    ...(entry.homeCharging
      ? [{ icon: BatteryCharging, label: "Home charging", value: entry.homeCharging }]
      : [{ icon: BatteryCharging, label: "Home charging", value: "Supported" }]),
    ...(entry.supercharge
      ? [
          {
            icon: Zap,
            label: "Wedison Supercharge",
            value: "10–80% starting from 15 minutes",
          },
        ]
      : []),
    ...(entry.dimensionsMm
      ? [{ icon: Ruler, label: "Dimensions", value: entry.dimensionsMm }]
      : []),
    ...(entry.tiresFront
      ? [
          {
            icon: Route,
            label: "Tires",
            value:
              entry.tiresFront === entry.tiresRear
                ? entry.tiresFront
                : `Front ${entry.tiresFront} · Rear ${entry.tiresRear}`,
          },
        ]
      : []),
    ...(entry.seatHeightMm
      ? [{ icon: Ruler, label: "Seat height", value: `${entry.seatHeightMm} mm` }]
      : []),
    ...(entry.wheelbaseMm
      ? [{ icon: Ruler, label: "Wheelbase", value: `${entry.wheelbaseMm} mm` }]
      : []),
    ...(entry.weightKgApprox
      ? [
          {
            icon: Weight,
            label: "Weight",
            value: `approximately ${entry.weightKgApprox} kg`,
          },
        ]
      : []),
    ...(entry.brakes ? [{ icon: Check, label: "Braking", value: entry.brakes }] : []),
  ];
}

export default async function VehicleDetailPage({ params }: Props) {
  const { slug } = await params;
  const entry = getModel(slug);
  if (!entry) notFound();

  const variants = getVariants(slug);
  const hasVariants = variants.length > 1;
  const others = getPrimaryCards()
    .filter((e) => e.modelSlug !== slug)
    .slice(0, 3);

  return (
    <>
      <Section className="!pb-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link href="/fleet" className="transition-colors hover:text-primary">
                Our Fleet
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="font-medium text-ink">
              {entry.displayName}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Gallery — driven by src/data/media.ts */}
          <div className="space-y-4">
            <MediaImage
              id={`fleet-${slug}-main`}
              fallbackLabel={`${entry.displayName} — main product photo`}
              ratio="4/3"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
            <div className="grid grid-cols-2 gap-4">
              <MediaImage
                id={`fleet-${slug}-side`}
                fallbackLabel={`${entry.displayName} — side view`}
                ratio="4/3"
                sizes="(max-width: 1024px) 50vw, 27vw"
              />
              <MediaImage
                id={`fleet-${slug}-detail`}
                fallbackLabel={`${entry.displayName} — detail shot`}
                ratio="4/3"
                sizes="(max-width: 1024px) 50vw, 27vw"
              />
            </div>
          </div>

          {/* Summary + booking */}
          <div>
            <p className="eyebrow mb-3">Werigo fleet · Powered by Wedison</p>
            <h1 className="font-display text-4xl text-ink">{entry.displayName}</h1>
            <p className="mt-2 text-lg text-ink-soft">{entry.positioning}</p>

            <p className="mt-6 leading-relaxed text-ink-soft">{entry.description}</p>

            {entry.features?.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {entry.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Rate */}
            <div className="mt-8 rounded-[14px] border border-line bg-primary-faint p-5">
              <p className="font-semibold text-ink">
                Rental rate available upon request
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Tell us your dates and delivery area — we confirm your rate and
                availability on WhatsApp before you commit to anything.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href={`/book?vehicle=${entry.id}`}
                variant="accent"
                size="lg"
                className="flex-1 sm:flex-none"
              >
                Check availability and rates
              </ButtonLink>
              <a
                href={buildModelInquiryWhatsAppUrl(entry.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Specs per variant + equipment */}
      <Section tone="wash" labelledBy="specs-title" className="!pt-10">
        <h2 id="specs-title" className="mb-6 font-display text-2xl text-ink">
          {hasVariants ? "Choose your configuration" : "Specifications"}
        </h2>
        <div
          className={`grid gap-6 ${hasVariants ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}
        >
          {variants.map((variant) => (
            <div key={variant.id} className="rounded-[14px] border border-line bg-card p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl text-ink">
                  {hasVariants ? variant.displayName : "Official specifications"}
                </h3>
                {hasVariants ? (
                  <span className="rounded-full bg-primary-faint px-2.5 py-0.5 text-xs font-medium text-primary">
                    {variant.variant}
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 divide-y divide-line">
                {specRows(variant).map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <dt className="flex items-center gap-2.5 text-sm text-ink-soft">
                      <spec.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {spec.label}
                    </dt>
                    <dd className="tnum text-right text-sm font-semibold text-ink">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <ButtonLink
                href={`/book?vehicle=${variant.id}`}
                variant={variant.primaryCard ? "accent" : "primary"}
                className="mt-5 w-full"
              >
                Check availability and rates
                {hasVariants ? ` — ${variant.variant}` : ""}
              </ButtonLink>
            </div>
          ))}

          {!hasVariants ? (
            <div className="rounded-[14px] border border-line bg-card p-6">
              <h3 className="font-display text-xl text-ink">
                Included with every rental
              </h3>
              <ul className="mt-4 space-y-3">
                {entry.includedEquipment.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
                Delivery, a condition walk-around and a riding briefing are part
                of every handover. Extras like additional helmets can be added
                during booking.
              </p>
            </div>
          ) : null}
        </div>
        {hasVariants ? (
          <div className="mt-6 rounded-[14px] border border-line bg-card p-6">
            <h3 className="font-display text-xl text-ink">Included with every rental</h3>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              {entry.includedEquipment.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink-soft">
                  <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-6 text-xs leading-relaxed text-ink-faint">{specDisclaimer}</p>
      </Section>

      {/* Other models */}
      <Section labelledBy="others-title">
        <h2 id="others-title" className="mb-8 font-display text-2xl text-ink">
          Other Wedison rides in the fleet
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((e) => (
            <VehicleCard key={e.id} entry={e} />
          ))}
        </div>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(vehicleSchema(entry)) }}
      />
    </>
  );
}
