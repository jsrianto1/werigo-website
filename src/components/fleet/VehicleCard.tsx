import Link from "next/link";
import { ArrowRight, Battery, Gauge, Route } from "lucide-react";
import type { Vehicle } from "@/data/vehicles";
import { formatIDR } from "@/lib/config";
import { MediaImage } from "@/components/media/MediaImage";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-card transition-shadow duration-200 hover:shadow-[0_16px_40px_-20px_rgba(14,43,39,0.3)]">
      <Link
        href={`/fleet/${vehicle.slug}`}
        aria-label={`${vehicle.name} — view details`}
        className="block p-3 pb-0"
      >
        <MediaImage
          id={`fleet-${vehicle.slug}-main`}
          fallbackLabel={`${vehicle.name} product photo`}
          ratio="4/3"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl text-ink">
            <Link
              href={`/fleet/${vehicle.slug}`}
              className="transition-colors hover:text-primary"
            >
              {vehicle.name}
            </Link>
          </h3>
          {vehicle.available ? (
            <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-medium text-ok">
              Available
            </span>
          ) : (
            <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink-faint">
              Unavailable
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">{vehicle.positioning}</p>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Route className="h-3 w-3" aria-hidden="true" />
              Range
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {vehicle.rangeKm} km
            </dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Gauge className="h-3 w-3" aria-hidden="true" />
              Top speed
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {vehicle.topSpeedKmh} km/h
            </dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Battery className="h-3 w-3" aria-hidden="true" />
              Charge
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {vehicle.chargingTime.split(" ")[0]} h
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-1 items-end justify-between gap-3">
          <p className="text-sm text-ink-soft">
            from{" "}
            <span className="tnum text-lg font-bold text-ink">
              {formatIDR(vehicle.pricePerDay)}
            </span>
            <span className="text-ink-faint"> /day</span>
          </p>
          <Link
            href={`/fleet/${vehicle.slug}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-strong"
          >
            Details
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
