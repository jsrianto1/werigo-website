import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { WedisonEntry } from "@/data/vehicles";
import { MediaImage } from "@/components/media/MediaImage";
import { RateTable } from "@/components/fleet/RateTable";

export function VehicleCard({ entry }: { entry: WedisonEntry }) {
  return (
    <article className="vehicle-tile group">
      <Link href={`/fleet/${entry.modelSlug}`} aria-label={`View details for the ${entry.displayName}`} className="vehicle-photo">
        <MediaImage id={`fleet-${entry.modelSlug}-main`} fallbackLabel={`${entry.displayName} product photo`} ratio="3/2" fit="contain" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" />
      </Link>
      <div className="vehicle-info">
        <h3 className="font-display text-xl text-ink"><Link href={`/fleet/${entry.modelSlug}`}>{entry.displayName}</Link></h3>
        <p className="mt-2 min-h-10 text-sm leading-relaxed text-ink-soft">{entry.bestFor}</p>
        <RateTable modelSlug={entry.modelSlug} className="mt-5" />
        <div className="mt-auto pt-5">
          <Link href={`/book?vehicle=${entry.id}`} className="vehicle-cta">Check availability <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          <Link href={`/fleet/${entry.modelSlug}`} className="mt-2 flex min-h-11 items-center justify-center text-sm font-semibold text-primary">View details</Link>
        </div>
      </div>
    </article>
  );
}
