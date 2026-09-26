"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { saveProgress } from "@/lib/sagaProgress";
import { notifySagaProgress, useSagaProgress } from "@/lib/useSagaProgress";
import { useSagaLang } from "@/lib/useSagaLang";
import { recordShare, recordView } from "@/lib/useSagaStats";
import { sagaUi } from "@/data/sagaUi";
import { LangToggle, ReactionBar, ShareBar, StatLine } from "@/components/saga/SagaSocial";

export interface ReaderEpisodeRef {
  number: number;
  slug: string;
  key: string; // stable stats/progress id ("episode-N")
  title: string;
  titleId: string;
  cover: string;
}

interface Props {
  episode: ReaderEpisodeRef;
  pages: { src: string; width: number; height: number }[];
  prev: ReaderEpisodeRef | null;
  next: ReaderEpisodeRef | null;
  episodes: ReaderEpisodeRef[];
  children?: React.ReactNode; // end-of-episode extras rendered on the server
}

/**
 * Vertical webtoon reader: one continuous strip, a toolbar that hides
 * while you scroll down and returns when you scroll up, a thin progress
 * bar, resume-where-you-stopped, and arrow-key episode navigation.
 */
export function SagaReader({ episode, pages, prev, next, episodes, children }: Props) {
  const router = useRouter();
  const stripRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [barHidden, setBarHidden] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saved = useSagaProgress();
  const lang = useSagaLang();
  const t = sagaUi[lang];
  const titleOf = (e: ReaderEpisodeRef) => (lang === "id" ? e.titleId : e.title);
  const pageSrc = (src: string) => (lang === "id" ? src.replace("/media/saga/ep-", "/media/saga/id/ep-") : src);
  const savedPos = saved?.pos[episode.key] ?? 0;
  const showResume = !dismissed && progress < 0.03 && savedPos > 0.04 && savedPos < 0.95;

  const fractionToTop = useCallback((f: number) => {
    const el = stripRef.current;
    if (!el) return 0;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return top + f * Math.max(0, el.offsetHeight - window.innerHeight);
  }, []);

  // Scroll: progress bar, auto-hiding toolbar, throttled progress save.
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = stripRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const span = Math.max(1, rect.height - window.innerHeight);
        const f = Math.min(1, Math.max(0, -rect.top / span));
        setProgress(f);
        const y = window.scrollY;
        if (y < 160 || f >= 0.995) setBarHidden(false);
        else if (y > lastY + 6) setBarHidden(true);
        else if (y < lastY - 6) setBarHidden(false);
        lastY = y;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          if (f > 0.01) {
            saveProgress(episode.key, f);
            notifySagaProgress();
          }
        }, 600);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(saveTimer);
    };
  }, [episode.key]);

  // Count a view once the reader has stayed a few seconds.
  useEffect(() => {
    const id = setTimeout(() => recordView(episode.key), 3000);
    return () => clearTimeout(id);
  }, [episode.key]);

  // Arrow keys move between episodes (ignored while typing or choosing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" && next) router.push(`/saga/${next.slug}`);
      if (e.key === "ArrowLeft" && prev) router.push(`/saga/${prev.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const share = async () => {
    const url = `${window.location.origin}/saga/${episode.slug}${lang === "id" ? "?lang=id" : ""}`;
    const title = `WERIGO SAGA Chapter ${episode.number}: ${titleOf(episode)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        recordShare(episode.key, "native");
        return;
      }
      await navigator.clipboard.writeText(url);
      recordShare(episode.key, "copy");
      setToast(t.linkCopied);
    } catch {
      /* share sheet closed */
    }
  };

  const reduceMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="bg-[#0b100f] text-ink-inverse">
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5" aria-hidden="true">
        <div
          className="h-full origin-left bg-[#2ee0b0] transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Toolbar */}
      <div
        className={`sticky top-0 z-50 border-b border-white/10 bg-[#0b100f]/95 backdrop-blur-sm transition-transform duration-300 ${
          barHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-2 px-3 sm:px-5">
          <Link
            href="/saga"
            className="flex min-h-11 items-center gap-1 rounded-md pr-2 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden md:inline">WERIGO SAGA</span>
            <span className="md:hidden">Saga</span>
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />
          <label className="sr-only" htmlFor="saga-episode-select">
            {t.chooseEpisode}
          </label>
          <select
            id="saga-episode-select"
            value={episode.slug}
            onChange={(e) => router.push(`/saga/${e.target.value}`)}
            className="min-h-11 min-w-0 flex-1 cursor-pointer truncate rounded-md border border-white/15 bg-white/5 px-3 text-sm font-medium text-white sm:max-w-sm"
          >
            {episodes.map((e) => (
              <option key={e.slug} value={e.slug} className="bg-[#0b100f]">
                {t.episode} {e.number}: {titleOf(e)}
              </option>
            ))}
          </select>
          <div className="hidden shrink-0 lg:block">
            <StatLine slug={episode.key} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LangToggle className="mr-1" />
            <NavButton href={prev ? `/saga/${prev.slug}` : null} label={t.prevEp}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </NavButton>
            <NavButton href={next ? `/saga/${next.slug}` : null} label={t.nextEp}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </NavButton>
            <button
              type="button"
              onClick={share}
              aria-label={t.shareEp}
              className="hidden min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white sm:flex"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Strip */}
      <div
        ref={stripRef}
        className="mx-auto w-full max-w-[800px] bg-white shadow-[0_0_80px_rgba(0,0,0,0.6)]"
        aria-label={`${t.episode} ${episode.number} comic pages`}
      >
        {pages.map((p, i) => (
          // Pages are pre-sized WebP slices of one strip; plain img keeps them seamless and lazy.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={pageSrc(p.src)}
            src={pageSrc(p.src)}
            width={p.width}
            height={p.height}
            alt={`WERIGO SAGA ${t.episode} ${episode.number}, ${lang === "id" ? "halaman" : "page"} ${i + 1} / ${pages.length}`}
            loading={i < 2 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
            className="block h-auto w-full select-none"
            draggable={false}
          />
        ))}
      </div>

      {/* End of episode */}
      <div className="mx-auto max-w-[800px] px-4 pb-16 pt-12 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          {t.endOf(episode.number)}
        </p>

        {next ? (
          <Link
            href={`/saga/${next.slug}`}
            className="group mt-6 flex items-center gap-4 rounded-[14px] border border-[#2ee0b0]/40 bg-[#2ee0b0]/10 p-3 transition-colors hover:bg-[#2ee0b0]/15"
          >
            <Image
              src={next.cover}
              alt=""
              width={96}
              height={96}
              className="h-20 w-20 shrink-0 rounded-[10px] object-cover sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2ee0b0]">
                {t.nextEpisode}
              </p>
              <p className="mt-1 font-display text-xl text-white sm:text-2xl">
                {t.episode} {next.number}: {titleOf(next)}
              </p>
            </div>
            <ArrowRight
              className="mr-2 h-6 w-6 shrink-0 text-[#2ee0b0] transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <div className="mt-6 rounded-[14px] border border-white/15 bg-white/5 p-5 text-center">
            <p className="font-display text-2xl text-white">{t.caughtUp}</p>
            <p className="mt-2 text-sm text-white/70">
              {t.caughtUpBody}
            </p>
            <a
              href="https://www.instagram.com/werigo.official/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-white/25 px-5 text-sm font-semibold text-white hover:border-[#2ee0b0] hover:text-[#2ee0b0]"
            >
              {t.follow}
            </a>
          </div>
        )}

        <ReactionBar slug={episode.key} />
        <ShareBar slug={episode.key} path={episode.slug} title={`${t.episode} ${episode.number}: ${titleOf(episode)}`} />

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/saga#chapters"
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-white/20 px-4 text-sm font-semibold text-white/90 hover:border-white/40"
          >
            <LayoutList className="h-4 w-4" aria-hidden="true" />
            {t.allEpisodes}
          </Link>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" })}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-white/20 px-4 text-sm font-semibold text-white/90 hover:border-white/40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            {t.backToTop}
          </button>
        </div>

        {children}

        {/* Episode rail */}
        <nav aria-label={t.allEpisodes} className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">{t.episodes}</p>
          <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {episodes.map((e) => {
              const current = e.slug === episode.slug;
              const done = saved?.done.includes(e.key);
              return (
                <li key={e.slug} className="w-32 shrink-0 snap-start sm:w-36">
                  <Link
                    href={`/saga/${e.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-[12px] p-1.5 transition-colors ${
                      current ? "bg-[#2ee0b0]/15 ring-2 ring-[#2ee0b0]" : "hover:bg-white/5"
                    }`}
                  >
                    <Image
                      src={e.cover}
                      alt=""
                      width={144}
                      height={144}
                      className="aspect-square w-full rounded-[8px] object-cover"
                    />
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      {t.episode} {e.number}
                      {done ? ` · ${t.read}` : ""}
                    </p>
                    <p className="line-clamp-2 text-sm font-medium text-white">{titleOf(e)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Resume chip */}
      {showResume ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-2 rounded-full border border-white/15 bg-[#132a25] py-1.5 pl-4 pr-1.5 text-sm text-white shadow-2xl lg:bottom-8"
        >
          <span className="flex-1">{t.resumeAt(Math.round(savedPos * 100))}</span>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              window.scrollTo({ top: fractionToTop(savedPos), behavior: reduceMotion() ? "auto" : "smooth" });
            }}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#2ee0b0] px-4 font-semibold text-[#06201a]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.resume}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t.startOver}
            className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-xl lg:bottom-8"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function NavButton({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/80 transition-colors";
  if (!href) {
    return (
      <span aria-hidden="true" className={`${cls} opacity-30`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${cls} hover:bg-white/10 hover:text-white`}>
      {children}
    </Link>
  );
}
