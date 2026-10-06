"use client";
import { T, useLanguage } from "@/components/i18n/LanguageProvider";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Minus,
  Plane,
  Plus,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";
import { confirmedBenefits } from "@/data/commercialTerms";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { Button } from "@/components/ui/Button";
import { toCustomerEntry } from "@/data/vehicles";
import { getPickupPoint, getArea, deliveryFeeWaiverNote } from "@/data/locations";
import { rentalExtras } from "@/data/extras";
import {
  rentalDays,
  isValidPeriod,
  estimateRental,
  formatIdr,
  MIN_RENTAL_MESSAGE,
  minRiderAge,
  type RentalPeriod,
} from "@/lib/pricing";
import { batteryReturnNote } from "@/data/commercialTerms";
import { normalizePhone } from "@/lib/phone";
import { useUsdRate } from "@/lib/useUsdRate";
import { formatUsdApprox } from "@/lib/currency";
import {
  computeAddOns,
  formatUsdFee,
  usdToIdr,
  protectionCopy,
} from "@/lib/addons";
import { trackMarketingEvent } from "@/lib/analytics";
import { buildDirectBookingWhatsAppUrl } from "@/lib/whatsapp";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { computeQuote } from "@/lib/quote";
import { authClient } from "@/lib/auth-client";
import { useSnap } from "@/lib/useSnap";
import { AuthForm } from "@/components/account/AuthForm";
import { IdentityForm } from "@/components/account/IdentityForm";
import { welcomeOffer, welcomeOfferActive } from "@/data/promotions";
import {
  emptyCustomer,
  saveDraft,
  loadDraft,
  clearDraft,
  type CustomerInfo,
} from "@/lib/booking";

/**
 * Split a stored "+62812…" number into dialling code and national
 * part. Longest known dialling code wins (so +62 8… is never read as
 * +628); unknown codes fall back to two digits.
 */
const DIAL_CODES = [
  "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39", "+41", "+43", "+44",
  "+45", "+46", "+47", "+48", "+49", "+52", "+54", "+55", "+60", "+61", "+62", "+63", "+64", "+65",
  "+66", "+81", "+82", "+84", "+86", "+90", "+91", "+92", "+94", "+351", "+353", "+358", "+380",
  "+420", "+852", "+880", "+886", "+966", "+971", "+972", "+977",
];
function splitDialCode(raw: string): { countryCode: string; national: string } | null {
  const s = raw.replace(/[\s\-()]/g, "");
  if (!/^\+\d{8,15}$/.test(s)) return null;
  const code =
    DIAL_CODES.filter((c) => s.startsWith(c)).sort((a, b) => b.length - a.length)[0] ?? s.slice(0, 3);
  const national = s.slice(code.length);
  return national.length >= 6 ? { countryCode: code, national } : null;
}

type Phase = "extras" | "details" | "review" | "sent";

const phaseToStep: Record<Phase, number> = {
  extras: 2,
  details: 3,
  review: 4,
  sent: 5,
};

