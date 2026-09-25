"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { formatCount, sagaUi } from "@/data/sagaUi";
import { hasLink } from "@/lib/sagaCommentFilter";
import { useSagaLang, type SagaLang } from "@/lib/useSagaLang";

interface Comment {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  lang: SagaLang;
}

interface Props {
  episode: number;
  prompt?: { en: string; id: string };
}

const NAME_MAX = 40;
const TEXT_MAX = 600;
const PAGE = 20;
const NAME_KEY = "werigo-saga-name";

type Status = "idle" | "loading" | "ready" | "error";

function relativeTime(iso: string, now: number, lang: SagaLang) {
  const t = sagaUi[lang];
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((now - then) / 60000));
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return t.daysAgo(days);
  const d = new Date(then);
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  });
}

/**
 * Reader comments under each episode. Loads when the section comes near
 * the screen, posts through /api/saga/comments and shows plain text only.
 */
export function SagaComments({ episode, prompt }: Props) {
  const lang = useSagaLang();
  const t = sagaUi[lang];
  const sectionRef = useRef<HTMLElement>(null);
  const started = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  const fetchPage = useCallback(
    async (offset: number) => {
      const res = await fetch(`/api/saga/comments?episode=${episode}&limit=${PAGE}&offset=${offset}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { comments: Comment[]; total: number; hasMore: boolean };
    },
    [episode],
  );

  const start = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      if (saved) setName((n) => n || saved.slice(0, NAME_MAX));
    } catch {
      /* storage blocked */
    }
    setStatus("loading");
    try {
      const d = await fetchPage(0);
      setComments(d.comments);
      setTotal(d.total);
      setHasMore(d.hasMore);
      setNow(Date.now());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [fetchPage]);

  // Load when the section is close to the screen, not on every page view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(start, 0);
      return () => clearTimeout(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [start]);

  // Keep "5 min ago" honest while the page stays open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!thanks) return;
    const id = setTimeout(() => setThanks(false), 4000);
    return () => clearTimeout(id);
  }, [thanks]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await fetchPage(comments.length);
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...d.comments.filter((c) => !seen.has(c.id))];
      });
      setTotal(d.total);
      setHasMore(d.hasMore);
    } catch {
      /* keep what we have; the button stays for another try */
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setThanks(false);
    const cleanName = name.trim();
    const cleanText = text.trim();
    if (!cleanName || !cleanText) {
      setError(t.commentErrMissing);
      return;
    }
    if (hasLink(cleanName) || hasLink(cleanText)) {
      setError(t.commentErrLink);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/saga/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode, name: cleanName, text: cleanText, website, lang }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; comment?: Comment };
      if (res.ok && d.ok && d.comment) {
        const posted = d.comment;
        setComments((prev) => [posted, ...prev.filter((c) => c.id !== posted.id)]);
        setTotal((n) => n + 1);
        setStatus("ready");
        setNow(Date.now());
        setText("");
        setThanks(true);
        try {
          window.localStorage.setItem(NAME_KEY, cleanName);
        } catch {
          /* storage blocked */
        }
        return;
      }
      if (res.status === 429) setError(t.commentErrFast);
      else if (d.error === "has_link") setError(t.commentErrLink);
      else if (d.error === "not_allowed") setError(t.commentErrWords);
      else if (d.error === "invalid_request") setError(t.commentErrMissing);
      else setError(t.commentErrGeneric);
    } catch {
      setError(t.commentErrGeneric);
    } finally {
      setSending(false);
    }
  };

  const heading = status === "ready" && total > 0 ? t.commentsCount(formatCount(total, lang)) : t.comments;
  const inputCls =
    "w-full rounded-[10px] border border-white/15 bg-white/[0.06] px-3 text-base text-white placeholder:text-white/40 focus:border-[#2ee0b0] focus:outline-none focus:ring-2 focus:ring-[#2ee0b0]/40";

  return (
    <section
      ref={sectionRef}
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-12 scroll-mt-20 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 sm:p-6"
    >
      <h2 id="comments-heading" className="flex items-center gap-2 font-display text-2xl text-white">
        <MessageCircle className="h-6 w-6 text-[#2ee0b0]" aria-hidden="true" />
        {heading}
      </h2>

      {prompt ? (
        <div className="mt-4 rounded-[12px] border-l-4 border-[#2ee0b0] bg-[#2ee0b0]/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2ee0b0]">{t.commentPromptLabel}</p>
          <p className="mt-1 font-display text-lg leading-snug text-white sm:text-xl">
            {lang === "id" ? prompt.id : prompt.en}
          </p>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="relative mt-5 space-y-3">
        {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor={`saga-website-${episode}`}>Website</label>
          <input
            id={`saga-website-${episode}`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor={`saga-name-${episode}`} className="mb-1.5 block text-sm font-semibold text-white/85">
            {t.commentName}
          </label>
          <input
            id={`saga-name-${episode}`}
            name="name"
            type="text"
            required
            maxLength={NAME_MAX}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputCls} min-h-11`}
          />
        </div>

        <div>
          <label htmlFor={`saga-text-${episode}`} className="mb-1.5 block text-sm font-semibold text-white/85">
            {t.commentText}
          </label>
          <textarea
            id={`saga-text-${episode}`}
            name="comment"
            required
            rows={4}
            maxLength={TEXT_MAX}
            placeholder={t.commentPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={`saga-count-${episode} saga-note-${episode}`}
            className={`${inputCls} block resize-y py-2.5 leading-relaxed`}
          />
          <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
            <p id={`saga-note-${episode}`} className="text-white/55">
              {t.commentsNote}
            </p>
            <p
              id={`saga-count-${episode}`}
              className={`tabular-nums ${text.length >= TEXT_MAX ? "text-[#ffb36b]" : "text-white/55"}`}
            >
              <span aria-hidden="true">
                {text.length}/{TEXT_MAX}
              </span>
              <span className="sr-only">{t.commentChars(text.length, TEXT_MAX)}</span>
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-[10px] border border-[#ff7a7a]/40 bg-[#ff7a7a]/10 px-3 py-2 text-sm text-[#ffc2c2]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-[#2ee0b0] px-5 text-sm font-semibold text-[#06201a] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {sending ? t.commentPosting : t.commentPost}
          </button>
          <p role="status" className="text-sm font-medium text-[#9ff0d6]">
            {thanks ? t.commentThanks : ""}
          </p>
        </div>
      </form>

      <div className="mt-6 border-t border-white/10 pt-5">
        {status === "loading" || status === "idle" ? (
          <p className="text-sm text-white/55">{t.commentsLoading}</p>
        ) : status === "error" && comments.length === 0 ? (
          <p className="text-sm text-white/55">{t.commentsLoadError}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-white/70">{t.commentsEmpty}</p>
        ) : (
          <ol className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2ee0b0]/15 text-sm font-bold uppercase text-[#2ee0b0]"
                >
                  {Array.from(c.name)[0] ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="break-words font-semibold text-white">{c.name}</span>
                    <time dateTime={c.createdAt} className="text-xs text-white/45">
                      {relativeTime(c.createdAt, now, lang)}
                    </time>
                  </p>
                  <p lang={c.lang} className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-white/80">
                    {c.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-white/20 px-4 text-sm font-semibold text-white/90 hover:border-white/40 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMore ? t.commentsLoading : t.commentsMore}
          </button>
        ) : null}
      </div>
    </section>
  );
}
