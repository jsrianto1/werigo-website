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
import { pricingTiers, ratesIdrPerDay, formatIdr } from "@/lib/pricing";
import { formatUsdApprox, usdEstimateNote } from "@/lib/currency";
import { getUsdIdrRate } from "@/lib/exchangeRate";

export const metadata: Metadata = {
  title: "Our Fleet of Official Wedison Electric Motorcycles for Rent in Bali",
  description:
    "Compare official Wedison electric motorcycles available for rent through Werigo in Bali: Bees, Victory, Athena and EdPower. Rates available upon request.",
  alternates: { canonical: "/fleet" },
};

export default async function FleetPage() {
  const cards = getPrimaryCards();
  const fx = await getUsdIdrRate();

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
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-ink-faint">
          Minimum rental 2 days. Rates are per motorcycle per day in IDR;
          US dollar amounts are estimates. A rain poncho can be requested
          and optional protection can be added at checkout. Availability
          and your final quote are confirmed on WhatsApp.
        </p>
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
        <h3 className="mb-4 mt-10 font-display text-2xl text-ink">
          Rental rates per day
        </h3>
        <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">
              Approved rental rates per motorcycle per day by duration
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-semibold text-ink">
                  Model
                </th>
                {pricingTiers.map((t) => (
                  <th key={t.id} scope="col" className="px-5 py-4 font-semibold text-ink">
                    {t.label}
                    <span className="tnum block text-xs font-normal text-ink-faint">
                      {t.range}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cards.map((e) => (
                <tr key={`rates-${e.id}`}>
                  <th scope="row" className="px-5 py-4 font-display text-base text-ink">
                    {e.displayName}
                  </th>
                  {pricingTiers.map((t) => (
                    <td key={t.id} className="tnum px-5 py-4 text-ink-soft">
                      {formatIdr(ratesIdrPerDay[e.modelSlug][t.id])}
                      {formatUsdApprox(ratesIdrPerDay[e.modelSlug][t.id], fx?.rate) ? (
                        <span
                          title={usdEstimateNote}
                          className="block text-xs text-ink-faint"
                        >
                          {formatUsdApprox(ratesIdrPerDay[e.modelSlug][t.id], fx?.rate)}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {specDisclaimer} Rates are per motorcycle per day in IDR.
          Minimum rental 2 days. Riders must be at least 25 years old for
          the EdPower. Estimated totals are confirmed with availability
          on WhatsApp.
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