export function CheckoutFlow({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const { t } = useLanguage();
  const params = useSearchParams();
  const router = useRouter();
  // Database mode: payment needs an account. The session is read on
  // the client so the page itself stays cacheable.
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user ?? null;
  const { pay: snapPay, preload: preloadSnap } = useSnap();
  // Rider documents on file? (null = not known yet / not signed in)
  const [identityComplete, setIdentityComplete] = useState<boolean | null>(null);
  useEffect(() => {
    if (!sessionUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdentityComplete(null);
      return;
    }
    let cancelled = false;
    // If the check itself fails, let the customer continue: the booking
    // API enforces the documents and answers identity_required.
    fetch("/api/account/identity", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setIdentityComplete(d?.ok ? Boolean(d.complete) : true);
      })
      .catch(() => {
        if (!cancelled) setIdentityComplete(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);
  // Promotions the signed-in customer qualifies for (welcome offer).
  const [offer, setOffer] = useState<{ eligible: boolean; percent: number; code: string } | null>(null);
  useEffect(() => {
    if (!sessionUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffer(null);
      return;
    }
    let cancelled = false;
    fetch("/api/account/offers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok) setOffer(d.offers.welcome);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  /** Entry id from the URL; legacy variant ids are normalised to the
      customer-facing model (four rental models only). */
  const rawEntryId = params.get("vehicle") ?? "";
  const pickup = params.get("pickup") ?? "";
  const ret = params.get("return") ?? pickup;
  // Partner referral code carried through from /book. Pre-fills the
  // promo code field below so the team can attribute the booking to
  // the referring partner.
  const referralCode = params.get("ref") ?? "";
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
  const area = getPickupPoint(pickup);
  const returnArea = getPickupPoint(ret);

  const [phase, setPhase] = useState<Phase>("extras");
  const [quantity, setQuantity] = useState(1);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  // Optional protection: never preselected. The customer opts in.
  const [protection, setProtection] = useState({
    cancellation: false,
    motorcycle: false,
  });
  const [promoCode, setPromoCode] = useState(referralCode);
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  // Database mode: one idempotency key per checkout session, so a retry
  // after a network error can never create two bookings.
  const submissionId = useRef<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const usdRate = useUsdRate();
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
      if (draft.protection) setProtection(draft.protection);
    }
  }, [entryId]);

  // Signed-in customers: pre-fill contact details once, never overwrite typing.
  useEffect(() => {
    if (!sessionUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer((c) => {
      const next = { ...c };
      if (!c.firstName && !c.lastName && sessionUser.name) {
        const [first, ...rest] = sessionUser.name.trim().split(/\s+/);
        next.firstName = first;
        next.lastName = rest.join(" ");
      }
      if (!c.email && sessionUser.email) next.email = sessionUser.email;
      const phone = (sessionUser as { phone?: string | null }).phone;
      if (!c.whatsapp && phone) {
        const split = splitDialCode(phone);
        if (split) {
          next.countryCode = split.countryCode;
          next.whatsapp = split.national;
        }
      }
      return next;
    });
  }, [sessionUser]);

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
      protection,
      promoCode,
      customer,
    });
  }, [entryId, pickup, ret, period, quantity, extraQty, protection, promoCode, customer]);

  // Focus heading on phase change for keyboard/screen-reader users
  useEffect(() => {
    headingRef.current?.focus();
    if (phase === "review" && !WHATSAPP_FIRST_BOOKING) preloadSnap();
  }, [phase, preloadSnap]);

  const valid = entry && pickup && isValidPeriod(period);
  const days = valid ? rentalDays(period) : 0;
  const estimate = valid ? estimateRental(entry!.modelSlug, period) : null;
  // The amount charged online: same function the server uses to price
  // the booking, so the button and the invoice never disagree.
  const quote = valid
    ? computeQuote({
        modelSlug: entry!.modelSlug,
        period,
        quantity,
        pickupSlug: pickup,
        returnSlug: ret,
        discountPercent: offer?.eligible ? offer.percent : 0,
        discountCode: offer?.eligible ? offer.code : null,
      })
    : null;
  const needsAgeCheck = Boolean(entry && minRiderAge[entry.modelSlug]);
  const addOnBreakdown = valid
    ? computeAddOns({
        pickupIsAirport: Boolean(area?.isAirport),
        returnIsAirport: Boolean(returnArea?.isAirport ?? area?.isAirport),
        days,
        quantity,
        cancellationProtection: protection.cancellation,
        motorcycleProtection: protection.motorcycle,
      })
    : null;
  // Area delivery & collection fee: one Rp 75,000 per booking covering
  // both legs ("antar jemput"). Waived automatically on rentals of one
  // month or longer (monthly tier), and by the team within 5 km of the
  // Wedison showroom (confirmed on WhatsApp, never assumed here).
  // Airport terminals use their own USD fee above, so this applies
  // when either point resolves to a service area.
  const touchesServiceArea = Boolean(getArea(pickup) || getArea(ret));
  const monthlyRental = estimate?.tier.id === "monthly";
  const areaFeeWaivedMonthly = Boolean(valid && monthlyRental && touchesServiceArea);
  const areaFeesIdr =
    valid && !monthlyRental
      ? Math.max(getArea(pickup)?.deliveryFee ?? 0, getArea(ret)?.deliveryFee ?? 0)
      : 0;
  const addOnsIdr = addOnBreakdown
    ? usdToIdr(addOnBreakdown.totalUsd, usdRate)
    : null;
  const grandTotalIdr =
    estimate && addOnBreakdown
      ? addOnBreakdown.totalUsd > 0
        ? addOnsIdr !== null
          ? estimate.totalIdr * quantity + addOnsIdr + areaFeesIdr
          : null
        : estimate.totalIdr * quantity + areaFeesIdr
      : null;

  if (!valid) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink"><T>{"Your booking session is incomplete"}</T>{" "}</h1>
        <p className="mt-3 text-ink-soft"><T>{"We couldn't find the ride or dates for this checkout."}</T>{" "}{" "}<T>{MIN_RENTAL_MESSAGE}</T>{" "}<T>{"Start a fresh search. It only takes a moment."}</T>{" "}</p>
        <Link
          href="/book"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        ><T>{"Start a new search"}</T>{" "}</Link>
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
    if (!customer.firstName.trim()) next.firstName = "Enter your first name.";
    if (!customer.lastName.trim()) next.lastName = "Enter your last name.";
    const phone = normalizePhone(customer.countryCode, customer.whatsapp);
    if (!phone) {
      next.whatsapp = "Check the WhatsApp number. For example +62 812 3456 789.";
    }
    if (customer.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email))
      next.email = "Enter a valid email address, or leave it empty.";
    if (!customer.hotelName.trim())
      next.hotelName = "Enter your hotel or villa name so we can deliver.";
    if (!customer.termsAccepted)
      next.termsAccepted = "Please accept the terms to continue.";
    if (needsAgeCheck && !customer.ageConfirmed)
      next.ageConfirmed = "The EdPower requires a rider aged 25 or older.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      document.getElementById(`field-${first}`)?.focus();
      return false;
    }
    return true;
  }

  /**
   * TEMPORARY WhatsApp-first mode: the request goes straight to
   * WhatsApp. No /api/bookings call, no database insert, no booking
   * code. Nothing from this form is logged.
   */
  function sendToWhatsApp() {
    if (!customer.batteryAck) {
      setConsentError(
        "Please acknowledge the 80% battery-return arrangement first."
      );
      document.getElementById("field-batteryAck")?.focus();
      return;
    }
    if (!privacyConsent) {
      setConsentError(
        "Please confirm you agree to send these details to Werigo on WhatsApp."
      );
      document.getElementById("field-privacyConsent")?.focus();
      return;
    }
    if (!estimate) return;
    const phone = normalizePhone(customer.countryCode, customer.whatsapp);
    if (!phone) return;

    const url = buildDirectBookingWhatsAppUrl({
      modelName: entry!.displayName,
      quantity,
      pickupAreaName: area?.name ?? pickup,
      pickupAddress: [customer.hotelName, customer.address]
        .filter(Boolean)
        .join(", "),
      returnAreaName: returnArea?.name ?? ret,
      sameReturn: ret === pickup,
      startDate: period.startDate,
      startTime: period.startTime,
      endDate: period.endDate,
      endTime: period.endTime,
      days,
      tierLabel: `${t(estimate.tier.label)} (${t(estimate.tier.range)})`,
      ratePerDayIdr: estimate.ratePerDayIdr,
      estimatedTotalIdr: estimate.totalIdr * quantity,
      baseUsdApprox: formatUsdApprox(estimate.totalIdr * quantity, usdRate),
      areaFeeIdr: areaFeesIdr,
      areaFeeWaivedMonthly,
      airportDeliveryUsd: addOnBreakdown?.airportDeliveryUsd ?? 0,
      airportCollectionUsd: addOnBreakdown?.airportCollectionUsd ?? 0,
      cancellationProtectionUsd: addOnBreakdown?.cancellationProtectionUsd ?? 0,
      motorcycleProtectionUsd: addOnBreakdown?.motorcycleProtectionUsd ?? 0,
      addOnsTotalUsd: addOnBreakdown?.totalUsd ?? 0,
      addOnsIdrApprox: addOnsIdr,
      grandTotalIdr,
      grandTotalUsdApprox:
        grandTotalIdr !== null ? formatUsdApprox(grandTotalIdr, usdRate) : null,
      addOns: rentalExtras
        .filter((e) => (extraQty[e.id] ?? 0) > 0)
        .map((e) => ({ name: e.name, quantity: extraQty[e.id] ?? 0 })),
      firstName: customer.firstName,
      lastName: customer.lastName,
      countryCode: phone.countryCode,
      whatsapp: phone.national,
      email: customer.email.trim() || undefined,
      flightNumber: customer.flightNumber || undefined,
      batteryAck: customer.batteryAck,
      ageConfirmed: needsAgeCheck ? customer.ageConfirmed : undefined,
      notes: [customer.specialRequest.trim(), promoCode ? `Promo code: ${promoCode}` : ""]
        .filter(Boolean)
        .join("\n") || undefined,
    });
    trackMarketingEvent("booking_handoff", { content_ids: [entry!.modelSlug], content_type: "product", num_items: quantity, rental_days: days });
    setWhatsappUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
    clearDraft();
    setPhase("sent");
  }

  /**
   * Database mode: the request is stored first (POST /api/bookings →
   * booking code), then the confirmation screen offers the WhatsApp
   * continuation. If the insert fails, WhatsApp is never opened and
   * every field stays on this page for a retry.
   */
  async function confirmBooking() {
    if (!customer.batteryAck) {
      setConsentError(
        "Please acknowledge the 80% battery-return arrangement first."
      );
      document.getElementById("field-batteryAck")?.focus();
      return;
    }
    if (!privacyConsent) {
      setConsentError(
        "Please confirm you agree to us using these details to handle your booking."
      );
      document.getElementById("field-privacyConsent")?.focus();
      return;
    }
    if (!estimate || !entry) return;
    const phone = normalizePhone(customer.countryCode, customer.whatsapp);
    if (!phone) return;
    if (!submissionId.current) submissionId.current = crypto.randomUUID();

    setSubmitting(true);
    setSubmitError(null);

    const extrasNote = rentalExtras
      .filter((e) => (extraQty[e.id] ?? 0) > 0)
      .map((e) => `${e.name} × ${extraQty[e.id]}`)
      .join(", ");
    const protectionNote = [
      protection.cancellation ? "Cancellation Protection" : "",
      protection.motorcycle ? "Motorcycle Protection" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const notes = [
      customer.specialRequest.trim(),
      extrasNote ? `Add-ons: ${extrasNote}` : "",
      protectionNote ? `Protection requested: ${protectionNote}` : "",
      promoCode ? `Promo code: ${promoCode}` : "",
      customer.flightNumber ? `Flight: ${customer.flightNumber}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const search = new URLSearchParams(window.location.search);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSubmissionId: submissionId.current,
          fullName: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email.trim(),
          whatsapp: `${phone.countryCode}${phone.national}`,
          pickupArea: pickup,
          pickupAddress: [customer.hotelName, customer.address]
            .filter(Boolean)
            .join(", "),
          returnArea: ret,
          returnAddress: "",
          startAt: `${period.startDate}T${period.startTime}:00+08:00`,
          endAt: `${period.endDate}T${period.endTime}:00+08:00`,
          vehicleModel: entry.modelSlug,
          quantity,
          deliveryMethod: "delivery",
          customerNotes: notes,
          privacyConsent: true,
          sourcePage: window.location.pathname,
          utmSource: search.get("utm_source") ?? "",
          utmMedium: search.get("utm_medium") ?? "",
          utmCampaign: search.get("utm_campaign") ?? "",
          website: "", // honeypot — real users never fill this
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // Not stored → nothing is charged; keep the form as it is.
        setSubmitting(false);
        if (data?.error === "identity_required") setIdentityComplete(false);
        setSubmitError(
          res.status === 401
            ? "Please sign in below to continue to payment."
            : data?.error === "identity_required"
              ? "Add your rider documents below to continue to payment."
            : data?.message ??
                "We couldn't save your booking just now. Your details are still here, so please try again."
        );
        return;
      }

      trackMarketingEvent("booking_handoff", { content_ids: [entry.modelSlug], content_type: "product", num_items: quantity, rental_days: days });
      clearDraft();
      const code: string = data.booking.bookingCode;
      const token: string | null = data.payment?.snapToken ?? null;
      if (token) {
        // Midtrans popup. Whatever happens in it, the confirmation page
        // shows the real status from the server (webhook / status API).
        const { outcome } = await snapPay(token);
        if (outcome === "error") {
          setSubmitError("The payment could not be completed. You can try again from the confirmation page.");
        }
      }
      router.push(`/book/confirmation?code=${encodeURIComponent(code)}`);
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {/* Booking context line */}
          <p className="tnum mb-6 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
            <strong className="font-semibold text-ink">{entry!.displayName}</strong>{" "}
            ·{" "}
            {area?.isAirport ? (
              <Plane className="inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
            ) : null}{" "}
            <T>{area?.name}</T>
            {returnArea && ret !== pickup ? ` → ${returnArea.name}` : ""} ·{" "}
            {period.startDate} {period.startTime} → {period.endDate} {period.endTime}
            <Link
              href={`/book?${searchQs}`}
              className="ml-2 font-semibold text-primary hover:text-primary-strong"
            ><T>{"Change"}</T>{" "}</Link>
          </p>

          {/* ============ PHASE: EXTRAS ============ */}
          {phase === "extras" ? (
            <div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-3xl text-ink outline-none"
              ><T>{"Make it yours"}</T>{" "}</h1>
              <p className="mt-2 text-ink-soft"><T>{"Two sanitised helmets and one installed phone holder are already included. The add-ons below are free of charge; availability is confirmed on WhatsApp."}</T>{" "}</p>


              {/* Quantity */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-card p-5">
                <div>
                  <h2 className="font-semibold text-ink"><T>{"Number of motorcycles"}</T></h2>
                  <p className="mt-0.5 text-sm text-ink-soft"><T>{"Riding as a group? Request up to 4 of the same model."}</T>{" "}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    aria-label={t("Remove one motorcycle")}
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
                    aria-label={t("Add one motorcycle")}
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
                        <T>{extra.name}</T>
                        <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-faint"><T>{"Price on request"}</T>{" "}</span>
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-soft"><T>{extra.description}</T></p>
                    </div>
                    {(
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
                    )}
                  </li>
                ))}
              </ul>

              {/* Optional protection — unchecked by default */}
              <h2 className="mt-8 font-display text-2xl text-ink"><T>{"Optional protection"}</T>{" "}</h2>
              <ul className="mt-3 space-y-4">
                {[
                  {
                    key: "cancellation" as const,
                    name: "Cancellation Protection",
                    price: `${formatUsdFee(0.5)} ${t("per rental day")}`,
                    amount: addOnBreakdown?.cancellationProtectionUsd ?? 0,
                    computed: formatUsdFee(0.5 * days),
                    copy: protectionCopy.cancellation,
                  },
                  {
                    key: "motorcycle" as const,
                    name: "Motorcycle Protection",
                    price: `${formatUsdFee(4.95)} ${t("per motorcycle, per rental day")}`,
                    amount: addOnBreakdown?.motorcycleProtectionUsd ?? 0,
                    computed: formatUsdFee(4.95 * days * quantity),
                    copy: protectionCopy.motorcycle,
                  },
                ].map((item) => {
                  const selected = protection[item.key];
                  return (
                    <li
                      key={item.key}
                      className={`rounded-[14px] border bg-card p-5 transition-colors ${
                        selected ? "border-primary" : "border-line"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="flex items-center gap-2 font-semibold text-ink">
                            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                            <T>{item.name}</T>
                          </h3>
                          <p className="tnum mt-0.5 text-sm font-medium text-ink-soft">
                            {item.price}
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                            <T>{item.copy}</T>
                          </p>
                          {selected ? (
                            <p className="tnum mt-2 text-sm font-semibold text-primary"><T>{"Added:"}</T>{" "}{item.computed}{" "}<T>{"for this booking"}</T>{" "}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setProtection((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          className={`min-h-11 shrink-0 cursor-pointer rounded-[10px] border px-4 text-sm font-semibold transition-colors ${
                            selected
                              ? "border-line-strong text-ink hover:border-danger hover:text-danger"
                              : "border-primary text-primary hover:bg-primary-faint"
                          }`}
                        >
                          {t(selected ? "Remove" : "Add")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {(area?.isAirport || returnArea?.isAirport) && addOnBreakdown ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Plane className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Airport handover:"}</T>{" "}{area?.isAirport ? `delivery fee ${formatUsdFee(1)}` : ""}
                  {area?.isAirport && returnArea?.isAirport ? " and " : ""}
                  {returnArea?.isAirport ? `collection fee ${formatUsdFee(1)}` : ""}<T>{", once per booking."}</T>{" "}</p>
              ) : null}

              {areaFeesIdr > 0 ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Truck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Delivery & collection:"}</T>{" "}{formatIdr(areaFeesIdr)}<T>{", once per booking."}</T>{" "}<T>{deliveryFeeWaiverNote}</T>
                </p>
              ) : areaFeeWaivedMonthly ? (
                <p className="mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Truck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Delivery and collection are free on this rental because it is one month or longer."}</T>{" "}</p>
              ) : null}

              {/* Included with every rental */}
              <h2 className="mt-8 font-display text-2xl text-ink"><T>{"Included with every rental"}</T>{" "}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {confirmedBenefits.map((b) => (
                  <li
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-faint px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    <b.icon className="h-4 w-4" aria-hidden="true" />
                    <T>{b.label}</T>
                  </li>
                ))}
              </ul>

              {/* Promo code placeholder */}
              <div className="mt-4 rounded-[14px] border border-line bg-card p-5">
                <label
                  htmlFor="promo"
                  className="flex items-center gap-2 font-semibold text-ink"
                >
                  <Tag className="h-4 w-4 text-primary" aria-hidden="true" /><T>{"Promo code"}</T>{" "}</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="promo"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={t("Enter a code")}
                    className={inputClass()}
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-faint"><T>{"Have a code from our team or a partner? It's included in your WhatsApp request and applied to your final quote."}</T>{" "}</p>
              </div>

              <div className="mt-8 flex justify-between gap-3 pb-20 lg:pb-0">
                <Link
                  href={`/book?${searchQs}&vehicle=${entryId}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /><T>{"Back to rides"}</T>{" "}</Link>
                <Button variant="accent" size="lg" onClick={() => setPhase("details")}><T>{"Continue to your details"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Compact mobile summary bar (services step only) */}
              <div
                className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 px-4 py-3 backdrop-blur-sm lg:hidden"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="tnum min-w-0 text-sm leading-snug text-ink-soft">
                    <span className="block text-xs"><T>{"Estimated total"}</T></span>
                    <span className="font-bold text-ink">
                      {grandTotalIdr !== null
                        ? formatIdr(grandTotalIdr)
                        : estimate
                          ? `${formatIdr(estimate.totalIdr * quantity)} + ${formatUsdFee(addOnBreakdown?.totalUsd ?? 0)}`
                          : ""}
                    </span>
                  </p>
                  <Button variant="accent" onClick={() => setPhase("details")}><T>{"Continue"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
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
              ><T>{"Who's riding?"}</T>{" "}</h1>
              <p className="mt-2 text-ink-soft"><T>{"We use these details for delivery and to reply to your booking request, and for nothing else."}</T>{" "}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint"><T>{"What to prepare: after availability is confirmed, Werigo may request a valid driving licence and identification through a separately approved secure process. Please don't send document photos through this form."}</T>{" "}</p>

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
                      key: "firstName",
                      label: "First name",
                      type: "text",
                      autoComplete: "given-name",
                      required: true,
                    },
                    {
                      key: "lastName",
                      label: "Last name",
                      type: "text",
                      autoComplete: "family-name",
                      required: true,
                    },
                    {
                      key: "countryCode",
                      label: "Country code",
                      type: "tel",
                      autoComplete: "tel-country-code",
                      required: true,
                      hint: "For example, +62",
                    },
                    {
                      key: "whatsapp",
                      label: "WhatsApp number",
                      type: "tel",
                      autoComplete: "tel-national",
                      required: true,
                      hint: "Your number without the country code",
                    },
                    {
                      key: "email",
                      label: "Email (optional)",
                      type: "email",
                      autoComplete: "email",
                      required: false,
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
                      <T>{field.label}</T>
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
                      onBlur={() => {
                        if (field.key !== "countryCode" && field.key !== "whatsapp") return;
                        const p = normalizePhone(customer.countryCode, customer.whatsapp);
                        if (p) {
                          setCustomer((c) => ({
                            ...c,
                            countryCode: p.countryCode,
                            whatsapp: p.national,
                          }));
                        }
                      }}
                      className={inputClass(errors[field.key])}
                    />
                    {"hint" in field && field.hint && !errors[field.key] ? (
                      <p className="mt-1.5 text-xs text-ink-faint"><T>{field.hint}</T></p>
                    ) : null}
                    {errors[field.key] ? (
                      <p
                        id={`error-${field.key}`}
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-danger"
                      >
                        <T>{errors[field.key]}</T>
                      </p>
                    ) : null}
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="field-specialRequest"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  ><T>{"Special request (optional)"}</T>{" "}</label>
                  <textarea
                    id="field-specialRequest"
                    rows={3}
                    value={customer.specialRequest}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, specialRequest: e.target.value }))
                    }
                    placeholder={t("A second rider's details, an early delivery, a surf rack question\u2026")}
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
                    <span className="text-sm text-ink-soft"><T>{"I accept the"}</T>{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
                      ><T>{"rental terms and conditions"}</T>{" "}</Link>{" "}<T>{"and confirm I hold a licence valid for riding in Indonesia."}</T>{" "}</span>
                  </label>
                  {errors.termsAccepted ? (
                    <p
                      id="error-termsAccepted"
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-danger"
                    >
                      <T>{errors.termsAccepted}</T>
                    </p>
                  ) : null}
                </div>

                {needsAgeCheck ? (
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        id="field-ageConfirmed"
                        type="checkbox"
                        checked={customer.ageConfirmed}
                        aria-invalid={Boolean(errors.ageConfirmed)}
                        aria-describedby={
                          errors.ageConfirmed ? "error-ageConfirmed" : undefined
                        }
                        onChange={(e) => {
                          setCustomer((c) => ({
                            ...c,
                            ageConfirmed: e.target.checked,
                          }));
                          setErrors((prev) => ({ ...prev, ageConfirmed: undefined }));
                        }}
                        className="mt-1 h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
                      />
                      <span className="text-sm text-ink-soft"><T>{"I confirm the rider is at least 25 years old, as required for the Wedison EdPower."}</T>{" "}</span>
                    </label>
                    {errors.ageConfirmed ? (
                      <p
                        id="error-ageConfirmed"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-danger"
                      >
                        <T>{errors.ageConfirmed}</T>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-between gap-3 sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPhase("extras")}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /><T>{"Back to extras"}</T>{" "}</Button>
                  <Button type="submit" variant="accent" size="lg"><T>{"Review booking"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              ><T>{"One last look"}</T>{" "}</h1>
              <p className="mt-2 text-ink-soft"><T>{WHATSAPP_FIRST_BOOKING
                ? "Check everything below, then send your request. We confirm availability and your rate on WhatsApp, usually quickly."
                : "Check everything below, then pay to confirm your ride. Our team arranges delivery with you on WhatsApp."}</T>{" "}</p>

              <dl className="mt-6 space-y-4 rounded-[14px] border border-line bg-card p-6">
                {[
                  { term: "Ride", detail: `${entry!.displayName} × ${quantity}` },
                  {
                    term: "Rental period",
                    detail: `${period.startDate} ${period.startTime} → ${period.endDate} ${period.endTime} (${days} ${t("days")})`,
                  },
                  {
                    term: "Delivery",
                    detail: `${area?.name}${customer.hotelName ? `, ${customer.hotelName}` : ""}`,
                  },
                  {
                    term: "Return",
                    detail: ret !== pickup ? returnArea?.name ?? ret : t("Same as delivery"),
                  },
                  ...(Object.values(extraQty).some((q) => q > 0)
                    ? [
                        {
                          term: "Extras",
                          detail: rentalExtras
                            .filter((e) => (extraQty[e.id] ?? 0) > 0)
                            .map((e) => `${t(e.name)} × ${extraQty[e.id]}`)
                            .join(", "),
                        },
                      ]
                    : []),
                  ...(estimate
                    ? [
                        {
                          term: "Pricing tier",
                          detail: `${t(estimate.tier.label)} (${t(estimate.tier.range)})`,
                        },
                        {
                          term: "Rate",
                          detail: `${formatIdr(estimate.ratePerDayIdr)} ${t("per day")}${
                            formatUsdApprox(estimate.ratePerDayIdr, usdRate)
                              ? ` (${formatUsdApprox(estimate.ratePerDayIdr, usdRate)})`
                              : ""
                          }`,
                        },
                        {
                          term: "Estimated total",
                          detail: `${formatIdr(estimate.totalIdr * quantity)}${
                            formatUsdApprox(estimate.totalIdr * quantity, usdRate)
                              ? ` (${formatUsdApprox(estimate.totalIdr * quantity, usdRate)})`
                              : ""
                          } ${t("for")} ${days} ${t("days")}${quantity > 1 ? ` × ${quantity} ${t("motorcycles")}` : ""}. ${t("Confirmed with availability on WhatsApp.")}`,
                        },
                      ]
                    : []),
                  ...(areaFeesIdr > 0
                    ? [
                        {
                          term: "Delivery & collection",
                          detail: `${formatIdr(areaFeesIdr)} ${t("once per booking.")} ${t(deliveryFeeWaiverNote)}`,
                        },
                      ]
                    : areaFeeWaivedMonthly
                      ? [
                          {
                            term: "Delivery & collection",
                            detail: t("Free, because this rental is one month or longer."),
                          },
                        ]
                      : []),
                  ...(addOnBreakdown && addOnBreakdown.totalUsd > 0
                    ? [
                        {
                          term: "Add-ons",
                          detail: [
                            addOnBreakdown.airportDeliveryUsd > 0
                              ? `${t("Airport delivery fee")} ${formatUsdFee(addOnBreakdown.airportDeliveryUsd)}`
                              : "",
                            addOnBreakdown.airportCollectionUsd > 0
                              ? `${t("Airport collection fee")} ${formatUsdFee(addOnBreakdown.airportCollectionUsd)}`
                              : "",
                            addOnBreakdown.cancellationProtectionUsd > 0
                              ? `${t("Cancellation Protection")} ${formatUsdFee(addOnBreakdown.cancellationProtectionUsd)}`
                              : "",
                            addOnBreakdown.motorcycleProtectionUsd > 0
                              ? `${t("Motorcycle Protection")} ${formatUsdFee(addOnBreakdown.motorcycleProtectionUsd)}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        },
                      ]
                    : []),
                  ...(addOnBreakdown && (addOnBreakdown.totalUsd > 0 || areaFeesIdr > 0)
                    ? [
                        {
                          term: "Estimated grand total",
                          detail:
                            grandTotalIdr !== null
                              ? `${formatIdr(grandTotalIdr)}${
                                  formatUsdApprox(grandTotalIdr, usdRate)
                                    ? ` (${formatUsdApprox(grandTotalIdr, usdRate)})`
                                    : ""
                                }. ${t("Confirmed with availability on WhatsApp.")}`
                              : `${formatIdr((estimate?.totalIdr ?? 0) * quantity + areaFeesIdr)} ${t("plus")} ${formatUsdFee(addOnBreakdown.totalUsd)} ${t("add-ons.")} ${t("Confirmed with availability on WhatsApp.")}`,
                        },
                      ]
                    : []),
                  ...(!WHATSAPP_FIRST_BOOKING && quote && quote.discountIdr > 0
                    ? [
                        {
                          term: "Welcome offer",
                          detail: `−${formatIdr(quote.discountIdr)} (${quote.discountPercent}% ${t("off your first rental")})`,
                        },
                      ]
                    : []),
                  ...(!WHATSAPP_FIRST_BOOKING && quote
                    ? [
                        {
                          term: "Total to pay now",
                          detail: `${formatIdr(quote.totalIdr)}${
                            formatUsdApprox(quote.totalIdr, usdRate)
                              ? ` (${formatUsdApprox(quote.totalIdr, usdRate)})`
                              : ""
                          }. ${t("Add-ons and protection requests are free of charge and confirmed by the team.")}`,
                        },
                      ]
                    : []),
                  { term: "Name", detail: `${customer.firstName} ${customer.lastName}` },
                  {
                    term: "WhatsApp",
                    detail: (() => {
                      const p = normalizePhone(customer.countryCode, customer.whatsapp);
                      return p ? `${p.countryCode} ${p.national}` : `${customer.countryCode} ${customer.whatsapp}`;
                    })(),
                  },
                  ...(customer.email ? [{ term: "Email", detail: customer.email }] : []),
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
                    <dt className="text-sm font-semibold text-ink"><T>{row.term}</T></dt>
                    <dd className="tnum text-sm text-ink-soft">{row.detail}</dd>
                  </div>
                ))}
              </dl>

              {/* Battery-return acknowledgement — required */}
              <div className="mt-6 rounded-[10px] border border-line bg-primary-faint p-4">
                <p className="text-sm leading-relaxed text-ink">
                  <T>{batteryReturnNote}</T>
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    id="field-batteryAck"
                    type="checkbox"
                    checked={customer.batteryAck}
                    onChange={(e) => {
                      setCustomer((c) => ({ ...c, batteryAck: e.target.checked }));
                      setConsentError(null);
                    }}
                    className="mt-1 h-4 w-4 cursor-pointer accent-[var(--brand-primary)]"
                  />
                  <span className="text-sm text-ink-soft"><T>{"I understand, and I'll arrange anything different with the team on WhatsApp."}</T>{" "}</span>
                </label>
              </div>

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
                  <span className="text-sm text-ink-soft"><T>{WHATSAPP_FIRST_BOOKING
                    ? "I agree to send these details to Werigo through WhatsApp so the team can respond to my booking request. See the"
                    : "I agree to Werigo processing these details to handle my booking and payment. See the"}</T>{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
                    ><T>{"privacy policy"}</T>{" "}</Link>
                    .
                  </span>
                </label>
                {consentError ? (
                  <p
                    id="error-privacyConsent"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-danger"
                  >
                    <T>{consentError}</T>
                  </p>
                ) : null}
              </div>

              {submitError ? (
                <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
                  <T>{submitError}</T>
                </p>
              ) : null}
              {!WHATSAPP_FIRST_BOOKING && !sessionUser ? (
                <div className="mt-6 rounded-[14px] border border-line bg-card p-6">
                  <h2 className="font-display text-xl text-ink"><T>{"Sign in to pay"}</T></h2>
                  <p className="mt-1 text-sm text-ink-soft"><T>{"Your booking, payment and receipt are kept in your Werigo account. Everything you filled in above stays here."}</T></p>
                  {welcomeOfferActive() ? (
                    <p className="mt-3 rounded-[10px] bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                      <T>{"New here? Create an account and get"}</T> {welcomeOffer.percent}% <T>{"off this rental."}</T>
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <AuthForm
                      googleEnabled={googleEnabled}
                      heading={false}
                      callbackURL={`/book/checkout?${params.toString()}`}
                      onSuccess={() => setSubmitError(null)}
                    />
                  </div>
                </div>
              ) : !WHATSAPP_FIRST_BOOKING && identityComplete === false ? (
                <div className="mt-6 rounded-[14px] border border-line bg-card p-6">
                  <IdentityForm
                    heading="Your rider documents"
                    intro="Needed once to rent a motorcycle. Everything you filled in above stays here."
                    submitLabel="Save and continue to payment"
                    onSaved={() => {
                      setIdentityComplete(true);
                      setSubmitError(null);
                    }}
                  />
                </div>
              ) : (
                <div className="mt-6">
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={() => (WHATSAPP_FIRST_BOOKING ? sendToWhatsApp() : void confirmBooking())}
                    disabled={submitting || (!WHATSAPP_FIRST_BOOKING && (!quote || identityComplete === null))}
                    className="w-full sm:w-auto"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    {submitting ? (
                      <T>{WHATSAPP_FIRST_BOOKING ? "Saving your request…" : "Opening secure payment…"}</T>
                    ) : WHATSAPP_FIRST_BOOKING ? (
                      <T>{"Send booking request on WhatsApp"}</T>
                    ) : (
                      <><T>{"Pay"}</T>{quote ? ` ${formatIdr(quote.totalIdr)}` : ""}</>
                    )}{" "}</Button>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink-faint"><T>{WHATSAPP_FIRST_BOOKING
                ? "Availability, final pricing, delivery, add-ons and your booking are confirmed by the Werigo team on WhatsApp. Nothing is charged before that."
                : "Secure payment by Midtrans (cards, bank transfer, QRIS, e-wallets). Your ride is held for one hour while you pay. Delivery details are confirmed by our team on WhatsApp."}</T>{" "}</p>

              <div className="mt-6">
                <Button variant="ghost" onClick={() => setPhase("details")}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /><T>{"Edit details"}</T>{" "}</Button>
              </div>
            </div>
          ) : null}
          {/* ============ PHASE: SENT (WhatsApp handoff) ============ */}
          {phase === "sent" ? (
            <div>
              <CheckCircle2 className="h-10 w-10 text-ok" aria-hidden="true" />
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-3 font-display text-3xl text-ink outline-none"
              ><T>{"Your request is ready in WhatsApp"}</T>{" "}</h1>
              <p className="mt-3 max-w-xl text-ink-soft"><T>{"WhatsApp should have opened with your booking request. Send the message and our team will reply with availability and your quote. If WhatsApp did not open, use the button below."}</T>{" "}</p>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" /><T>{"Open WhatsApp"}</T>{" "}</a>
              ) : null}
              <p className="mt-5 text-xs leading-relaxed text-ink-faint"><T>{"Your rental stays a request until our team confirms availability and you approve the quote. Nothing is booked or charged before that."}</T>{" "}</p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                ><T>{"Back to home"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar selection summary */}
        <aside aria-label={t("Booking summary")} className="lg:sticky lg:top-24 lg:self-start">
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
            estimate={estimate}
            addOnBreakdown={addOnBreakdown}
            areaFeeIdr={areaFeesIdr}
            areaFeeWaived={areaFeeWaivedMonthly}
          />
        </aside>
      </div>
    </div>
  );
}
