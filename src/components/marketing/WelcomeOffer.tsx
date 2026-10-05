"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { authClient } from "@/lib/auth-client";
import { formatIdr } from "@/lib/pricing";

/** The featured campaign, from /api/promotions/featured (managed in /admin/promotions). */
interface FeaturedPromotion {
  title: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  firstBookingOnly: boolean;
  endsAt: string | null;
}

const fmtEnds = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "long", year: "numeric" });

/**
 * Welcome offer for visitors without an account: a slim bar above the
 * header on every marketing page, plus a one-time pop-up (snoozed for
 * 7 days after "Maybe later"). Signed-in customers never see it; the
 * discount itself is applied by the server at checkout.
 */
const MODAL_KEY = "werigo.welcome20.snoozedUntil";
const BAR_KEY = "werigo.welcome20.barClosed";
const SNOOZE_DAYS = 7;
const HIDDEN_PREFIXES = ["/account", "/admin", "/book/checkout", "/book/confirmation", "/saga/"];

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function WelcomeOffer() {
  const pathname = usePathname();
  const { data, isPending } = authClient.useSession();
  const [bar, setBar] = useState(false);
  const [modal, setModal] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const registerHref = "/account/login?mode=register&next=/book";

  const [promo, setPromo] = useState<FeaturedPromotion | null>(null);
  const hiddenHere = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const audience = !isPending && !data?.user && !hiddenHere;

  // Load the featured campaign once, only for visitors who could see it.
  useEffect(() => {
    if (!audience || promo) return;
    let cancelled = false;
    fetch("/api/promotions/featured")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.promotion) setPromo(d.promotion);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audience, promo]);

  const eligible = audience && promo !== null;
  const valueLabel = promo ? (promo.discountType === "percent" ? `${promo.discountValue}%` : formatIdr(promo.discountValue)) : "";
  const endsLabel = promo?.endsAt ? fmtEnds(promo.endsAt) : null;

  useEffect(() => {
    if (!eligible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBar(false);
      setModal(false);
      return;
    }
    setBar(storage("session")?.getItem(BAR_KEY) !== "1");
    const until = Number(storage("local")?.getItem(MODAL_KEY) ?? 0);
    if (until > Date.now()) return;
    const id = setTimeout(() => setModal(true), 1200);
    return () => clearTimeout(id);
  }, [eligible]);

  useEffect(() => {
    if (!modal) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") snooze();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modal]);

  function snooze() {
    storage("local")?.setItem(MODAL_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    setModal(false);
  }

  function closeBar() {
    storage("session")?.setItem(BAR_KEY, "1");
    setBar(false);
  }

  if (!eligible) return null;

  return (
    <>
      {bar ? (
        <div className="relative bg-primary-strong text-white">
          <div className="mx-auto flex min-h-10 w-full max-w-[1400px] items-center justify-center gap-x-3 gap-y-1 px-12 py-2 text-center text-xs font-medium sm:text-sm">
            <span>
              <T>{promo!.title}</T>: {valueLabel} <T>{promo!.firstBookingOnly ? "off your first rental" : "off your rental"}</T>
              {endsLabel ? <span className="hidden sm:inline"> · <T>{"Ends"}</T> {endsLabel}</span> : null}
            </span>
            <Link href={registerHref} className="whitespace-nowrap font-semibold underline underline-offset-4 hover:text-white/80">
              <T>{"Sign up & save"}</T> →
            </Link>
          </div>
          <button
            type="button"
            onClick={closeBar}
            aria-label="Close offer bar"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-offer-title">
          <button type="button" aria-label="Close" onClick={snooze} tabIndex={-1} className="absolute inset-0 h-full w-full cursor-default bg-primary-strong/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[900px]">
            <button
              ref={closeRef}
              type="button"
              onClick={snooze}
              aria-label="Close"
              style={{ borderRadius: 9999 }}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-primary-strong/70 bg-[#fcf9f2]/95 text-primary-strong shadow-[0_0_0_4px_rgba(7,68,63,0.15)] transition-colors hover:bg-primary-faint md:right-4 md:top-4 md:h-11 md:w-11"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* The card never exceeds the visible viewport; it scrolls inside if needed. */}
            <div className="grid max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[24px] bg-[#fcf9f2] shadow-2xl md:max-h-[calc(100dvh-2rem)] md:grid-cols-[46%_54%]">
            {/* Visual panel */}
            <div className="relative h-[210px] shrink-0 overflow-hidden bg-[#e3f1f4] md:h-auto md:min-h-[560px]">
              <Image
                src="/media/areas/uluwatu/hero.webp"
                alt=""
                fill
                sizes="(min-width: 768px) 420px, 100vw"
                className="object-cover object-[72%_55%]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#e8f3f6] via-[#e8f3f6]/85 to-transparent md:via-[#e8f3f6]/70" />
              <div className="absolute left-5 top-5 right-6 md:left-8 md:top-8">
                <Image src="/brand/werigo-logo-compact.png" alt="Werigo" width={128} height={52} className="h-8 w-auto md:h-11" />
                <p className="mt-3 font-display text-[24px] font-extrabold leading-[1.05] text-primary-strong md:mt-6 md:text-[38px]">
                  Less noise.
                  <br />
                  More Bali.
                </p>
              </div>
              <Image
                src="/media/fleet/athena/cutout-green.webp"
                alt="Wedison Athena electric scooter in green"
                width={1380}
                height={1380}
                sizes="(min-width: 768px) 400px, 60vw"
                className="absolute -right-2 bottom-1 w-[52%] max-w-[440px] drop-shadow-[0_18px_24px_rgba(7,68,63,0.25)] md:bottom-8 md:w-[96%]"
              />
              <p className="absolute bottom-3 left-5 max-w-[45%] text-[9px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-primary-strong md:bottom-4 md:left-8 md:max-w-none md:text-[10px]">
                Your island. Your pace.
              </p>
            </div>

            {/* Offer panel */}
            <div className="relative px-5 py-5 text-center md:px-10 md:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c14a05]"><T>{"Your Bali welcome offer"}</T></p>
              <h2 id="welcome-offer-title" className="mt-2 font-display text-2xl font-extrabold text-primary-strong md:mt-4 md:text-[34px]">
                <T>{"The island is calling."}</T>
              </h2>
              {promo!.discountType === "percent" ? (
                <p className="mt-1 flex items-end justify-center gap-2 text-primary-strong md:mt-3">
                  <span className="font-display text-[64px] font-extrabold leading-[0.85] tracking-tight md:text-[112px]">{promo!.discountValue}</span>
                  <span className="pb-1 font-display text-4xl font-extrabold leading-none md:pb-3 md:text-5xl">%</span>
                  <span className="pb-2 text-xl font-bold uppercase md:pb-4 md:text-3xl">off</span>
                </p>
              ) : (
                <p className="mt-2 flex items-end justify-center gap-2 text-primary-strong md:mt-4">
                  <span className="font-display text-[40px] font-extrabold leading-none tracking-tight md:text-[60px]">{formatIdr(promo!.discountValue)}</span>
                  <span className="pb-1 text-xl font-bold uppercase md:text-3xl">off</span>
                </p>
              )}
              <p className="mt-2 text-base font-semibold text-primary-strong md:mt-3 md:text-lg">
                <T>{promo!.firstBookingOnly ? "your first electric scooter rental" : "your electric scooter rental"}</T>
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft md:mt-3"><T>{"Create your Werigo account and make your first Bali ride a little sweeter."}</T></p>
              <Link
                href={registerHref}
                onClick={() => setModal(false)}
                className="mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#c14a05] px-8 text-base font-semibold text-white transition-colors hover:bg-[#a83f04] md:mt-6 md:min-h-14"
              >
                <T>{"Create account & save"}</T> {valueLabel}
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft md:mt-4">
                <T>{promo!.firstBookingOnly ? "For newly registered customers only." : "Sign up and it is applied at checkout."}</T>
                {endsLabel ? (
                  <>
                    <br />
                    <T>{"Offer ends"}</T> <strong className="font-semibold text-ink">{endsLabel}.</strong>
                  </>
                ) : null}
              </p>
              <button type="button" onClick={snooze} className="mt-3 cursor-pointer text-sm text-ink-soft underline underline-offset-4 hover:text-ink md:mt-4">
                <T>{"Maybe later"}</T>
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
