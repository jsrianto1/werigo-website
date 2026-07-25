import { formatIDR } from "@/lib/config";
import type { PriceBreakdown } from "@/lib/pricing";

/**
 * Itemised price panel shown throughout checkout.
 */
export function PriceSummary({
  breakdown,
  vehicleName,
  quantity,
}: {
  breakdown: PriceBreakdown;
  vehicleName: string;
  quantity: number;
}) {
  const rows = [
    {
      label: `${vehicleName} × ${quantity} · ${breakdown.days} day${
        breakdown.days === 1 ? "" : "s"
      }`,
      value: breakdown.rentalSubtotal,
    },
    ...(breakdown.extrasTotal > 0
      ? [{ label: "Extras", value: breakdown.extrasTotal }]
      : []),
    ...(breakdown.deliveryFee > 0
      ? [{ label: "Delivery fee", value: breakdown.deliveryFee }]
      : []),
    ...(breakdown.oneWayFee > 0
      ? [{ label: "One-way return fee", value: breakdown.oneWayFee }]
      : []),
    ...(breakdown.discount > 0
      ? [{ label: "Discount", value: -breakdown.discount }]
      : []),
  ];

  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <h2 className="font-display text-lg text-ink">Price summary</h2>
      <dl className="mt-4 space-y-2.5 border-b border-line pb-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-ink-soft">{row.label}</dt>
            <dd className="tnum font-medium text-ink">{formatIDR(row.value)}</dd>
          </div>
        ))}
        {breakdown.deliveryFee === 0 ? (
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-ink-soft">Delivery</dt>
            <dd className="font-medium text-ok">Free</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-ink">Estimated total</p>
        <p className="tnum text-xl font-bold text-ink">{formatIDR(breakdown.total)}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Final total is confirmed with your booking. No hidden charges are added
        after checkout.
      </p>
    </div>
  );
}
