"use client";

import { BadgePercent, Check } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { formatIdr } from "@/lib/pricing";

export interface DiscountOptionView {
  key: string;
  kind: "promotion" | "referral";
  code: string;
  title: string;
  description: string | null;
  label: string;
  discountIdr: number;
  endsAt: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric" });

/**
 * One discount per booking. The best option is selected automatically;
 * the customer can pick another one, or none, and can add a code.
 */
export function DiscountChooser({
  options,
  bestKey,
  selectedKey,
  onSelect,
  loading,
  code,
  onCodeChange,
  onApply,
  codeStatus,
}: {
  options: DiscountOptionView[];
  bestKey: string | null;
  /** null = automatic (best) */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  loading: boolean;
  code: string;
  onCodeChange: (v: string) => void;
  onApply: () => void;
  codeStatus: { code: string; ok: boolean; message?: string } | null;
}) {
  const active = selectedKey ?? bestKey;
  return (
    <section aria-labelledby="discount-heading" className="mt-6 rounded-[14px] border border-line bg-card p-5">
      <h2 id="discount-heading" className="flex items-center gap-2 font-semibold text-ink">
        <BadgePercent className="h-4 w-4 text-primary" aria-hidden="true" />
        <T>{"Discount"}</T>
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        <T>{"One discount per booking. We picked the biggest one for you; choose another if you prefer to keep a voucher for later."}</T>
      </p>

      {loading && options.length === 0 ? (
        <div className="mt-3 h-14 animate-pulse rounded-[10px] bg-sunken" aria-busy="true" />
      ) : options.length === 0 ? (
        <p className="mt-3 rounded-[10px] bg-sunken px-3 py-2 text-sm text-ink-soft">
          <T>{"No discount applies to this booking. Have a code? Add it below."}</T>
        </p>
      ) : (
        <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Choose a discount">
          {options.map((o) => {
            const checked = active === o.key;
            return (
              <li key={o.key}>
                <label
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border p-3 transition-colors ${
                    checked ? "border-primary bg-primary-faint" : "border-line-strong hover:border-primary"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="discount"
                      checked={checked}
                      onChange={() => onSelect(o.key)}
                      className="mt-1 h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        <T>{o.title}</T>{" "}
                        {o.key === bestKey ? (
                          <span className="ml-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok"><T>{"Best value"}</T></span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {o.code} · <T>{o.label}</T>
                        {o.endsAt ? <> · <T>{"until"}</T> {fmtDate(o.endsAt)}</> : null}
                      </span>
                    </span>
                  </span>
                  <span className="tnum whitespace-nowrap text-sm font-semibold text-ok">−{formatIdr(o.discountIdr)}</span>
                </label>
              </li>
            );
          })}
          <li>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 text-sm transition-colors ${
                selectedKey === "none" ? "border-primary bg-primary-faint" : "border-line-strong hover:border-primary"
              }`}
            >
              <input
                type="radio"
                name="discount"
                checked={selectedKey === "none"}
                onChange={() => onSelect("none")}
                className="h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
              />
              <span className="text-ink-soft"><T>{"Don't use a discount this time"}</T></span>
            </label>
          </li>
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <label htmlFor="discount-code" className="sr-only">Promo, voucher or referral code</label>
        <input
          id="discount-code"
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder="Promo or referral code"
          className="min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-[15px] uppercase text-ink placeholder:normal-case placeholder:text-ink-faint"
        />
        <Button type="button" variant="outline" onClick={onApply}>
          <T>{"Apply"}</T>
        </Button>
      </div>
      {codeStatus ? (
        <p role="status" className={`mt-1.5 flex items-start gap-1 text-xs font-medium ${codeStatus.ok ? "text-ok" : "text-danger"}`}>
          {codeStatus.ok ? <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
          <T>
            {!codeStatus.ok
              ? codeStatus.message ?? "This code cannot be used."
              : options.find((o) => o.code === codeStatus.code)?.key === active
                ? "Code applied."
                : "Code added. Another discount saves you more, so it is selected; choose your code above if you prefer it."}
          </T>
        </p>
      ) : null}
    </section>
  );
}
