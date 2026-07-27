"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Send,
  Tag,
} from "lucide-react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { Button } from "@/components/ui/Button";
import { toCustomerEntry } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { rentalExtras } from "@/data/extras";
import { rentalDays, isValidPeriod, type RentalPeriod } from "@/lib/pricing";
import {
  emptyCustomer,
  saveDraft,
  loadDraft,
  clearDraft,
  cacheConfirmation,
  type CustomerInfo,
} from "@/lib/booking";

type Phase = "extras" | "details" | "review";

const phaseToStep: Record<Phase, number> = {
  extras: 2,
  details: 3,
  review: 4,
};

export function CheckoutFlow() {
  const router = useRouter();
  const params = useSearchParams();

  /** Entry id from the URL; legacy variant ids are normalised to the
      customer-facing model (four rental models only). */
  const rawEntryId = params.get("vehicle") ?? "";
  const pickup = params.get("pickup") ?? "";
  const ret = params.get("return") ?? pickup;
  const period: RentalPeriod = useMemo(
    () => ({
      startDate: params.get("startDate") ?? "",
      startTime: params.get("startTime") ?? "09:00",
      endDate: params.get("endDate") ?? "",
      endTime: params.get("endTime") ?? "09:00",
    }),
    [params]
  );

  const entry = rawEntryId ? toCustomerEntry(rawEntryId) : undefined;
  const entryId = entry?.id ?? "";
  const area = getArea(pickup);
  const returnArea = getArea(ret);

  const [phase, setPhase] = useState<Phase>("extras");
  const [quantity, setQuantity] = useState(1);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState("");
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  // Stable per-checkout idempotency key — a double click or retry
  // after a network error replays the same submission.
  const [submissionId] = useState(() => crypto.randomUUID());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore any saved draft for this entry (one-shot,
  // localStorage is an external system — sync setState is intentional)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = loadDraft();
    if (draft && draft.vehicleSlug === entryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuantity(draft.quantity);
      setExtraQty(
        Object.fromEntries(draft.extras.map((e) => [e.id, e.quantity]))
      );
      setPromoCode(draft.promoCode);
      setCustomer(draft.customer);
    }
  }, [entryId]);

  // Persist draft as user progresses
  useEffect(() => {
    if (!entryId) return;
    saveDraft({
      search: {
        pickupSlug: pickup,
        returnSlug: ret,
        differentReturn: ret !== pickup,
        ...period,
      },
      vehicleSlug: entryId,
      quantity,
      extras: Object.entries(extraQty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ id, quantity: q })),
      promoCode,
      customer,
    });
  }, [entryId, pickup, ret, period, quantity, extraQty, promoCode, customer]);

  // Focus heading on phase change for keyboard/screen-reader users
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  const valid = entry && pickup && isValidPeriod(period);
  const days = valid ? rentalDays(period) : 0;

  if (!valid) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink">
          Your booking session is incomplete
        </h1>
        <p className="mt-3 text-ink-soft">
          We couldn&apos;t find the ride or dates for this checkout. Start a
          fresh search. It only takes a moment.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Start a new search
        </Link>
      </div>
    );
  }

  const searchQs = new URLSearchParams({
    pickup,
    return: ret,
    startDate: period.startDate,
    startTime: period.startTime,
    endDate: period.endDate,
    endTime: period.endTime,
  }).toString();


  function setExtra(id: string, delta: number, max: number) {
    setExtraQty((prev) => {
      const next = Math.min(max, Math.max(0, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  function validateDetails(): boolean {
    const next: Partial<Record<keyof CustomerInfo, string>> = {};
    if (!customer.fullName.trim()) next.fullName = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email))
      next.email = "Enter a valid email address.";
    if (!/^\+?[0-9\s-]{8,}$/.test(customer.whatsapp))
      next.whatsapp = "Enter a WhatsApp number with country code, e.g. +61…";
    if (!customer.nationality.trim()) next.nationality = "Enter your nationality.";
    if (!customer.hotelName.trim())
      next.hotelName = "Enter your hotel or villa name so we can deliver.";
    if (!customer.termsAccepted)
      next.termsAccepted = "Please accept the terms to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Focus first invalid field
      const first = Object.keys(next)[0];
      document.getElementById(`field-${first}`)?.focus();
      return false;
    }
    return true;
  }

  async function confirmBooking() {
    if (!privacyConsent) {
      setConsentError(
        "Please confirm you agree to us using these details to handle your booking."
      );
      document.getElementById("field-privacyConsent")?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const extrasNote = rentalExtras
      .filter((e) => (extraQty[e.id] ?? 0) > 0)
      .map((e) => `${e.name} × ${extraQty[e.id]}`)
      .join(", ");
    const notes = [
      customer.specialRequest.trim(),
      extrasNote ? `Extras: ${extrasNote}` : "",
      promoCode ? `Promo code: ${promoCode}` : "",
      customer.flightNumber ? `Flight: ${customer.flightNumber}` : "",
      customer.nationality ? `Nationality: ${customer.nationality}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSubmissionId: submissionId,
          fullName: customer.fullName,
          email: customer.email,
          whatsapp: customer.whatsapp,
          nationality: customer.nationality,
          pickupArea: pickup,
          pickupAddress: [customer.hotelName, customer.address]
            .filter(Boolean)
            .join(", "),
          returnArea: ret,
          returnAddress: "",
          startAt: `${period.startDate}T${period.startTime}:00+08:00`,
          endAt: `${period.endDate}T${period.endTime}:00+08:00`,
          vehicleModel: entry!.modelSlug,
          quantity,
          deliveryMethod: "delivery",
          customerNotes: notes,
          privacyConsent: true,
          sourcePage: window.location.pathname,
          utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? "",
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") ?? "",
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") ?? "",
          website: "", // honeypot — real users never fill this
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Database did NOT store the booking → never open WhatsApp.
        setSubmitting(false);
        setSubmitError(
          data?.message ??
            "We couldn't save your booking just now. Your details are still here, so please try again."
        );
        return;
      }

      // Stored successfully — hand the confirmation to the next screen.
      cacheConfirmation({
        bookingCode: data.booking.bookingCode,
        whatsappUrl: data.whatsappUrl,
        booking: data.booking,
      });
      clearDraft();
      router.push(
        `/book/confirmation?code=${encodeURIComponent(data.booking.bookingCode)}`
      );
    } catch {
      setSubmitting(false);
      setSubmitError(
        "We couldn't reach the booking service. Your details are still here. Please check your connection and try again."
      );
    }
  }

  const inputClass = (hasError?: string) =>
    `min-h-11 w-full rounded-[10px] border bg-card px-3 text-[15px] text-ink placeholder:text-ink-faint ${
      hasError ? "border-danger" : "border-line-strong"
    }`;

  return (
    <div>
      <BookingStepper current={phaseToStep[phase]} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {/* Booking context line */}
          <p className="tnum mb-6 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
            <strong className="font-semibold text-ink">{entry!.displayName}</strong>{" "}
            · {area?.name}
            {returnArea && ret !== pickup ? ` → ${returnArea.name}` : ""} ·{" "}
            {period.startDate} {period.startTime} → {period.endDate} {period.endTime}
            <Link
              href={`/book?${searchQs}`}
              className="ml-2 font-semibold text-primary hover:text-primary-strong"
            >
              Change
            </Link>
          </p>

          {/* ============ PHASE: EXTRAS ============ */}
          {phase === "extras" ? (
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-3xl text-ink outline-none"
              >
                Make it yours
              </h1>
              <p className="mt-2 text-ink-soft">
                Two helmets and one phone holder are already included. Add
                anything else you need. Extras are priced in your quote.
              </p>


              {/* Quantity */}
              <div className="mt-4 flex items-center justify-between rounded-[14px] border border-line bg-card p-5">
                <div>
                  <h2 className="font-semibold text-ink">Number of motorcycles</h2>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Riding as a group? Request up to 4 of the same model.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    aria-label="Remove one motorcycle"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span aria-live="polite" className="tnum w-6 text-center text-lg font-bold text-ink">
                    {quantity}
                  </span>
                  <button
                    aria-label="Add one motorcycle"
                    disabled={quantity >= 4}
                    onClick={() => setQuantity((q) => Math.min(4, q + 1))}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Extras list */}
              <ul className="mt-4 space-y-4">
                {rentalExtras.map((extra) => (
                  <li
                    key={extra.id}
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-line bg-card p-5"
                  >
                    <div>
                      <h2 className="font-semibold text-ink">
                        {extra.name}
                        {extra.placeholder ? (
                          <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-faint">
                            Terms on request
                          </span>
                        ) : null}
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-soft">{extra.description}</p>
                    </div>
                    {!extra.placeholder ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          aria-label={`Remove one ${extra.name}`}
                          disabled={(extraQty[extra.id] ?? 0) <= 0}
                          onClick={() => setExtra(extra.id, -1, extra.maxQuantity)}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span aria-live="polite" className="tnum w-6 text-center text-lg font-bold text-ink">
                          {extraQty[extra.id] ?? 0}
                        </span>
                        <button
                          aria-label={`Add one ${extra.name}`}
                          disabled={(extraQty[extra.id] ?? 0) >= extra.maxQuantity}
                          onClick={() => setExtra(extra.id, 1, extra.maxQuantity)}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>

              {/* Promo code placeholder */}
              <div className="mt-4 rounded-[14px] border border-line bg-card p-5">
                <label
                  htmlFor="promo"
                  className="flex items-center gap-2 font-semibold text-ink"
                >
                  <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
                  Promo code
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="promo"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter a code"
                    className={inputClass()}
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">
                  Have a code from our team or a partner? It&apos;s saved with
                  your booking and applied to your final quote.
                </p>
              </div>

              <div className="mt-8 flex justify-between gap-3">
                <Link
                  href={`/book?${searchQs}&vehicle=${entryId}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to rides
                </Link>
                <Button variant="accent" size="lg" onClick={() => setPhase("details")}>
                  Continue to your details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* ============ PHASE: DETAILS ============ */}
          {phase === "details" ? (
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-3xl text-ink outline-none"
              >
                Who&apos;s riding?
              </h1>
              <p className="mt-2 text-ink-soft">
                We use these details for delivery and your booking confirmation
                and for nothing else.
              </p>

              <form
                className="mt-6 grid gap-5 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateDetails()) setPhase("review");
                }}
                noValidate
              >
                {(
                  [
                    {
                      key: "fullName",
                      label: "Full name",
                      type: "text",
                      autoComplete: "name",
                      required: true,
                    },
                    {
                      key: "email",
                      label: "Email",
                      type: "email",
                      autoComplete: "email",
                      required: true,
                    },
                    {
                      key: "whatsapp",
                      label: "WhatsApp number",
                      type: "tel",
                      autoComplete: "tel",
                      required: true,
                      hint: "Include your country code. We confirm bookings here.",
                    },
                    {
                      key: "nationality",
                      label: "Nationality",
                      type: "text",
                      autoComplete: "country-name",
                      required: true,
                    },
                    {
                      key: "hotelName",
                      label: "Hotel or villa name",
                      type: "text",
                      autoComplete: "off",
                      required: true,
                    },
                    {
                      key: "address",
                      label: "Address or area details",
                      type: "text",
                      autoComplete: "street-address",
                      required: false,
                      hint: "A street, gang or Google Maps pin. Anything that helps us find you.",
                    },
                    {
                      key: "flightNumber",
                      label: "Flight number (optional)",
                      type: "text",
                      autoComplete: "off",
                      required: false,
                      hint: "If you're booking for arrival day, we track delays.",
                    },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`field-${field.key}`}
                      className="mb-1.5 block text-sm font-medium text-ink"
                    >
                      {field.label}
                      {field.required ? (
                        <span aria-hidden="true" className="text-danger">
                          {" "}
                          *
                        </span>
                      ) : null}
                    </label>
                    <input
                      id={`field-${field.key}`}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      required={field.required}
                      value={customer[field.key]}
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={
                        errors[field.key] ? `error-${field.key}` : undefined
                      }
                      onChange={(e) => {
                        setCustomer((c) => ({ ...c, [field.key]: e.target.value }));
                        setErrors((prev) => ({ ...prev, [field.key]: undefined }));
                      }}
                      className={inputClass(errors[field.key])}
                    />
                    {"hint" in field && field.hint && !errors[field.key] ? (
                      <p className="mt-1.5 text-xs text-ink-faint">{field.hint}</p>
                    ) : null}
                    {errors[field.key] ? (
                      <p
                        id={`error-${field.key}`}
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-danger"
                      >
                        {errors[field.key]}
                      </p>
                    ) : null}
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="field-specialRequest"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Special request (optional)
                  </label>
                  <textarea
                    id="field-specialRequest"
                    rows={3}
                    value={customer.specialRequest}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, specialRequest: e.target.value }))
                    }
                    placeholder="A second rider's details, an early delivery, a surf rack question…"
                    className="w-full rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      id="field-termsAccepted"
                      type="checkbox"
                      checked={customer.termsAccepted}
                      aria-invalid={Boolean(errors.termsAccepted)}
                      aria-describedby={
                        errors.termsAccepted ? "error-termsAccepted" : undefined
                      }
                      onChange={(e) => {
                        setCustomer((c) => ({
                          ...c,
                          termsAccepted: e.target.checked,
                        }));
                        setErrors((prev) => ({ ...prev, termsAccepted: undefined }));
                      }}
                      className="mt-1 h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
                    />
                    <span className="text-sm text-ink-soft">
                      I accept the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
                      >
                        rental terms and conditions
                      </Link>{" "}
                      and confirm I hold a licence valid for riding in
                      Indonesia.
                    </span>
                  </label>
                  {errors.termsAccepted ? (
                    <p
                      id="error-termsAccepted"
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-danger"
                    >
                      {errors.termsAccepted}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-between gap-3 sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPhase("extras")}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to extras
                  </Button>
                  <Button type="submit" variant="accent" size="lg">
                    Review booking
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {/* ============ PHASE: REVIEW ============ */}
          {phase === "review" ? (
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-3xl text-ink outline-none"
              >
                One last look
              </h1>
              <p className="mt-2 text-ink-soft">
                Check everything below, then send your request. We confirm
                availability and your rate on WhatsApp, usually quickly.
              </p>

              <dl className="mt-6 space-y-4 rounded-[14px] border border-line bg-card p-6">
                {[
                  { term: "Ride", detail: `${entry!.displayName} × ${quantity}` },
                  {
                    term: "Rental period",
                    detail: `${period.startDate} ${period.startTime} → ${period.endDate} ${period.endTime} (${days} day${days === 1 ? "" : "s"})`,
                  },
                  {
                    term: "Delivery",
                    detail: `${area?.name}${customer.hotelName ? `, ${customer.hotelName}` : ""}`,
                  },
                  {
                    term: "Return",
                    detail: ret !== pickup ? returnArea?.name ?? ret : "Same as delivery",
                  },
                  ...(Object.values(extraQty).some((q) => q > 0)
                    ? [
                        {
                          term: "Extras",
                          detail: rentalExtras
                            .filter((e) => (extraQty[e.id] ?? 0) > 0)
                            .map((e) => `${e.name} × ${extraQty[e.id]}`)
                            .join(", "),
                        },
                      ]
                    : []),
                  {
                    term: "Rate",
                    detail:
                      "Available upon request and confirmed with your quote on WhatsApp",
                  },
                  { term: "Name", detail: customer.fullName },
                  { term: "WhatsApp", detail: customer.whatsapp },
                  { term: "Email", detail: customer.email },
                  ...(customer.flightNumber
                    ? [{ term: "Flight", detail: customer.flightNumber }]
                    : []),
                  ...(customer.specialRequest
                    ? [{ term: "Special request", detail: customer.specialRequest }]
                    : []),
                ].map((row) => (
                  <div
                    key={row.term}
                    className="grid gap-1 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-[160px_1fr]"
                  >
                    <dt className="text-sm font-semibold text-ink">{row.term}</dt>
                    <dd className="tnum text-sm text-ink-soft">{row.detail}</dd>
                  </div>
                ))}
              </dl>

              {/* Privacy consent — required before submission */}
              <div className="mt-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    id="field-privacyConsent"
                    type="checkbox"
                    checked={privacyConsent}
                    aria-invalid={Boolean(consentError)}
                    aria-describedby={consentError ? "error-privacyConsent" : undefined}
                    onChange={(e) => {
                      setPrivacyConsent(e.target.checked);
                      setConsentError(null);
                    }}
                    className="mt-1 h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
                  />
                  <span className="text-sm text-ink-soft">
                    I agree that Werigo stores and uses these details to handle
                    my booking and to communicate with me about it. See the{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
                    >
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {consentError ? (
                  <p
                    id="error-privacyConsent"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-danger"
                  >
                    {consentError}
                  </p>
                ) : null}
              </div>

              {submitError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-[10px] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  {submitError}
                </div>
              ) : null}

              <div className="mt-6">
                <Button
                  variant="accent"
                  size="lg"
                  disabled={submitting}
                  onClick={() => confirmBooking()}
                  className="w-full sm:w-auto"
                >
                  <Send className="h-5 w-5" aria-hidden="true" />
                  {submitting ? "Saving your booking…" : "Confirm booking request"}
                </Button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                Your booking is saved securely first. You&apos;ll get a
                booking code on the next screen, then continue to WhatsApp
                where our team replies with your rate and availability.
                Nothing is booked or charged until you approve the quote.
              </p>

              <div className="mt-6">
                <Button variant="ghost" onClick={() => setPhase("details")}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Edit details
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar selection summary */}
        <aside aria-label="Booking summary" className="lg:sticky lg:top-24 lg:self-start">
          <BookingSummary
            vehicleName={entry!.displayName}
            quantity={quantity}
            days={days}
            extras={Object.entries(extraQty).map(([id, q]) => ({
              id,
              quantity: q,
            }))}
            pickupName={area?.name ?? pickup}
            returnName={ret !== pickup ? returnArea?.name : undefined}
          />
        </aside>
      </div>
    </div>
  );
}
