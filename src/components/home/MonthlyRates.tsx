
import { T } from "@/components/i18n/LanguageProvider";
import Image from "next/image";
import Link from "next/link";
import { getPrimaryCards } from "@/data/vehicles";
import { ratesIdrPerDay, formatIdr } from "@/lib/pricing";

export function MonthlyRates() {
  return (
    <div className="monthly-rates">
      {getPrimaryCards().map((entry) => (
        <Link key={entry.id} href={`/book?vehicle=${entry.id}&duration=monthly`} className="monthly-rate">
          <Image src={`/media/fleet/${entry.modelSlug}/catalog.webp`} alt={entry.displayName} width={100} height={84} className="monthly-bike" sizes="80px" />
          <span className="font-semibold">{entry.displayName}</span>
          <span className="text-right"><strong className="tnum block font-display text-xl">{formatIdr(ratesIdrPerDay[entry.modelSlug].monthly)}</strong><span className="text-xs text-ink-soft"><T>{"per day, monthly tier"}</T></span></span>
        </Link>
      ))}
      <p className="mt-5 text-xs leading-relaxed text-ink-soft"><T>{"Monthly tier applies to rentals of 1 month or longer. Total is based on your actual dates. Airport fees and optional extras are separate."}</T></p>
    </div>
  );
}
