import Link from "next/link";
import { ArrowRight, Gauge, Route, Zap } from "lucide-react";
import type { WedisonEntry } from "@/data/vehicles";
import { sharedSpec } from "@/data/vehicles";
import { MediaImage } from "@/components/media/MediaImage";

export function VehicleCard({ entry }: { entry: WedisonEntry }) {
  // Range is shown only when identical across all configurations of
  // the model — differing values are confirmed at booking instead.
  const range = sharedSpec(entry.modelSlug, "claimedRangeKm");

  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-card transition-shadow duration-200 hover:shadow-[0_16px_40px_-20px_rgba(14,43,39,0.3)]">
      <Link
        href={`/fleet/${entry.modelSlug}`}
        aria-label={`View details for the ${entry.displayName}`}
        className="block p-3 pb-0 xl:p-4 xl:pb-0"
      >
        <MediaImage
          id={`fleet-${entry.modelSlug}-main`}
          fallbackLabel={`${entry.displayName} product photo`}
          ratio="3/2"
          fit="contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5 xl:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl text-ink">
            <Link
              href={`/fleet/${entry.modelSlug}`}
              className="transition-colors hover:text-primary"
            >
              {entry.displayName}
            </Link>
          </h3>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{entry.positioning}</p>
        <p className="mt-2 text-xs font-medium text-primary">
          <span className="uppercase tracking-wider">Best for</span>{" "}
          <span className="normal-case text-ink-soft">{entry.bestFor}</span>
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Route className="h-3 w-3" aria-hidden="true" />
              Range
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {range !== null ? `up to ${range} km` : "At booking"}
            </dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Gauge className="h-3 w-3" aria-hidden="true" />
              Top speed
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              up to {entry.topSpeedKmh} km/h
            </dd>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink-faint">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Motor
            </dt>
            <dd className="tnum text-sm font-semibold text-ink">
              {entry.motorW.toLocaleString("en-US")} W
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
          <p className="text-sm text-ink-soft">Rental rate available upon request</p>
          <div className="flex items-center gap-2">
            <Link
              href={`/book?vehicle=${entry.id}`}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Check availability
            </Link>
            <Link
              href={`/fleet/${entry.modelSlug}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[10px] border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              View details
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
