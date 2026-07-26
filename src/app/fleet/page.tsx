import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { ButtonLink } from "@/components/ui/Button";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import {
  getPrimaryCards,
  sharedSpec,
  specDisclaimer,
} from "@/data/vehicles";

export const metadata: Metadata = {
  title: "Our Fleet — Official Wedison Electric Motorcycles for Rent in Bali",
  description:
    "Compare official Wedison electric motorcycles available for rent through Werigo in Bali: Bees, Victory, Athena and EdPower. Rates available upon request.",
  alternates: { canonical: "/fleet" },
};

export default function FleetPage() {
  const cards = getPrimaryCards();

  return (
    <>
      <Section labelledBy="fleet-title" className="!pb-8">
        <SectionHeading
          eyebrow="Our fleet · Powered by Wedison"
          title="Official Wedison electric motorcycles, available for rent through Werigo"
          lede={specDisclaimer}
          id="fleet-title"
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((entry) => (
            <VehicleCard key={entry.id} entry={entry} />
          ))}
        </div>
      </Section>

      <RidingMotorcycle />

      {/* Comparison table — the four rental models */}
      <Section labelledBy="compare-title" tone="wash">
        <SectionHeading
          eyebrow="Side by side"
          title="Compare the fleet"
          lede="Values that depend on the exact battery configuration are confirmed with your booking."
          id="compare-title"
        />
        <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">
              Comparison of Wedison fleet configurations by motor, speed,
              battery, range and charging
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Model
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Motor
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Top speed
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Battery (LFP)
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Claimed range
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Home charging
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  SuperCharge
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cards.map((e) => {
                const battery = sharedSpec(e.modelSlug, "batteryWh");
                const range = sharedSpec(e.modelSlug, "claimedRangeKm");
                return (
                  <tr key={e.id}>
                    <th scope="row" className="px-5 py-4 font-display text-base text-ink">
                      {e.displayName}
                    </th>
                    <td className="tnum px-5 py-4 text-ink-soft">
                      {e.motorW.toLocaleString("en-US")} W
                    </td>
                    <td className="tnum px-5 py-4 text-ink-soft">
                      up to {e.topSpeedKmh} km/h
                    </td>
                    <td className="tnum px-5 py-4 text-ink-soft">
                      {battery !== null
                        ? `${battery.toLocaleString("en-US")} Wh`
                        : "Confirmed at booking"}
                    </td>
                    <td className="tnum px-5 py-4 text-ink-soft">
                      {range !== null ? `up to ${range} km` : "Confirmed at booking"}
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {e.homeCharging ?? "Supported"}
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {e.supercharge ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>Supported</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-faint">
                          <Minus className="h-4 w-4" aria-hidden="true" />
                          <span>Home charging</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {specDisclaimer} Rental rates available upon request.
        </p>
        <div className="mt-8">
          <ButtonLink href="/book" variant="accent" size="lg">
            Check availability and rates
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
