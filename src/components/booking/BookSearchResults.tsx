"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Battery, Gauge, Route, SearchX, Users } from "lucide-react";
import { SearchWidget } from "@/components/booking/SearchWidget";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { getAvailableVehicles, vehicles } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { formatIDR } from "@/lib/config";
import {
  rentalDays,
  vehicleRentalPrice,
  isValidPeriod,
  type RentalPeriod,
} from "@/lib/pricing";

/**
 * Booking steps 1–3: search (if no params), then available vehicles,
 * then selection → checkout.
 */
export function BookSearchResults() {
  const params = useSearchParams();

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
          Tell us your area and dates — we&apos;ll show you every model
          available for your trip.
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
  const available = getAvailableVehicles();
  const unavailable = vehicles.filter((v) => !v.available);

  const checkoutParams = (slug: string) =>
    new URLSearchParams({
      vehicle: slug,
      pickup,
      return: ret,
      startDate: period.startDate,
      startTime: period.startTime,
      endDate: period.endDate,
      endTime: period.endTime,
    }).toString();

  return (
    <div>
      <BookingStepper current={1} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink md:text-4xl">
            Available in {area?.name ?? pickup}
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

      {available.length === 0 ? (
        <div className="mt-10 rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
          <SearchX className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            Nothing available for these dates
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Try different dates, or message us on WhatsApp — cancellations open
            up spots daily.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {available.map((vehicle) => {
            const price = vehicleRentalPrice(vehicle, days);
            const highlighted = vehicle.slug === preselect;
            return (
              <li
                key={vehicle.slug}
                className={`grid gap-5 rounded-[14px] border bg-card p-4 sm:p-5 md:grid-cols-[260px_1fr_auto] md:items-center ${
                  highlighted ? "border-primary shadow-[0_0_0_1px_var(--brand-primary)]" : "border-line"
                }`}
              >
                <PlaceholderImage label={`${vehicle.name} photo`} ratio="4/3" />
                <div>
                  {highlighted ? (
                    <p className="eyebrow mb-1">Your pick</p>
                  ) : null}
                  <h2 className="font-display text-2xl text-ink">{vehicle.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{vehicle.positioning}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
                    <li className="flex items-center gap-1.5">
                      <Route className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="tnum">{vehicle.rangeKm} km range</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="tnum">{vehicle.topSpeedKmh} km/h</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Battery className="h-4 w-4 text-primary" aria-hidden="true" />
                      {vehicle.chargingTime}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                      {vehicle.seatCapacity} seats
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col items-stretch gap-3 md:items-end">
                  <p className="text-sm text-ink-soft md:text-right">
                    <span className="tnum block text-2xl font-bold text-ink">
                      {formatIDR(price)}
                    </span>
                    for {days} day{days === 1 ? "" : "s"}
                  </p>
                  <Link
                    href={`/book/checkout?${checkoutParams(vehicle.slug)}`}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                  >
                    Select {vehicle.name}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {unavailable.length > 0 ? (
        <p className="mt-6 text-sm text-ink-faint">
          {unavailable.map((v) => v.name).join(", ")}{" "}
          {unavailable.length === 1 ? "is" : "are"} temporarily unavailable for
          these dates.
        </p>
      ) : null}
    </div>
  );
}
