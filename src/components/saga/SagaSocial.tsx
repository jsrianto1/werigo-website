"use client";

import { useEffect, useState } from "react";
import { Droplet, Eye, Flame, Glasses, Heart, Laugh, Link2, Share2, Zap, type LucideIcon } from "lucide-react";
import { REACTIONS, type ReactionId, type ShareChannel } from "@/data/sagaReactions";
import { formatCount, sagaUi } from "@/data/sagaUi";
import { setSagaLang, useSagaLang, type SagaLang } from "@/lib/useSagaLang";
import { countsFor, react, recordShare, totalReactions, useSagaStats } from "@/lib/useSagaStats";

const ICONS: Record<ReactionId, LucideIcon> = {
  love: Heart,
  fire: Flame,
  cool: Glasses,
  haha: Laugh,
  touched: Droplet,
  hype: Zap,
};

/** EN | ID switch. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useSagaLang();
  const t = sagaUi[lang];
  const opt = (l: SagaLang, label: string) => (
    <button
      type="button"
      onClick={() => setSagaLang(l)}
      aria-pressed={lang === l}
      className={`min-h-9 min-w-9 cursor-pointer rounded-full px-2.5 text-xs font-bold tracking-wider transition-colors ${
        lang === l ? "bg-[#2ee0b0] text-[#06201a]" : "text-white/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={t.langLabel} className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 ${className}`}>
      {opt("en", "EN")}
      {opt("id", "ID")}
    </div>
  );
}

/** Compact "views · reactions" line for toolbars and cards. */
export function StatLine({ slug, className = "" }: { slug: string; className?: string }) {
  const lang = useSagaLang();
  const stats = useSagaStats();
  if (!stats.loaded) return null;
  const c = countsFor(slug);
  const total = totalReactions(c);
  return (
    <span className={`inline-flex items-center gap-3 text-xs font-semibold text-white/65 ${className}`}>
      {c.views > 0 ? (
        <span className="inline-flex items-center gap-1" title={sagaUi[lang].views(formatCount(c.views, lang))}>
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{sagaUi[lang].views("")}</span>
          {formatCount(c.views, lang)}
        </span>
      ) : null}
      {total > 0 ? (
        <span className="inline-flex items-center gap-1" title={sagaUi[lang].reactions(formatCount(total, lang))}>
          <Heart className="h-3.5 w-3.5 text-[#ff5c8a]" aria-hidden="true" />
          <span className="sr-only">{sagaUi[lang].reactions("")}</span>
          {formatCount(total, lang)}
        </span>
      ) : null}
      {c.shares > 0 ? (
        <span className="inline-flex items-center gap-1" title={sagaUi[lang].shares(formatCount(c.shares, lang))}>
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{sagaUi[lang].shares("")}</span>
          {formatCount(c.shares, lang)}
        </span>
      ) : null}
    </span>
  );
}

/** Six reactions, one per browser, with live counts. */
export function ReactionBar({ slug }: { slug: string }) {
  const lang = useSagaLang();
  const t = sagaUi[lang];
  const stats = useSagaStats();
  const c = countsFor(slug);
  const mine = stats.mine[slug] ?? null;
  const total = totalReactions(c);
  return (
    <section aria-labelledby="react-heading" className="mt-10 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="react-heading" className="font-display text-2xl text-white">
            {t.howWas}
          </h2>
          <p className="mt-1 text-sm text-white/55">{t.reactHint}</p>
        </div>
        <p className="text-sm font-semibold text-white/70">
          {stats.loaded ? (total > 0 ? t.reactions(formatCount(total, lang)) : t.firstReact) : " "}
        </p>
      </div>
      <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {REACTIONS.map((r) => {
          const Icon = ICONS[r.id];
          const on = mine === r.id;
          const n = c.reactions[r.id] ?? 0;
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => react(slug, on ? null : r.id)}
                className={`group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-[14px] border px-2 py-3 transition-all duration-200 ${
                  on ? "scale-[1.03] bg-white/[0.08]" : "border-white/10 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05]"
                }`}
                style={on ? { borderColor: r.color, boxShadow: `0 0 22px ${r.color}40` } : undefined}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-active:scale-90"
                  style={{ background: `${r.color}${on ? "33" : "1f"}`, color: r.color }}
                >
                  <Icon className="h-6 w-6" fill={on ? "currentColor" : "none"} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-white">{lang === "id" ? r.idn : r.en}</span>
                <span className="tnum text-xs font-semibold text-white/55">{stats.loaded ? formatCount(n, lang) : " "}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm4.52 11.99c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.47A20.6 20.6 0 0 0 14.3 4.3c-2.25 0-3.8 1.37-3.8 3.9v2.3H8v3h2.5V21h3Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.84-6.32L5.45 21H2.38l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.72H5.58L16.67 19.2Z" />
    </svg>
  );
}

/** Share buttons with a live share count. */
export function ShareBar({ slug, title }: { slug: string; title: string }) {
  const lang = useSagaLang();
  const t = sagaUi[lang];
  const stats = useSagaStats();
  const c = countsFor(slug);
  const [toast, setToast] = useState<string | null>(null);
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const url = () => `${window.location.origin}/saga/${slug}${lang === "id" ? "?lang=id" : ""}`;
  const text = lang === "id" ? `Baca ${title} di WERIGO SAGA, webtoon dari Bali` : `Read ${title} of WERIGO SAGA, a Bali webtoon`;

  const go = (channel: ShareChannel) => {
    const u = encodeURIComponent(url());
    const tx = encodeURIComponent(text);
    const links: Partial<Record<ShareChannel, string>> = {
      whatsapp: `https://wa.me/?text=${tx}%20${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://x.com/intent/post?text=${tx}&url=${u}`,
    };
    const href = links[channel];
    if (href) window.open(href, "_blank", "noopener,noreferrer");
    recordShare(slug, channel);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setToast(t.linkCopied);
      recordShare(slug, "copy");
    } catch {
      /* clipboard blocked */
    }
  };

  const native = async () => {
    try {
      await navigator.share({ title: text, url: url() });
      recordShare(slug, "native");
    } catch {
      /* share sheet closed */
    }
  };

  const btn =
    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/90 transition-colors hover:border-white/40";

  return (
    <div className="mt-6 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{t.shareTo}</p>
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {stats.loaded ? t.shares(formatCount(c.shares, lang)) : " "}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => go("whatsapp")} className={`${btn} hover:text-[#25D366]`}>
          <WhatsAppGlyph /> WhatsApp
        </button>
        <button type="button" onClick={() => go("facebook")} className={`${btn} hover:text-[#4c8dff]`}>
          <FacebookGlyph /> Facebook
        </button>
        <button type="button" onClick={() => go("x")} className={btn}>
          <XGlyph /> X
        </button>
        <button type="button" onClick={copy} className={btn}>
          <Link2 className="h-4 w-4" aria-hidden="true" /> {t.copyLink}
        </button>
        {canNative ? (
          <button type="button" onClick={native} className={btn}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> {t.more}
          </button>
        ) : null}
      </div>
      {toast ? (
        <p role="status" className="mt-3 text-sm font-semibold text-[#2ee0b0]">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
