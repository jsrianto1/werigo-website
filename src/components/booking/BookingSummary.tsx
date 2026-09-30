"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";


import { rentalExtras } from "@/data/extras";
import { formatIdr, type RentalQuoteEstimate } from "@/lib/pricing";
import { formatUsdApprox } from "@/lib/currency";
import { useUsdRate } from "@/lib/useUsdRate";
import { formatUsdFee, usdToIdr, type AddOnBreakdown } from "@/lib/addons";

/**
 * Selection summary shown throughout checkout.
 * Intentionally contains no price figures: rates are provided on
 * request and confirmed in the WhatsApp quote.
 */
export function BookingSummary({
  vehicleName,
  quantity,
  days,
  extras,
  pickupName,
  returnName,
  estimate,
  addOnBreakdown,
  areaFeeIdr = 0,
  areaFeeWaived = false,
}: {
  vehicleName: string;
  quantity: number;
  days: number;
  extras: { id: string; quantity: number }[];
  pickupName: string;
  returnName?: string;
  estimate?: RentalQuoteEstimate | null;
  addOnBreakdown?: AddOnBreakdown | null;
  /**
   * Area delivery & collection fee, IDR: one amount per booking
   * covering both legs (0 = none). The 5 km showroom waiver is
   * confirmed on WhatsApp.
   */
  areaFeeIdr?: number;
  /** True when the fee is waived because the rental is one month or longer. */
  areaFeeWaived?: boolean;
}) {
  const usdRate = useUsdRate();
  const { t } = useLanguage();
  const extraRows = extras
    .filter((e) => e.quantity > 0)
    .map((e) => {
      const def = rentalExtras.find((x) => x.id === e.id);
      return def ? `${t(def.name)} × ${e.quantity}` : null;
    })
    .filter(Boolean) as string[];

  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <h2 className="font-display text-lg text-ink"><T>{"Your selection"}</T></h2>
      <dl className="mt-4 space-y-2.5 border-b border-line pb-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft"><T>{"Ride"}</T></dt>
          <dd className="text-right font-medium text-ink">
            {vehicleName} × {quantity}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft"><T>{"Duration"}</T></dt>
          <dd className="tnum font-medium text-ink">
            {days}{" "}<T>{"days"}</T>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft"><T>{"Delivery"}</T></dt>
          <dd className="text-right font-medium text-ink">{pickupName}</dd>
        </div>
        {returnName ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft"><T>{"Return"}</T></dt>
            <dd className="text-right font-medium text-ink">{returnName}</dd>
          </div>
        ) : null}
        {extraRows.map((row) => (
          <div key={row} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft"><T>{"Extra"}</T></dt>
            <dd className="text-right font-medium text-ink">{row}</dd>
          </div>
        ))}
      </dl>
      {estimate ? (
        <div className="mt-4 space-y-1.5 text-sm">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-ink-soft"><T>{`${estimate.tier.label} rate`}</T></span>
            <span className="tnum text-right font-semibold text-ink">
              {formatIdr(estimate.ratePerDayIdr)}<T>{"/day"}</T>{" "}{formatUsdApprox(estimate.ratePerDayIdr, usdRate) ? (
                <span className="tnum block text-xs font-normal text-ink-faint">
                  {formatUsdApprox(estimate.ratePerDayIdr, usdRate)}<T>{"/day"}</T>{" "}</span>
              ) : null}
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-ink-soft"><T>{"Estimated total"}</T></span>
            <span className="tnum text-right font-semibold text-ink">
              {formatIdr(estimate.totalIdr * quantity)}
              {formatUsdApprox(estimate.totalIdr * quantity, usdRate) ? (
                <span className="tnum block text-xs font-normal text-ink-faint">
                  {formatUsdApprox(estimate.totalIdr * quantity, usdRate)}
                </span>
              ) : null}
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-ink"><T>{"Rates shown once dates are selected"}</T>{" "}</p>
      )}
      {areaFeeIdr > 0 || areaFeeWaived ? (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-sm">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-ink-soft"><T>{"Delivery & collection"}</T></span>
            <span className="tnum font-medium text-ink">
              {areaFeeIdr > 0 ? formatIdr(areaFeeIdr) : <span className="text-ok"><T>{"Free"}</T></span>}
            </span>
          </p>
        </div>
      ) : null}
      {addOnBreakdown && addOnBreakdown.totalUsd > 0 ? (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-sm">
          {[
            { label: "Airport delivery fee", usd: addOnBreakdown.airportDeliveryUsd },
            { label: "Airport collection fee", usd: addOnBreakdown.airportCollectionUsd },
            { label: "Cancellation Protection", usd: addOnBreakdown.cancellationProtectionUsd },
            { label: "Motorcycle Protection", usd: addOnBreakdown.motorcycleProtectionUsd },
          ]
            .filter((row) => row.usd > 0)
            .map((row) => (
              <p key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-ink-soft"><T>{row.label}</T></span>
                <span className="tnum font-medium text-ink">{formatUsdFee(row.usd)}</span>
              </p>
            ))}
        </div>
      ) : null}
      {estimate ? (
        <div className="mt-2 border-t border-line-strong pt-2">
          {(() => {
            const baseIdr = estimate.totalIdr * quantity + areaFeeIdr;
            const addUsd = addOnBreakdown?.totalUsd ?? 0;
            const addIdr = usdToIdr(addUsd, usdRate);
            const grandIdr = addUsd > 0 ? (addIdr !== null ? baseIdr + addIdr : null) : baseIdr;
            return (
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink"><T>{"Estimated total"}</T></span>
                <span className="tnum text-right font-bold text-ink">
                  {grandIdr !== null ? formatIdr(grandIdr) : `${formatIdr(baseIdr)} + ${formatUsdFee(addUsd)}`}
                  {grandIdr !== null && formatUsdApprox(grandIdr, usdRate) ? (
                    <span className="tnum block text-xs font-normal text-ink-faint">
                      {formatUsdApprox(grandIdr, usdRate)}
                    </span>
                  ) : null}
                </span>
              </p>
            );
          })()}
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-ink-faint"><T>{"Estimate only. Availability, final pricing, delivery and add-ons are confirmed by the Werigo team on WhatsApp. There are no charges without your approval."}</T>{" "}</p>
      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-ink-soft">
        {[
          "2 sanitised helmets included",
          "Installed premium phone holder",
          "Official Wedison motorcycles, maintained in-house",
          "Delivered with at least 80% battery",
          "Your request goes straight to our WhatsApp team",
        ].map((cue) => (
          <li key={cue} className="flex items-start gap-1.5">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ok" />
            <T>{cue}</T>
          </li>
        ))}
      </ul>
    </div>
  );
}
