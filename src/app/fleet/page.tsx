import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

import { T } from "@/components/i18n/LanguageProvider";
import { pageMetadata } from "@/lib/seo";
import { Check, Minus } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { ButtonLink } from "@/components/ui/Button";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import {
  getPrimaryCards,
  getVariants,
  specDisclaimer,
} from "@/data/vehicles";
import { pricingTiers, ratesIdrPerDay, formatIdr } from "@/lib/pricing";
import { formatUsdApprox, usdEstimateNote } from "@/lib/currency";
import { getUsdIdrRate } from "@/lib/exchangeRate";

export const metadata = pageMetadata("Compare Electric Scooters & Rates in Bali", "Compare four Wedison electric scooters in Bali. Daily rates from Rp90,000, plus weekly and monthly options. Two helmets included; hotel delivery by arrangement.", "/fleet");

export default async function FleetPage() {
  const cards = getPrimaryCards();
  const fx = await getUsdIdrRate();

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Our Fleet", path: "/fleet" }]} />
      <Section labelledBy="fleet-title" className="!pb-8">
        <SectionHeading as="h1"
          eyebrow="Our fleet · Powered by Wedison"
          title="Find your Bali ride."
          lede="Compare electric scooters for beach days, everyday trips and a longer stay. Choose your dates for a rental estimate."
          id="fleet-title"
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((entry) => (
            <VehicleCard key={entry.id} entry={entry} />
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-ink-faint"><T>{"Minimum rental 2 days. Rates are per motorcycle per day in IDR; US dollar amounts are estimates. A rain poncho can be requested and optional protection can be added at checkout. Availability and your final quote are confirmed on WhatsApp."}</T>{" "}</p>
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
            <caption className="sr-only"><T>{"Comparison of Wedison fleet configurations by motor, speed, battery, range and charging"}</T>{" "}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Model"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Motor"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Top speed"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Battery (LFP)"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Claimed range"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Home charging"}</T>{" "}</th>
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"SuperCharge"}</T>{" "}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cards.map((e) => {
                // Standard and Extended variants can carry different
                // approved battery/range figures. Show the exact value
                // when every variant matches, otherwise show the full
                // Standard to Extended range (real approved numbers
                // only, never a single invented figure).
                const variants = getVariants(e.modelSlug);
                const batteries = [...new Set(variants.map((v) => v.batteryWh))];
                const ranges = [...new Set(variants.map((v) => v.claimedRangeKm))];
                const battery =
                  batteries.length === 1
                    ? `${batteries[0].toLocaleString("en-US")} Wh`
                    : `${Math.min(...batteries).toLocaleString("en-US")} to ${Math.max(...batteries).toLocaleString("en-US")} Wh`;
                const range =
                  ranges.length === 1
                    ? `${ranges[0]} km`
                    : `${Math.min(...ranges)} to ${Math.max(...ranges)} km`;
                return (
                  <tr key={e.id}>
                    <th scope="row" className="px-5 py-4 font-display text-base text-ink">
                      {e.displayName}
                    </th>
                    <td className="tnum px-5 py-4 text-ink-soft">
                      {e.motorW.toLocaleString("en-US")}{" "}<T>{"W"}</T>{" "}</td>
                    <td className="tnum px-5 py-4 text-ink-soft"><T>{"up to"}</T>{" "}{e.topSpeedKmh}{" "}<T>{"km/h"}</T>{" "}</td>
                    <td className="tnum px-5 py-4 text-ink-soft">{battery}</td>
                    <td className="tnum px-5 py-4 text-ink-soft">{range}</td>
                    <td className="px-5 py-4 text-ink-soft">
                      {e.homeCharging ?? "Supported"}
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {e.supercharge ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span><T>{"Supported"}</T></span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-faint">
                          <Minus className="h-4 w-4" aria-hidden="true" />
                          <span><T>{"Home charging"}</T></span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="mb-4 mt-10 font-display text-2xl text-ink"><T>{"Rental rates per day"}</T>{" "}</h3>
        <div className="overflow-x-auto rounded-[14px] border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only"><T>{"Approved rental rates per motorcycle per day by duration"}</T>{" "}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-semibold text-ink"><T>{"Model"}</T>{" "}</th>
                {pricingTiers.map((t) => (
                  <th key={t.id} scope="col" className="px-5 py-4 font-semibold text-ink">
                    <T>{t.label}</T>
                    <span className="tnum block text-xs font-normal text-ink-faint">
                      <T>{t.range}</T>
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
          <T>{specDisclaimer}</T>{" "}<T>{"Rates are per motorcycle per day in IDR. Minimum rental 2 days. Riders must be at least 25 years old for the EdPower. Estimated totals are confirmed with availability on WhatsApp."}</T>{" "}</p>
        <div className="mt-8">
          <ButtonLink href="/book" variant="accent" size="lg"><T>{"Check availability and rates"}</T>{" "}</ButtonLink>
        </div>
      </Section>
    </>
  );
}
