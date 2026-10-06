"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Lock, Ticket, X } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

export interface DiscountOptionView {
  key: string;
  kind: "promotion" | "referral" | "points";
  code: string;
  title: string;
  description: string | null;
  label: string;
  discountIdr: number;
  endsAt: string | null;
}

export interface UnavailableVoucherView {
  key: string;
  kind: "promotion" | "referral";
  code: string;
  title: string;
  label: string;
  endsAt: string | null;
  hint: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric" });

/**
 * Voucher selection in the style customers know from marketplaces:
 * a row showing the applied voucher (the best one by default) and a
 * "Select voucher" sheet listing every voucher on the account, usable
 * ones first, unusable ones greyed out with what is missing, plus a
 * field for typing a code. One voucher per booking.
 */
export function VoucherPicker({
  signedIn,
  options,
  unavailable,
  bestKey,
  selectedKey,
  onSelect,
  loading,
  code,
  onCodeChange,
  onApply,
  codeStatus,
}: {
  signedIn: boolean;
  options: DiscountOptionView[];
  unavailable: UnavailableVoucherView[];
  bestKey: string | null;
  /** null = automatic (best); "none" = no voucher */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  loading: boolean;
  code: string;
  onCodeChange: (v: string) => void;
  onApply: () => void;
  codeStatus: { code: string; ok: boolean; message?: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Set when the customer presses Apply in the sheet, so only a freshly
  // applied code is pre-selected (reopening the sheet keeps their choice).
  const justApplied = useRef(false);

  const activeKey = selectedKey === "none" ? "none" : selectedKey ?? bestKey;
  const applied = options.find((o) => o.key === activeKey) ?? null;

  function openSheet() {
    setStaged(activeKey);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // A code that just became usable is pre-selected in the sheet so the
  // customer can confirm it; the page keeps the best one until they do.
  useEffect(() => {
    if (!open || !justApplied.current || !codeStatus) return;
    justApplied.current = false;
    const match = codeStatus.ok ? options.find((o) => o.code === codeStatus.code) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setStaged(match.key);
  }, [open, codeStatus, options]);

  function applyCode() {
    const typed = code.trim().toUpperCase();
    // Same code as last time: no new request will come back, select it now.
    if (codeStatus && codeStatus.code === typed) {
      const match = codeStatus.ok ? options.find((o) => o.code === typed) : null;
      if (match) setStaged(match.key);
      return;
    }
    justApplied.current = true;
    onApply();
  }

  function confirm() {
    onSelect(staged === bestKey ? null : staged);
    setOpen(false);
  }

  const stagedOption = options.find((o) => o.key === staged) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-card p-4 text-left transition-colors hover:border-primary"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[#c14a05]">
          <Ticket className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {!signedIn ? (
            <>
              <span className="block text-sm font-semibold text-ink"><T>{"Vouchers and promo codes"}</T></span>
              <span className="block text-xs text-ink-soft">
                {code ? <><T>{"Code"}</T> {code} · <T>{"checked when you sign in at the last step"}</T></> : <T>{"Sign in at the last step to use the vouchers on your account, or enter a code."}</T>}
              </span>
            </>
          ) : loading && options.length === 0 ? (
            <span className="block h-9 w-48 animate-pulse rounded bg-sunken" aria-busy="true" />
          ) : applied ? (
            <>
              <span className="block truncate text-sm font-semibold text-ink">
                <T>{applied.title}</T> <span className="tnum font-normal text-ink-soft">· {applied.code}</span>
              </span>
              <span className="block text-xs font-semibold text-ok">
                <T>{"You save"}</T> {formatIdr(applied.discountIdr)}
                {applied.key === bestKey ? <span className="ml-1 font-normal text-ink-soft">· <T>{"best voucher applied"}</T></span> : null}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-semibold text-ink"><T>{"No voucher applied"}</T></span>
              <span className="block text-xs text-ink-soft">
                {options.length > 0 ? (
                  <>{options.length} <T>{options.length === 1 ? "voucher available" : "vouchers available"}</T></>
                ) : (
                  <T>{"Have a promo or referral code? Add it here."}</T>
                )}
              </span>
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary">
          <T>{applied ? "Change" : "Select voucher"}</T>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="voucher-sheet-title">
              <button type="button" aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-black/50" />
              <div className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-page shadow-2xl sm:rounded-[20px]">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 id="voucher-sheet-title" className="font-display text-xl text-ink"><T>{"Select voucher"}</T></h2>
                  <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-sunken">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  {/* Code entry */}
                  <div className="flex gap-2">
                    <label htmlFor="voucher-code" className="sr-only">Promo or referral code</label>
                    <input
                      id="voucher-code"
                      type="text"
                      value={code}
                      onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCode();
                        }
                      }}
                      placeholder="Enter promo or referral code"
                      className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] uppercase text-ink placeholder:normal-case placeholder:text-ink-faint"
                    />
                    <Button type="button" variant="primary" onClick={applyCode} disabled={!code.trim()}>
                      <T>{"Apply"}</T>
                    </Button>
                  </div>
                  {codeStatus && codeStatus.code === code.trim().toUpperCase() ? (
                    <p role="status" className={`mt-1.5 text-xs font-medium ${codeStatus.ok ? "text-ok" : "text-danger"}`}>
                      <T>{codeStatus.ok ? "Code added to your vouchers below." : codeStatus.message ?? "This code cannot be used."}</T>
                    </p>
                  ) : !signedIn && code ? (
                    <p className="mt-1.5 text-xs text-ink-soft"><T>{"Saved. We check it when you sign in at the last step."}</T></p>
                  ) : null}

                  {!signedIn ? (
                    <p className="mt-5 flex items-start gap-2 rounded-[12px] bg-sunken p-4 text-sm text-ink-soft">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <T>{"Your vouchers appear here once you are signed in. You sign in at the last step, before payment; everything you filled in stays."}</T>
                    </p>
                  ) : (
                    <>
                      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                        <T>{"Available"}</T> ({options.length})
                      </h3>
                      {options.length === 0 ? (
                        <p className="mt-2 rounded-[12px] bg-sunken p-4 text-sm text-ink-soft"><T>{"No voucher fits this booking yet."}</T></p>
                      ) : (
                        <ul className="mt-2 space-y-2.5" role="radiogroup" aria-label="Available vouchers">
                          {options.map((o) => {
                            const checked = staged === o.key;
                            return (
                              <li key={o.key}>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={checked}
                                  onClick={() => setStaged(o.key)}
                                  className={`relative flex w-full cursor-pointer overflow-hidden rounded-[12px] border text-left transition-colors ${
                                    checked ? "border-primary ring-2 ring-primary/30" : "border-line-strong hover:border-primary"
                                  }`}
                                >
                                  <span className="flex w-20 shrink-0 flex-col items-center justify-center bg-primary px-2 py-4 text-center text-white">
                                    <Ticket className="h-5 w-5" aria-hidden="true" />
                                    <span className="mt-1 text-[11px] font-semibold leading-tight"><T>{o.kind === "points" ? "Ride Points" : o.kind === "referral" ? "Referral" : "Voucher"}</T></span>
                                  </span>
                                  <span className="flex-1 border-l border-dashed border-line bg-card p-3">
                                    <span className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-ink"><T>{o.title}</T></span>
                                      {o.key === bestKey ? (
                                        <span className="whitespace-nowrap rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok"><T>{"Best value"}</T></span>
                                      ) : null}
                                    </span>
                                    <span className="tnum mt-0.5 block text-xs text-ink-soft">
                                      {o.code} · <T>{o.label}</T>
                                    </span>
                                    <span className="mt-1.5 flex items-center justify-between gap-2">
                                      <span className="tnum text-sm font-bold text-ok"><T>{"Save"}</T> {formatIdr(o.discountIdr)}</span>
                                      {o.endsAt ? <span className="text-[11px] text-ink-faint"><T>{"Until"}</T> {fmtDate(o.endsAt)}</span> : null}
                                    </span>
                                  </span>
                                  <span
                                    className={`absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border ${
                                      checked ? "border-primary bg-primary text-white" : "border-line-strong bg-card"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={staged === "none"}
                        onClick={() => setStaged("none")}
                        className={`mt-2.5 flex w-full cursor-pointer items-center justify-between rounded-[12px] border px-4 py-3 text-left text-sm transition-colors ${
                          staged === "none" ? "border-primary ring-2 ring-primary/30" : "border-line-strong hover:border-primary"
                        }`}
                      >
                        <span className="text-ink-soft"><T>{"Don't use a voucher this time"}</T></span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${staged === "none" ? "border-primary bg-primary text-white" : "border-line-strong"}`} aria-hidden="true">
                          {staged === "none" ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </button>

                      {unavailable.length > 0 ? (
                        <>
                          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                            <T>{"Not available for this booking"}</T> ({unavailable.length})
                          </h3>
                          <ul className="mt-2 space-y-2.5">
                            {unavailable.map((u) => (
                              <li key={u.key} className="flex overflow-hidden rounded-[12px] border border-line text-left opacity-70 grayscale">
                                <span className="flex w-20 shrink-0 flex-col items-center justify-center bg-ink-faint/40 px-2 py-4 text-center text-ink-soft">
                                  <Ticket className="h-5 w-5" aria-hidden="true" />
                                  <span className="mt-1 text-[11px] font-semibold leading-tight"><T>{u.kind === "referral" ? "Referral" : "Voucher"}</T></span>
                                </span>
                                <span className="flex-1 border-l border-dashed border-line bg-sunken p-3">
                                  <span className="sr-only">Not available: </span>
                                  <span className="block text-sm font-semibold text-ink-soft"><T>{u.title}</T></span>
                                  <span className="tnum mt-0.5 block text-xs text-ink-faint">{u.code} · <T>{u.label}</T></span>
                                  <span className="mt-1.5 block text-xs font-medium text-warn"><T>{u.hint}</T></span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </>
                  )}
                </div>

                <div
                  className="flex items-center justify-between gap-3 border-t border-line bg-card px-5 py-4"
                  style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
                >
                  <p className="tnum text-sm text-ink-soft">
                    {signedIn && stagedOption ? (
                      <><T>{"You save"}</T> <strong className="text-ok">{formatIdr(stagedOption.discountIdr)}</strong></>
                    ) : signedIn ? (
                      <T>{"No voucher"}</T>
                    ) : null}
                  </p>
                  <Button type="button" variant="accent" onClick={signedIn ? confirm : () => setOpen(false)}>
                    <T>{!signedIn ? "Done" : staged === "none" ? "Confirm" : "Use voucher"}</T>
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
