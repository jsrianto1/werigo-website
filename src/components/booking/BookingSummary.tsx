import { rentalExtras } from "@/data/extras";

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
}: {
  vehicleName: string;
  quantity: number;
  days: number;
  extras: { id: string; quantity: number }[];
  pickupName: string;
  returnName?: string;
}) {
  const extraRows = extras
    .filter((e) => e.quantity > 0)
    .map((e) => {
      const def = rentalExtras.find((x) => x.id === e.id);
      return def ? `${def.name} × ${e.quantity}` : null;
    })
    .filter(Boolean) as string[];

  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <h2 className="font-display text-lg text-ink">Your selection</h2>
      <dl className="mt-4 space-y-2.5 border-b border-line pb-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Ride</dt>
          <dd className="text-right font-medium text-ink">
            {vehicleName} × {quantity}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Duration</dt>
          <dd className="tnum font-medium text-ink">
            {days} day{days === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Delivery</dt>
          <dd className="text-right font-medium text-ink">{pickupName}</dd>
        </div>
        {returnName ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Return</dt>
            <dd className="text-right font-medium text-ink">{returnName}</dd>
          </div>
        ) : null}
        {extraRows.map((row) => (
          <div key={row} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Extra</dt>
            <dd className="text-right font-medium text-ink">{row}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm font-semibold text-ink">
        Rental rate available upon request
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        We confirm your full quote on WhatsApp before you commit to
        anything. It covers the rental, your extras and any delivery fees.
        There are no charges without your approval.
      </p>
      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-ink-soft">
        {[
          "Official Wedison motorcycles, maintained in-house",
          "Fully charged handover",
          "Transparent quote before confirmation",
          "Booking reference stored before WhatsApp opens",
          "A real local support team",
        ].map((cue) => (
          <li key={cue} className="flex items-start gap-1.5">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ok" />
            {cue}
          </li>
        ))}
      </ul>
    </div>
  );
}
