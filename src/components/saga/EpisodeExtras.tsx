"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SagaBikeCard } from "@/components/saga/SagaBikeCard";
import { saga, type SagaModel } from "@/data/saga";
import { sagaUi } from "@/data/sagaUi";
import { useSagaLang } from "@/lib/useSagaLang";

interface Beat {
  label: string;
  text: string;
  lines: { who: string; text: string }[];
}

/** End-of-episode extras: the bikes in the episode, the transcript and the fiction note. */
export function EpisodeExtras({ models, transcript }: { models: SagaModel[]; transcript: Beat[] }) {
  const lang = useSagaLang();
  const t = sagaUi[lang];
  return (
    <>
      <section aria-labelledby="ride-heading" className="mt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2ee0b0]">{t.bikesReal}</p>
        <h2 id="ride-heading" className="mt-2 font-display text-2xl text-white sm:text-3xl">
          {t.rideWhat}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{t.rideBody}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {models.map((m) => (
            <li key={m}>
              <SagaBikeCard model={m} compact sub={t.seeRates} />
            </li>
          ))}
        </ul>
        <Link
          href="/book"
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          {t.book}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {transcript.length ? (
        <details className="group mt-12 rounded-[14px] border border-white/10 bg-white/[0.03]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-white/85 sm:px-5">
            {t.transcript}
            <span className="text-white/50 transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <div lang="en" className="border-t border-white/10 px-4 pb-6 pt-4 text-sm leading-relaxed text-white/75 sm:px-5">
            {transcript.map((beat, i) => (
              <div key={i} className="mt-4 first:mt-0">
                <p>
                  <span className="font-semibold text-white">{beat.label}.</span> {beat.text}
                </p>
                {beat.lines.length ? (
                  <ul className="mt-1.5 space-y-1 border-l border-white/15 pl-3">
                    {beat.lines.map((l, j) => (
                      <li key={j}>
                        {l.who ? <span className="font-semibold text-[#9ff0d6]">{l.who}: </span> : null}
                        {l.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <p className="mt-8 text-xs leading-relaxed text-white/45">{lang === "id" ? saga.disclaimerId : saga.disclaimer}</p>
    </>
  );
}
