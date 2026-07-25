import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/Section";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { ButtonLink } from "@/components/ui/Button";
import { vehicles } from "@/data/vehicles";
import { formatIDR } from "@/lib/config";

export const metadata: Metadata = {
  title: "Our Electric Motorcycle Fleet — Bali Rentals",
  description:
    "Compare Werigo's electric motorcycles for rent in Bali: Bees, Victory, Athena and EdPower. Real-world range, honest specs and daily, weekly and monthly rates.",
  alternates: { canonical: "/fleet" },
};

export default function FleetPage() {
  return (
    <>
      <Section labelledBy="fleet-title" className="!pb-8">
        <SectionHeading
          eyebrow="Our fleet"
          title="Every model, honestly specced"
          lede="Four electric rides maintained in-house. Range figures are real-world Bali estimates with two riders — not brochure numbers."
          id="fleet-title"
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.slug} vehicle={vehicle} />
          ))}
        </div>
      </Section>

      {/* Comparison table */}
      <Section labelledBy="compare-title" tone="wash">
        <SectionHeading
          eyebrow="Side by side"
          title="Compare the fleet"
          id="compare-title"
        />
        <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">
              Comparison of Werigo fleet models by price, range and specifications
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Model
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Daily
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Weekly
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Monthly
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Range
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Top speed
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Charging
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {vehicles.map((v) => (
                <tr key={v.slug}>
                  <th scope="row" className="px-5 py-4 font-display text-base text-ink">
                    {v.name}
                  </th>
                  <td className="tnum px-5 py-4 text-ink-soft">
                    {formatIDR(v.pricePerDay)}
                  </td>
                  <td className="tnum px-5 py-4 text-ink-soft">
                    {formatIDR(v.pricePerWeek)}
                  </td>
                  <td className="tnum px-5 py-4 text-ink-soft">
                    {formatIDR(v.pricePerMonth)}
                  </td>
                  <td className="tnum px-5 py-4 text-ink-soft">{v.rangeKm} km</td>
                  <td className="tnum px-5 py-4 text-ink-soft">{v.topSpeedKmh} km/h</td>
                  <td className="px-5 py-4 text-ink-soft">{v.chargingTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8">
          <ButtonLink href="/book" variant="accent" size="lg">
            Check availability
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
