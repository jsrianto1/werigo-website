"use client";

import { useEffect, useState } from "react";
import { IdCard, Lock } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import {
  ID_TYPES,
  ID_TYPE_LABELS,
  identityFieldErrors,
  type IdType,
  type Identity,
} from "@/lib/identitySchema";

const inputClass = (err?: string) =>
  `min-h-11 w-full rounded-[10px] border bg-card px-3 text-[15px] uppercase text-ink placeholder:normal-case placeholder:text-ink-faint disabled:opacity-60 ${
    err ? "border-danger" : "border-line-strong"
  }`;

export interface IdentityValues {
  idType: IdType;
  idNumber: string;
  drivingLicenseNumber: string;
}

export const emptyIdentity: IdentityValues = { idType: "passport", idNumber: "", drivingLicenseNumber: "" };

/** Controlled fields only (used inside the registration form). */
export function IdentityFields({
  value,
  onChange,
  errors,
  disabled,
  idPrefix = "identity",
}: {
  value: IdentityValues;
  onChange: (v: IdentityValues) => void;
  errors?: Partial<Record<keyof Identity, string>>;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="sr-only">Identity documents</legend>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink"><T>{"Identity document"}</T></span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Identity document">
          {ID_TYPES.map((t) => (
            <label
              key={t}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border px-3 text-sm font-medium transition-colors ${
                value.idType === t ? "border-primary bg-primary-faint text-primary" : "border-line-strong text-ink-soft hover:border-primary"
              }`}
            >
              <input
                type="radio"
                name={`${idPrefix}-type`}
                value={t}
                checked={value.idType === t}
                onChange={() => onChange({ ...value, idType: t })}
                className="sr-only"
              />
              <T>{ID_TYPE_LABELS[t]}</T>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-number`} className="mb-1.5 block text-sm font-medium text-ink">
          <T>{value.idType === "passport" ? "Passport number" : "KTP number (NIK)"}</T>
        </label>
        <input
          id={`${idPrefix}-number`}
          type="text"
          required
          autoComplete="off"
          inputMode={value.idType === "national_id" ? "numeric" : "text"}
          placeholder={value.idType === "passport" ? "e.g. X1234567" : "16 digits"}
          value={value.idNumber}
          onChange={(e) => onChange({ ...value, idNumber: e.target.value })}
          aria-invalid={Boolean(errors?.idNumber)}
          className={inputClass(errors?.idNumber)}
        />
        {errors?.idNumber ? <p role="alert" className="mt-1 text-xs font-medium text-danger"><T>{errors.idNumber}</T></p> : null}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-license`} className="mb-1.5 block text-sm font-medium text-ink">
          <T>{"Driving licence number"}</T>
        </label>
        <input
          id={`${idPrefix}-license`}
          type="text"
          required
          autoComplete="off"
          placeholder="As printed on your licence"
          value={value.drivingLicenseNumber}
          onChange={(e) => onChange({ ...value, drivingLicenseNumber: e.target.value })}
          aria-invalid={Boolean(errors?.drivingLicenseNumber)}
          className={inputClass(errors?.drivingLicenseNumber)}
        />
        {errors?.drivingLicenseNumber ? (
          <p role="alert" className="mt-1 text-xs font-medium text-danger"><T>{errors.drivingLicenseNumber}</T></p>
        ) : (
          <p className="mt-1 text-xs text-ink-faint"><T>{"Bring the licence and the document above when we deliver your ride."}</T></p>
        )}
      </div>
    </fieldset>
  );
}

/** Save identity to the account; returns field errors from the server, if any. */
export async function submitIdentity(
  v: IdentityValues
): Promise<{ ok: true } | { ok: false; fieldErrors?: Partial<Record<keyof Identity, string>>; message?: string }> {
  const local = identityFieldErrors(v);
  if (local) return { ok: false, fieldErrors: local };
  try {
    const res = await fetch("/api/account/identity", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { ok: true };
    return {
      ok: false,
      fieldErrors: data?.fieldErrors,
      message: data?.message ?? (data?.fieldErrors ? undefined : "Couldn't save your documents. Please try again."),
    };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Please check your connection." };
  }
}

/**
 * Standalone form: loads the current identity, saves it, and calls
 * onSaved. Used on /account/complete, the profile page and inline in
 * checkout.
 */
export function IdentityForm({
  onSaved,
  submitLabel = "Save documents",
  intro,
  heading,
}: {
  onSaved?: () => void;
  submitLabel?: string;
  intro?: string;
  heading?: string;
}) {
  const [value, setValue] = useState<IdentityValues>(emptyIdentity);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Identity, string>>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/identity", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        if (d.identity) setValue({ idType: d.identity.idType, idNumber: d.identity.idNumber, drivingLicenseNumber: d.identity.drivingLicenseNumber });
        setLocked(Boolean(d.locked));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrors({});
    const r = await submitIdentity(value);
    setBusy(false);
    if (!r.ok) {
      setErrors(r.fieldErrors ?? {});
      if (r.message) setMessage({ ok: false, text: r.message });
      return;
    }
    setMessage({ ok: true, text: "Documents saved." });
    onSaved?.();
  }

  if (!loaded) return <div className="h-56 animate-pulse rounded-[14px] bg-sunken" aria-busy="true" />;

  return (
    <form onSubmit={save} className="space-y-4">
      {heading ? (
        <h2 className="flex items-center gap-2 font-display text-xl text-ink">
          <IdCard className="h-5 w-5 text-primary" aria-hidden="true" />
          <T>{heading}</T>
        </h2>
      ) : null}
      {intro ? <p className="text-sm text-ink-soft"><T>{intro}</T></p> : null}
      {locked ? (
        <p className="flex items-start gap-2 rounded-[10px] bg-sunken px-3 py-2 text-sm text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <T>{"These documents are linked to a paid booking. Message us on WhatsApp if they need to change."}</T>
        </p>
      ) : null}
      <IdentityFields value={value} onChange={setValue} errors={errors} disabled={locked || busy} idPrefix="idform" />
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`rounded-[10px] px-3 py-2 text-sm ${message.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          <T>{message.text}</T>
        </p>
      ) : null}
      {!locked ? (
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <T>{"Saving…"}</T> : <T>{submitLabel}</T>}
        </Button>
      ) : null}
      <p className="text-xs leading-relaxed text-ink-faint">
        <T>{"We only store the numbers, never photos of your documents. Only the Werigo team can see them, to check them when we hand over your ride."}</T>
      </p>
    </form>
  );
}
