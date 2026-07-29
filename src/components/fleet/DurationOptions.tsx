"use client";

import { useState } from "react";
import {
  rentalDurations,
  getPricing,
  rateFallback,
  type RentalDurationId,
} from "@/data/commercialTerms";

/**
 * Daily / Weekly / Monthly rental tiers for one model.
 *
 * Numeric prices render only when the model's pricing is approved in
 * src/data/commercialTerms.ts; until then every tier shows the
 * approved fallback wording. The tiers stay selectable so the offer
 * reads as three real rental options.
 *
 * variant="compact": tight pill row for cards and search results.
 * variant="full": labelled panel for product detail pages.
 */
export function DurationOptions({
  modelSlug,
  variant = "compact",
  className = "",
}: {
  modelSlug: string;
  variant?: "compact" | "full";
  className?: string;
}) {
  const [selected, setSelected] = useState<RentalDurationId>("daily");
  const pricing = getPricing(modelSlug);

  const priceFor = (id: RentalDurationId): string | null => {
    if (!pricing.pricingApproved) return null;
    const usd =
      id === "daily"
        ? pricing.dailyUsdPerDay
        : id === "weekly"
          ? pricing.weeklyUsdPerDay
          : pricing.monthlyUsdPerDay;
    return usd !== undefined ? `$${usd}/day` : null;
  };

  if (variant === "compact") {
    return (
      <div className={className}>
        <div
          role="group"
          aria-label="Rental duration options"
          className="grid grid-cols-3 gap-1.5"
        >
          {rentalDurations.map((d) => {
            const active = selected === d.id;
            const price = priceFor(d.id);
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(d.id)}
                className={`min-h-11 cursor-pointer rounded-[10px] border px-2 py-1.5 text-center transition-colors ${
                  active
                    ? "border-primary bg-primary-faint text-ink"
                    : "border-line text-ink-soft hover:border-line-strong"
                }`}
              >
                <span className="block text-xs font-semibold">{d.label}</span>
                <span className="tnum block text-[11px] text-ink-faint">
                  {price ?? d.detail}
                </span>
              </button>
            );
          })}
        </div>
        <p className="tnum mt-2 text-xs text-ink-soft">
          {pricing.pricingApproved ? null : rateFallback.label}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-ink">Rental duration</h3>
      <div
        role="group"
        aria-label="Rental duration options"
        className="mt-3 grid gap-2 sm:grid-cols-3"
      >
        {rentalDurations.map((d) => {
          const active = selected === d.id;
          const price = priceFor(d.id);
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(d.id)}
              className={`min-h-11 cursor-pointer rounded-[10px] border p-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary-faint"
                  : "border-line bg-card hover:border-line-strong"
              }`}
            >
              <span className="block text-sm font-semibold text-ink">
                {d.label}
              </span>
              <span className="tnum mt-0.5 block text-xs text-ink-soft">
                {d.detail}
              </span>
              <span className="tnum mt-1.5 block text-xs font-medium text-primary">
                {price ?? rateFallback.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-xs text-ink-faint">{rateFallback.support}</p>
    </div>
  );
}
