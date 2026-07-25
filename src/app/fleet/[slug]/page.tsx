import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Battery,
  BatteryCharging,
  Check,
  ChevronRight,
  Gauge,
  Route,
  Users,
} from "lucide-react";
import { Section } from "@/components/ui/Section";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { ButtonLink } from "@/components/ui/Button";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { vehicles, getVehicle } from "@/data/vehicles";
import { formatIDR } from "@/lib/config";
import { vehicleSchema, jsonLd } from "@/lib/schema";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return vehicles.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = getVehicle(slug);
  if (!vehicle) return {};
  return {
    title: `${vehicle.name} — Electric Motorcycle Rental in Bali`,
    description: `Rent the ${vehicle.name} in Bali from ${formatIDR(
      vehicle.pricePerDay
    )}/day. ${vehicle.rangeKm} km real-world range, ${vehicle.chargingTime} charging. Delivered to your hotel or villa.`,
    alternates: { canonical: `/fleet/${slug}` },
  };
}

export default async function VehicleDetailPage({ params }: Props) {
  const { slug } = await params;
  const vehicle = getVehicle(slug);
  if (!vehicle) notFound();

  const others = vehicles.filter((v) => v.slug !== slug).slice(0, 3);

  const specs = [
    { icon: Route, label: "Real-world range", value: `${vehicle.rangeKm} km` },
    { icon: Gauge, label: "Top speed", value: `${vehicle.topSpeedKmh} km/h` },
    { icon: Battery, label: "Battery", value: vehicle.battery },
    { icon: BatteryCharging, label: "Charging time", value: vehicle.chargingTime },
    { icon: Users, label: "Seats", value: `${vehicle.seatCapacity} riders` },
  ];

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
              {vehicle.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Gallery */}
          <div className="space-y-4">
            <PlaceholderImage
              label={`${vehicle.name} — main product photo`}
              ratio="4/3"
            />
            <div className="grid grid-cols-2 gap-4">
              <PlaceholderImage label={`${vehicle.name} — side view`} ratio="4/3" />
              <PlaceholderImage label={`${vehicle.name} — detail shot`} ratio="4/3" />
            </div>
          </div>

          {/* Summary + booking */}
          <div>
            <p className="eyebrow mb-3">Werigo fleet</p>
            <h1 className="font-display text-4xl text-ink">{vehicle.name}</h1>
            <p className="mt-2 text-lg text-ink-soft">{vehicle.positioning}</p>

            <p className="mt-6 leading-relaxed text-ink-soft">{vehicle.description}</p>

            {/* Pricing */}
            <div className="mt-8 overflow-hidden rounded-[14px] border border-line">
              <div className="grid grid-cols-3 divide-x divide-line">
                {[
                  { label: "Daily", value: vehicle.pricePerDay, unit: "/day" },
                  { label: "Weekly", value: vehicle.pricePerWeek, unit: "/week" },
                  { label: "Monthly", value: vehicle.pricePerMonth, unit: "/month" },
                ].map((tier) => (
                  <div key={tier.label} className="bg-card p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      {tier.label}
                    </p>
                    <p className="tnum mt-1 text-base font-bold text-ink sm:text-lg">
                      {formatIDR(tier.value)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-sunken px-4 py-2.5 text-center text-xs text-ink-soft">
                Longer rentals always get the better tier automatically.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href={`/book?vehicle=${vehicle.slug}`}
                variant="accent"
                size="lg"
                className="flex-1 sm:flex-none"
              >
                Book the {vehicle.name}
              </ButtonLink>
              <ButtonLink href="/fleet" variant="outline" size="lg">
                Compare models
              </ButtonLink>
            </div>

            {vehicle.available ? (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-ok">
                <Check className="h-4 w-4" aria-hidden="true" />
                Currently accepting bookings
              </p>
            ) : (
              <p className="mt-4 text-sm text-ink-faint">
                This model is temporarily unavailable — check back soon.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Specs + equipment */}
      <Section tone="wash" labelledBy="specs-title" className="!pt-10">
        <h2 id="specs-title" className="sr-only">
          {vehicle.name} specifications and included equipment
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[14px] border border-line bg-card p-6">
            <h3 className="font-display text-xl text-ink">Specifications</h3>
            <dl className="mt-4 divide-y divide-line">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <spec.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {spec.label}
                  </dt>
                  <dd className="tnum text-sm font-semibold text-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-6">
            <h3 className="font-display text-xl text-ink">Included with every rental</h3>
            <ul className="mt-4 space-y-3">
              {vehicle.includedEquipment.map((item) => (
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
        </div>
      </Section>

      {/* Other models */}
      <Section labelledBy="others-title">
        <h2 id="others-title" className="mb-8 font-display text-2xl text-ink">
          Other rides in the fleet
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((v) => (
            <VehicleCard key={v.slug} vehicle={v} />
          ))}
        </div>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(vehicleSchema(vehicle)) }}
      />
    </>
  );
}
