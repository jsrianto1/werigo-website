"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CalendarDays, Search, ArrowRight, CornerDownRight } from "lucide-react";
import { serviceAreas, airportPoints } from "@/data/locations";
import { defaultSearch, toDateInput, type SearchState } from "@/lib/booking";
import { isValidPeriod, MIN_RENTAL_MESSAGE } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";

const timeOptions = Array.from({ length: 25 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}).filter((t) => t <= "20:00");

/**
 * The rental search — step 1 of the booking journey.
 * Compact mode is used on inner pages; full mode on the homepage hero.
 */
export function SearchWidget({
  compact = false,
  initial,
}: {
  compact?: boolean;
  initial?: Partial<SearchState>;
}) {
  const router = useRouter();
  const [state, setState] = useState<SearchState>({
    ...defaultSearch(),
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = toDateInput(new Date());

  function update<K extends keyof SearchState>(key: K, value: SearchState[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.pickupSlug) {
      setError("Choose a pick-up or delivery area to search.");
      return;
    }
    if (state.differentReturn && !state.returnSlug) {
      setError("Choose a return area, or switch off different return.");
      return;
    }
    if (!isValidPeriod(state)) {
      setError(
        `${MIN_RENTAL_MESSAGE} Adjust your dates and try again.`
      );
      return;
    }
    setSubmitting(true);
    const params = new URLSearchParams({
      pickup: state.pickupSlug,
      return: state.differentReturn ? state.returnSlug : state.pickupSlug,
      startDate: state.startDate,
      startTime: state.startTime,
      endDate: state.endDate,
      endTime: state.endTime,
    });
    router.push(`/book?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Search rental availability"
      className={`rounded-[14px] border border-line bg-card p-4 shadow-[0_12px_40px_-16px_rgba(14,43,39,0.25)] sm:p-5 ${
        compact ? "" : "md:p-6"
      }`}
    >
      <div className={`grid gap-3 ${compact ? "lg:grid-cols-[1fr_1fr_auto]" : ""}`}>
        {/* Location row */}
        <div className={compact ? "" : "grid gap-3 sm:grid-cols-2"}>
          <div>
            <label
              htmlFor="pickup-location"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Pick-up or delivery area
            </label>
            <select
              id="pickup-location"
              value={state.pickupSlug}
              onChange={(e) => update("pickupSlug", e.target.value)}
              className="min-h-11 w-full cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink"
            >
              <option value="">Choose an area…</option>
              <optgroup label="Ngurah Rai Airport">
                {airportPoints.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bali areas">
                {serviceAreas.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {area.name}
                    {area.deliveryFee === 0 ? " (free delivery)" : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className={compact ? "mt-3" : ""}>
            <div className="mb-1.5 flex min-h-5 items-center justify-between">
              <label
                htmlFor="different-return"
                className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft"
              >
                <CornerDownRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Different return area
              </label>
              <input
                id="different-return"
                type="checkbox"
                checked={state.differentReturn}
                onChange={(e) => update("differentReturn", e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
              />
            </div>
            <select
              id="return-location"
              aria-label="Return area"
              value={state.returnSlug}
              disabled={!state.differentReturn}
              onChange={(e) => update("returnSlug", e.target.value)}
              className="min-h-11 w-full cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint"
            >
              <option value="">
                {state.differentReturn ? "Choose return area…" : "Same as pick-up"}
              </option>
              <optgroup label="Ngurah Rai Airport">
                {airportPoints.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bali areas">
                {serviceAreas.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Date/time row */}
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Start
            </legend>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="date"
                aria-label="Start date"
                value={state.startDate}
                min={todayStr}
                onChange={(e) => update("startDate", e.target.value)}
                className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink"
              />
              <select
                aria-label="Start time"
                value={state.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                className="tnum min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-2.5 text-[15px] text-ink"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              End
            </legend>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="date"
                aria-label="End date"
                value={state.endDate}
                min={state.startDate || todayStr}
                onChange={(e) => update("endDate", e.target.value)}
                className="tnum min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] text-ink"
              />
              <select
                aria-label="End time"
                value={state.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                className="tnum min-h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-2.5 text-[15px] text-ink"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        </div>

        {/* Submit */}
        <div className={compact ? "flex items-end" : ""}>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              "Searching…"
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden="true" />
                Search availability
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-faint">
        Your request goes straight to our team on WhatsApp. Availability and your quote confirmed there.
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
