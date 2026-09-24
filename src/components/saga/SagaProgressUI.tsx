"use client";

import Link from "next/link";
import { BookOpen, Check } from "lucide-react";
import { useSagaProgress } from "@/lib/useSagaProgress";
import { useSagaLang } from "@/lib/useSagaLang";
import { sagaUi } from "@/data/sagaUi";

interface EpisodeLite {
  number: number;
  slug: string;
  title: string;
}

/** "Start Episode 1", or "Continue Episode N" once this browser has progress. */
export function ContinueButton({ episodes }: { episodes: EpisodeLite[] }) {
  const progress = useSagaProgress();
  const t = sagaUi[useSagaLang()];
  const first = episodes[0];
  let target = first;
  let label = t.startEp(first.number);
  if (progress?.last) {
    const last = episodes.find((e) => e.slug === progress.last);
    if (last) {
      const finished = progress.done.includes(last.slug);
      const idx = episodes.indexOf(last);
      const nextUp = finished ? episodes[idx + 1] : last;
      if (nextUp) {
        target = nextUp;
        label = finished ? t.readEp(nextUp.number) : t.continueEp(nextUp.number);
      }
    }
  }
  return (
    <Link
      href={`/saga/${target.slug}`}
      className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#2ee0b0] px-7 text-base font-semibold text-[#06201a] transition-colors hover:bg-[#5ff0c8]"
    >
      <BookOpen className="h-5 w-5" aria-hidden="true" />
      {label}
    </Link>
  );
}

/** Small status line on an episode card: Read / percentage / nothing. */
export function EpisodeStatus({ slug }: { slug: string }) {
  const progress = useSagaProgress();
  const t = sagaUi[useSagaLang()];
  if (!progress) return null;
  if (progress.done.includes(slug)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#2ee0b0]/15 px-2.5 py-1 text-xs font-semibold text-[#2ee0b0]">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {t.read}
      </span>
    );
  }
  const pos = progress.pos[slug];
  if (pos && pos > 0.02) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/70">
        <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 bg-[#2ee0b0]" style={{ width: `${Math.round(pos * 100)}%` }} />
        </span>
        {t.pctRead(Math.round(pos * 100))}
      </span>
    );
  }
  return null;
}
