"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Battery, Gauge, Route, SearchX, Zap } from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { MediaImage } from "@/components/media/MediaImage";
import {
  getListedModels,
  getVariants,
  getEntry,
  specDisclaimer,
} from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { rentalDays, isValidPeriod, type RentalPeriod } from "@/lib/pricing";

/**
 * Booking steps 1–3: search (if no params), then Wedison models with
 * variant selection, then selection → checkout. No rental prices are
 * shown — rates are always provided on request.
 */
export function BookSearchResults() {
  const params = useSearchParams();
  const router = useRouter();

  const pickup = params.get("pickup") ?? "";
  const ret = params.get("return") ?? pickup;
  const preselect = params.get("vehicle") ?? "";
  const period: RentalPeriod = useMemo(
    () => ({
      startDate: params.get("startDate") ?? "",
      startTime: params.get("startTime") ?? "09:00",
      endDate: params.get("endDate") ?? "",
      endTime: params.get("endTime") ?? "09:00",
    }),
    [params]
  );

  // Variant choice per model page slug (entry id keyed by modelSlug)
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({});

  const hasSearch =
    Boolean(pickup) &&
    Boolean(period.startDate) &&
    Boolean(period.endDate) &&
    isValidPeriod(period);

  // ---- Step 1: no search yet — show the widget ----
  if (!hasSearch) {
    return (
      <div className="mx-auto max-w-3xl">
        <BookingStepper current={0} />
        <h1 className="font-display text-3xl text-ink md:text-4xl">
          Where and when do you want to ride?
        </h1>
        <p className="mt-3 text-ink-soft">
          Tell us your area and dates — we&apos;ll show you every Wedison model
          available by request for your trip.
          {preselect ? " Your chosen ride will be waiting at the next step." : ""}
        </p>
        <div className="mt-8">
          <SearchWidget />
        </div>
      </div>
    );
  }

  // ---- Step 2: results ----
  const area = getArea(pickup);
  const returnArea = getArea(ret);
  const days = rentalDays(period);
  const models = getListedModels();
  const preselectedEntry = preselect ? getEntry(preselect) : undefined;

  const selectedEntryId = (modelSlug: string): string => {
    if (variantChoice[modelSlug]) return variantChoice[modelSlug];
    if (preselectedEntry && preselectedEntry.modelSlug === modelSlug)
      return preselectedEntry.id;
    return getVariants(modelSlug)[0]?.id ?? modelSlug;
  };

  const goToCheckout = (entryId: string) => {
    const qs = new URLSearchParams({
      vehicle: entryId,
      pickup,
      return: ret,
      startDate: period.startDate,
      startTime: period.startTime,
      endDate: period.endDate,
      endTime: period.endTime,
    }).toString();
    router.push(`/book/checkout?${qs}`);
  };

  return (
    <div>
      <BookingStepper current={1} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink md:text-4xl">
            Wedison models for {area?.name ?? pickup}
          </h1>
          <p className="tnum mt-2 text-sm text-ink-soft">
            {period.startDate} {period.startTime} → {period.endDate}{" "}
            {period.endTime} · {days} day{days === 1 ? "" : "s"}
            {returnArea && ret !== pickup ? ` · return in ${returnArea.name}` : ""}
          </p>
        </div>
        <Link
          href="/book"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary transition-colors hover:text-primary-strong"
        >
          Change search
        </Link>
      </div>

      {models.length === 0 ? (
        <div className="mt-10 rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
          <SearchX className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            No models listed right now
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Message us on WhatsApp — we&apos;ll tell you what&apos;s possible
            for your dates.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {models.map((model) => {
            const variants = getVariants(model.modelSlug);
            const hasVariants = variants.length > 1;
            const activeId = selectedEntryId(model.modelSlug);
            const active = getEntry(activeId) ?? model;
            const highlighted =
              preselectedEntry?.modelSlug === model.modelSlug;
            return (
              <li
                key={model.modelSlug}
                className={`grid gap-5 rounded-[14px] border bg-card p-4 sm:p-5 md:grid-cols-[260px_1fr_auto] md:items-center ${
                  highlighted
                    ? "border-primary shadow-[0_0_0_1px_var(--brand-primary)]"
                    : "border-line"
                }`}
              >
                <MediaImage
                  id={`fleet-${model.modelSlug}-main`}
                  fallbackLabel={`${model.displayName} photo`}
                  ratio="4/3"
                  fit="contain"
                  sizes="(max-width: 768px) 100vw, 260px"
                />
                <div>
                  {highlighted ? <p className="eyebrow mb-1">Your pick</p> : null}
                  <h2 className="font-display text-2xl text-ink">
                    {active.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{active.positioning}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
                    <li className="flex items-center gap-1.5">
                      <Route className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="tnum">up to {active.claimedRangeKm} km</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="tnum">up to {active.topSpeedKmh} km/h</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Battery className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="tnum">
                        LFP {active.batteryWh.toLocaleString("en-US")} Wh
                      </span>
                    </li>
                    {active.supercharge ? (
                      <li className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                        Supercharge
                      </li>
                    ) : null}
                  </ul>

                  {hasVariants ? (
                    <div className="mt-3">
                      <label
                        htmlFor={`variant-${model.modelSlug}`}
                        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
                      >
                        Variant
                      </label>
                      <select
                        id={`variant-${model.modelSlug}`}
                        value={activeId}
                        onChange={(e) =>
                          setVariantChoice((prev) => ({
                            ...prev,
                            [model.modelSlug]: e.target.value,
                          }))
                        }
                        className="min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-sm text-ink"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.variant} — up to {v.claimedRangeKm} km
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-stretch gap-3 md:items-end">
                  <p className="text-sm text-ink-soft md:max-w-[180px] md:text-right">
                    <span className="block font-semibold text-ink">
                      Available by request
                    </span>
                    Rental rate available upon request
                  </p>
                  <button
                    onClick={() => goToCheckout(activeId)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                  >
                    Check availability and rates
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">{specDisclaimer}</p>
    </div>
  );
}
