"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Film } from "lucide-react";
import { ContinueButton, EpisodeStatus } from "@/components/saga/SagaProgressUI";
import { SagaBikeCard } from "@/components/saga/SagaBikeCard";
import { LangToggle, StatLine } from "@/components/saga/SagaSocial";
import {
  characters,
  coverSrc,
  getEpisodes,
  getPages,
  modelNames,
  saga,
  totalPages,
  trailer,
  type SagaEpisode,
} from "@/data/saga";
import { formatCount, sagaUi } from "@/data/sagaUi";
import { useSagaLang } from "@/lib/useSagaLang";
import { useSagaStats } from "@/lib/useSagaStats";

const ACCENT = "#2ee0b0";

/** The /saga series page body, in English or Indonesian, with live counters. */
export function SagaSeries() {
  const lang = useSagaLang();
  const id = lang === "id";
  const t = sagaUi[lang];
  const stats = useSagaStats();
  const episodes = getEpisodes();
  const latest = episodes[episodes.length - 1];
  const lite = episodes.map((e) => ({ number: e.number, slug: e.slug, title: e.title, titleId: e.titleId }));
  const title = (e: SagaEpisode) => (id ? e.titleId : e.title);
  const totalViews = Object.values(stats.episodes).reduce((a, c) => a + c.views, 0);

  return (
    <div className="bg-[#0b100f] text-ink-inverse">
      {/* ================= HERO ================= */}
      <section aria-labelledby="saga-title" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_75%_30%,rgba(46,224,176,0.18),transparent_70%),radial-gradient(40%_40%_at_10%_90%,rgba(255,90,170,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 xl:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
              {t.webtoon}
            </p>
            <h1 id="saga-title" className="mt-4 font-display text-5xl leading-[0.95] text-white sm:text-6xl xl:text-7xl">
              WERIGO
              <br />
              <span style={{ color: ACCENT }}>SAGA</span>
            </h1>
            <div className="mt-5">
              <LangToggle />
            </div>
            <p className="mt-5 max-w-xl text-lg text-white/85 md:text-xl">{id ? saga.taglineId : saga.tagline}</p>
            {(id ? saga.synopsisId : saga.synopsis).map((p) => (
              <p key={p.slice(0, 20)} className="mt-4 max-w-xl leading-relaxed text-white/70">
                {p}
              </p>
            ))}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ContinueButton episodes={lite} />
              <a
                href="#episodes"
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-white/25 px-6 text-base font-semibold text-white hover:border-white/50"
              >
                {t.allEpisodes}
              </a>
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                [t.statEpisodes, String(episodes.length)],
                [t.statPages, String(totalPages())],
                ...(totalViews > 0 ? [[t.statReads, formatCount(totalViews, lang)]] : []),
                [t.statPrice, t.free],
                [t.statLanguage, t.languages],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider text-white/45">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[460px] lg:max-w-[520px]">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[32px] opacity-60 blur-3xl"
              style={{ background: `radial-gradient(closest-side, ${ACCENT}55, transparent)` }}
            />
            <div className="relative overflow-hidden rounded-[20px] border border-white/10 shadow-2xl">
              <Image
                src="/media/saga/keyart-raid.webp"
                alt="Arya, Dewa and Sekar on their Wedison bikes facing a giant storm over the sea at Uluwatu"
                width={1024}
                height={1536}
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="h-auto w-full"
              />
            </div>
            <Link
              href={`/saga/${latest.slug}`}
              className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-[14px] border border-white/15 bg-[#132a25]/95 p-2.5 shadow-xl backdrop-blur hover:border-white/30 sm:left-auto sm:right-[-12px] sm:w-72"
            >
              <Image src={coverSrc(latest)} alt="" width={56} height={56} className="h-14 w-14 rounded-[8px] object-cover" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
                  {t.newest}
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {t.episode} {latest.number}: {title(latest)}
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= TRAILER ================= */}
      {trailer.available ? (
        <section aria-labelledby="trailer-heading" className="border-t border-white/10">
          <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8 xl:px-10">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
                <Film className="h-4 w-4" aria-hidden="true" />
                {t.motionComic}
              </p>
              <h2 id="trailer-heading" className="mt-3 font-display text-3xl text-white md:text-4xl">
                {t.watchTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-white/70">
                {t.watchBody}
              </p>
              <Link
                href={`/saga/${episodes[0].slug}`}
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: ACCENT }}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {t.readEp(1)}
              </Link>
            </div>
            <div className="mx-auto w-[min(78vw,340px)] overflow-hidden rounded-[28px] border-[6px] border-[#1d2b28] bg-black shadow-2xl">
              <video
                controls
                playsInline
                preload="none"
                poster={trailer.poster}
                width={trailer.width}
                height={trailer.height}
                className="block aspect-[9/16] h-auto w-full"
                aria-label="WERIGO SAGA Episode 1 motion comic"
              >
                <source src={trailer.mp4} type="video/mp4" />
              </video>
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= EPISODES ================= */}
      <section id="episodes" aria-labelledby="episodes-heading" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8 xl:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
            {t.season1}
          </p>
          <h2 id="episodes-heading" className="mt-3 font-display text-3xl text-white md:text-4xl">
            {t.allEpisodes}
          </h2>
          <ol className="mt-10 grid gap-4 lg:grid-cols-2">
            {episodes.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/saga/${e.slug}`}
                  className="group flex h-full gap-4 rounded-[16px] border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.06] sm:gap-5 sm:p-4"
                >
                  <div className="relative w-28 shrink-0 overflow-hidden rounded-[12px] sm:w-40">
                    <Image
                      src={coverSrc(e)}
                      alt={`${t.episode} ${e.number}`}
                      width={320}
                      height={320}
                      sizes="(min-width: 640px) 160px, 112px"
                      className="aspect-square h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {e.slug === latest.slug ? (
                      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {t.newestTag}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                      {t.episode} {e.number} · {getPages(e).length} {t.pages}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-white sm:text-2xl">{title(e)}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/65">{id ? e.loglineId : e.logline}</p>
                    <StatLine slug={e.slug} className="mt-2" />
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      {e.featuredModels.map((m) => (
                        <span key={m} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/70">
                          {modelNames[m]}
                        </span>
                      ))}
                      <EpisodeStatus slug={e.slug} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= CHARACTERS ================= */}
      <section aria-labelledby="cast-heading" className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8 xl:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
            {t.riders}
          </p>
          <h2 id="cast-heading" className="mt-3 font-display text-3xl text-white md:text-4xl">
            {t.cast}
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <li key={c.id} className="flex gap-4 rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                <Image
                  src={`/media/saga/characters/${c.id}.webp`}
                  alt={c.name}
                  width={96}
                  height={96}
                  className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-white/10 sm:h-24 sm:w-24"
                />
                <div className="min-w-0">
                  <p className="font-display text-xl text-white">{c.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
                    {id ? c.roleId : c.role}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{id ? c.aboutId : c.about}</p>
                  {c.model ? (
                    <Link
                      href={`/fleet/${c.model}`}
                      className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-white hover:underline"
                    >
                      {t.rides(modelNames[c.model])}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-white/45">{id ? c.modelNoteId : c.modelNote}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= RIDE IT FOR REAL ================= */}
      <section aria-labelledby="real-heading" className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-20 lg:px-8 xl:px-10">
          <div className="grid items-center gap-10 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#123c34] to-[#0d1f1b] p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
                {t.realEyebrow}
              </p>
              <h2 id="real-heading" className="mt-3 font-display text-3xl text-white md:text-4xl">
                {t.realTitle}
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-white/75">
                {t.realBody}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-accent px-7 text-base font-semibold text-white hover:bg-accent-strong"
                >
                  {t.book}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/fleet"
                  className="inline-flex min-h-12 items-center rounded-[10px] border border-white/25 px-6 text-base font-semibold text-white hover:border-white/50"
                >
                  {t.seeFleet}
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4">
              {(["athena", "edpower", "victory", "bees"] as const).map((m) => (
                <li key={m}>
                  <SagaBikeCard model={m} />
                </li>
              ))}
            </ul>
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-white/45">{id ? saga.disclaimerId : saga.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}
