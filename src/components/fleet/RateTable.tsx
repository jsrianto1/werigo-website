import {
  pricingTiers,
  ratesIdrPerDay,
  formatIdr,
  usdDisplay,
  minRiderAge,
} from "@/lib/pricing";

/**
 * Approved IDR per-day rates for one model, straight from the
 * central pricing source. IDR is the source of truth; approximate
 * USD renders only if a documented exchange rate is configured.
 *
 * variant="card": compact table on vehicle cards; collapses into an
 * accessible <details> element on small screens so rates never
 * shrink into unreadable text.
 * variant="full": labelled panel for product detail pages.
 */
export function RateTable({
  modelSlug,
  variant = "card",
  className = "",
}: {
  modelSlug: string;
  variant?: "card" | "full";
  className?: string;
}) {
  const rates = ratesIdrPerDay[modelSlug];
  if (!rates) return null;
  const age = minRiderAge[modelSlug];

  const rows = pricingTiers.map((tier) => {
    const idr = rates[tier.id];
    const usd =
      usdDisplay.idrPerUsd !== null
        ? ` (about $${(idr / usdDisplay.idrPerUsd).toFixed(0)})`
        : "";
    return { tier, display: `${formatIdr(idr)}/day${usd}` };
  });

  const table = (
    <table className="w-full text-left">
      <caption className="sr-only">
        Rental rates per day by duration
      </caption>
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-ink-faint">
          <th scope="col" className="py-1 font-medium">
            Duration
          </th>
          <th scope="col" className="py-1 text-right font-medium">
            Per day
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map(({ tier, display }) => (
          <tr key={tier.id}>
            <th scope="row" className="py-1.5 pr-2 text-sm font-medium text-ink">
              {tier.label}
              <span className="tnum ml-1.5 text-xs font-normal text-ink-faint">
                {tier.range}
              </span>
            </th>
            <td className="tnum py-1.5 text-right text-sm font-semibold text-ink">
              {display}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const notes = (
    <>
      <p className="tnum mt-2 text-xs text-ink-soft">
        Minimum rental 2 days. Estimates are confirmed with availability
        on WhatsApp.
      </p>
      {age ? (
        <p className="mt-1 text-xs font-medium text-ink-soft">
          Riders must be at least {age} years old for this model.
        </p>
      ) : null}
    </>
  );

  if (variant === "card") {
    return (
      <div className={className}>
        {/* Small screens: expandable, never shrunken text */}
        <details className="group rounded-[10px] border border-line px-3 py-2 sm:hidden">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span>
              Rates from{" "}
              <span className="tnum">{formatIdr(rates.monthly)}/day</span>
            </span>
            <span
              aria-hidden="true"
              className="text-ink-faint transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="pb-1 pt-2">{table}</div>
        </details>
        {/* sm and up: always visible */}
        <div className="hidden sm:block">{table}</div>
        {notes}
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-ink">Rental rates</h3>
      <div className="mt-3">{table}</div>
      {notes}
    </div>
  );
}
