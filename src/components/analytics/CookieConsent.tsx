"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  onOpenCookieSettings,
  saveConsent,
  subscribeConsent,
  type ConsentAction,
  type ConsentChoice,
} from "@/lib/consent";

type Category = "necessary" | keyof ConsentChoice;
const CATEGORIES: { id: Category; title: string; desc: string }[] = [
  {
    id: "necessary",
    title: "Necessary",
    desc: "Sign-in, security, your language and your booking form. The site cannot work without these.",
  },
  {
    id: "analytics",
    title: "Analytics",
    desc: "Google Analytics, loaded through Google Tag Manager. Shows us which pages people use so we can improve them.",
  },
  {
    id: "marketing",
    title: "Marketing",
    desc: "The Meta Pixel and the advertising features of Google Analytics. Tell us which of our ads bring visitors to Werigo.",
  },
];

/**
 * Cookie banner and preferences dialog. "Reject optional" and "Accept all"
 * carry equal visual weight, and the banner stays until the visitor
 * chooses. Google Tag Manager and the Meta Pixel are not requested
 * before that choice (see src/lib/consent.ts).
 */
export function CookieConsent() {
  const { locale } = useLanguage();
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>({ analytics: false, marketing: false });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      onOpenCookieSettings(() => {
        const c = getConsentSnapshot();
        setDraft({ analytics: !!c?.analytics, marketing: !!c?.marketing });
        setOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const decide = (choice: ConsentChoice, action: ConsentAction) => {
    saveConsent(choice, action, locale);
    setOpen(false);
  };
  const acceptAll = () => decide({ analytics: true, marketing: true }, "accept_all");
  const rejectAll = () => decide({ analytics: false, marketing: false }, "reject_all");
  const saveDraft = () =>
    decide(
      draft,
      draft.analytics && draft.marketing ? "accept_all" : !draft.analytics && !draft.marketing ? "reject_all" : "custom",
    );

  // undefined = server render or before hydration: render nothing, no banner flash.
  const showBanner = consent === null && !open;

  return (
    <>
      {showBanner ? (
        <section
          aria-labelledby="cookie-banner-title"
          className="fixed inset-x-3 bottom-3 z-[130] mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[0_24px_60px_-20px_rgba(10,30,40,0.45)] sm:left-6 sm:right-auto sm:bottom-6 sm:mx-0"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-faint text-primary">
              <Cookie className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 id="cookie-banner-title" className="font-display text-base text-ink">
              <T>{"Cookies on Werigo"}</T>
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            <T>{"We use cookies that keep the site working. With your permission we also use Google Analytics to see how the site is used and the Meta Pixel to measure our ads. Neither runs until you choose."}</T>{" "}
            <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
              <T>{"Read our privacy policy"}</T>
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={rejectAll}>
              <T>{"Reject optional"}</T>
            </Button>
            <Button onClick={acceptAll}>
              <T>{"Accept all"}</T>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft({ analytics: false, marketing: false });
              setOpen(true);
            }}
            className="mt-2 w-full cursor-pointer py-1.5 text-center text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            <T>{"Choose cookies"}</T>
          </button>
        </section>
      ) : null}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cookie-settings-title"
            >
              <button
                type="button"
                aria-label="Close"
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className="absolute inset-0 h-full w-full cursor-default bg-black/50"
              />
              <div className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-page shadow-2xl sm:rounded-[20px]">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 id="cookie-settings-title" className="font-display text-xl text-ink">
                    <T>{"Cookie settings"}</T>
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-sunken"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    <T>{"Choose which optional cookies we may use. You can change this at any time with Cookie settings at the bottom of every page."}</T>
                  </p>
                  <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
                    {CATEGORIES.map((cat) => {
                      const locked = cat.id === "necessary";
                      const checked = cat.id === "necessary" ? true : draft[cat.id];
                      const id = `cookie-${cat.id}`;
                      return (
                        <li key={cat.id} className="flex items-start justify-between gap-4 p-4">
                          <label htmlFor={id} className={locked ? "" : "cursor-pointer"}>
                            <span className="block text-sm font-semibold text-ink">
                              <T>{cat.title}</T>
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                              <T>{cat.desc}</T>
                            </span>
                            {locked ? (
                              <span className="mt-1.5 inline-block text-xs font-semibold uppercase tracking-wider text-primary">
                                <T>{"Always on"}</T>
                              </span>
                            ) : null}
                          </label>
                          <button
                            id={id}
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            disabled={locked}
                            onClick={() => {
                              if (cat.id !== "necessary") setDraft((d) => ({ ...d, [cat.id]: !d[cat.id as keyof ConsentChoice] }));
                            }}
                            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${
                              checked ? "bg-primary" : "bg-line-strong"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                checked ? "translate-x-[22px]" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-line px-5 py-4 sm:grid-cols-3">
                  <Button variant="outline" onClick={rejectAll}>
                    <T>{"Reject optional"}</T>
                  </Button>
                  <Button variant="outline" onClick={saveDraft}>
                    <T>{"Save choices"}</T>
                  </Button>
                  <Button onClick={acceptAll}>
                    <T>{"Accept all"}</T>
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
