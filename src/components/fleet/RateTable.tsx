import {
  pricingTiers,
  ratesIdrPerDay,
  formatIdr,
  minRiderAge,
  type PricingTierId,
} from "@/lib/pricing";
import { formatUsdApprox, usdEstimateNote } from "@/lib/currency";
import { getUsdIdrRate } from "@/lib/exchangeRate";

/**
 * Compact approved-rate display for one model. IDR is prominent and
 * official; a muted USD estimate renders beside it when the cached
 * daily reference rate is available (server-side, one upstream call
 * per revalidation window, silently absent on failure).
 *
 * variant="card": a three-tier strip (Daily / Weekly / Monthly) with
 * the 2 Weeks and 3 Weeks tiers inside an accessible
 * "View all duration rates" expander. Monthly carries a small
 * "Best rate" tag because it is factually the lowest per-day rate.
 * variant="full": the complete five-tier table for detail pages.
 */
export async function RateTable({
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
  const fx = await getUsdIdrRate();
  const age = minRiderAge[modelSlug];
  const noteId = `usd-note-${modelSlug}-${variant}`;

  const usd = (tierId: PricingTierId) =>
    formatUsdApprox(rates[tierId], fx?.rate);

  const primary: PricingTierId[] = ["daily", "weekly", "monthly"];
  const tier = (id: PricingTierId) => pricingTiers.find((t) => t.id === id)!;

  const fullTable = (
    <table className="w-full text-left">
      <caption className="sr-only">Rental rates per day by duration</caption>
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
        {pricingTiers.map((t) => (
          <tr key={t.id}>
            <th scope="row" className="py-1.5 pr-2 text-sm font-medium text-ink">
              {t.label}
              <span className="tnum ml-1.5 text-xs font-normal text-ink-faint">
                {t.range}
              </span>
            </th>
            <td className="tnum py-1.5 text-right text-sm font-semibold text-ink">
              {formatIdr(rates[t.id])}/day
              {usd(t.id) ? (
                <span
                  aria-describedby={noteId}
                  title={usdEstimateNote}
                  className="tnum block text-xs font-normal text-ink-faint"
                >
                  {usd(t.id)}/day
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const usdNote = fx ? (
    <p id={noteId} className="mt-2 text-[11px] leading-relaxed text-ink-faint">
      {usdEstimateNote}
    </p>
  ) : null;

  if (variant === "full") {
    return (
      <div className={className}>
        <h3 className="text-sm font-semibold text-ink">Rental rates</h3>
        <div className="mt-3">{fullTable}</div>
        {usdNote}
        <p className="tnum mt-2 text-xs text-ink-soft">
          Minimum rental 2 days. Estimates are confirmed with availability
          on WhatsApp.
        </p>
        {age ? (
          <p className="mt-1 text-xs font-medium text-ink-soft">
            Riders must be at least {age} years old for this model.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Rental rates per day"
        className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-line"
      >
        {primary.map((id, i) => {
          const t = tier(id);
          const best = id === "monthly";
          return (
            <div
              key={id}
              className={`min-w-0 px-1.5 py-2.5 text-center ${i > 0 ? "border-l border-line" : ""} ${
                best ? "bg-primary-faint" : ""
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                {t.label}
              </p>
              <p className="tnum mt-1 text-[13px] font-bold leading-tight text-ink xl:text-sm">
                {formatIdr(rates[id])}
              </p>
              <p className="tnum text-[11px] text-ink-faint">
                {usd(id) ? (
                  <span aria-describedby={noteId} title={usdEstimateNote}>
                    {usd(id)}
                  </span>
                ) : (
                  "per day"
                )}
              </p>
              {best ? (
                <p className="mt-1">
                  <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
                    Best rate
                  </span>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <details className="group mt-2">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary hover:text-primary-strong [&::-webkit-details-marker]:hidden">
          View all duration rates
          <span
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="mt-2 rounded-[10px] border border-line px-3 py-2">
          {fullTable}
          {usdNote}
        </div>
      </details>
      {age ? (
        <p className="mt-1.5 text-xs font-medium text-ink-soft">
          Riders must be at least {age} years old for this model.
        </p>
      ) : null}
    </div>
  );
}
