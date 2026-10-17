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
  Tag,
  Truck,
} from "lucide-react";
import { confirmedBenefits, cancellationPolicy } from "@/data/commercialTerms";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { DeliveryFeePicker } from "./DeliveryFeePicker";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { Button } from "@/components/ui/Button";
import { toCustomerEntry } from "@/data/vehicles";
import { getPickupPoint, getArea, deliveryFeeWaiverNote } from "@/data/locations";
import { rentalExtras, sanitizeExtraQuantities } from "@/data/extras";
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
} from "@/lib/addons";
import { trackMarketingEvent } from "@/lib/analytics";
import { buildDirectBookingWhatsAppUrl } from "@/lib/whatsapp";
import { needsDeliveryConfirmation, deliveryPricingNote } from "@/data/locations";
import { WHATSAPP_FIRST_BOOKING } from "@/lib/bookingMode";
import { riderLicenceNotice, riderFinesNotice, RIDER_POLICY_VERSION } from "@/data/riderPolicy";
import { computeQuote } from "@/lib/quote";
import { authClient } from "@/lib/auth-client";
import { useSnap } from "@/lib/useSnap";
import { AuthForm } from "@/components/account/AuthForm";
import { IdentityForm } from "@/components/account/IdentityForm";
import { VoucherPicker, type DiscountOptionView, type UnavailableVoucherView } from "@/components/booking/VoucherPicker";
import { readAppPickup, validMapsUrl, type AppPickup } from "@/lib/appPickup";
import { site } from "@/lib/config";
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

export function CheckoutFlow({ googleEnabled = false, bookingBase = "/book" }: { googleEnabled?: boolean; bookingBase?: "/book" | "/app/rent" }) {
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
    // Failed identity checks must never bypass rental verification.
    fetch("/api/account/identity", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setIdentityComplete(d?.ok ? Boolean(d.complete) : false);
      })
      .catch(() => {
        if (!cancelled) setIdentityComplete(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);
  // Featured campaign, to mention it to visitors at the sign-in step.
  const [featured, setFeatured] = useState<{ discountType: "percent" | "fixed"; discountValue: number } | null>(null);
  useEffect(() => {
    if (sessionUser || WHATSAPP_FIRST_BOOKING) return;
    let cancelled = false;
    fetch("/api/promotions/featured")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.promotion) setFeatured(d.promotion);
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
  const showroomPickup = pickup === "showroom";
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

  const [appPin, setAppPin] = useState<AppPickup | null>(null);
  const onDeliveryConfirmed = (confirmed: boolean) => {
    try {
      const pin = confirmed ? readAppPickup(sessionStorage, pickup) : null;
      setAppPin(pin);
      setCustomer(current => {
        if (pin && (!current.address || validMapsUrl(current.address))) return { ...current, address: pin.mapsUrl };
        if (!pin && current.address === appPin?.mapsUrl) return { ...current, address: "" };
        return current;
      });
    } catch { setAppPin(null); }
  };
  useEffect(() => {
    if (!appPin) return;
    const expiresAt = appPin.route?.expiresAt ?? appPin.savedAt + 30 * 60000;
    const timer = setTimeout(() => setAppPin(null), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [appPin]);
  const deliveryDistanceMeters = appPin?.route?.distanceMeters;
  const deliveryQuoteToken = appPin?.route?.token ?? null;
  const manualDeliveryQuote = needsDeliveryConfirmation(pickup, ret, Boolean(entry && isValidPeriod(period) && estimateRental(entry.modelSlug, period)?.tier.id === "monthly"), deliveryQuoteToken ? deliveryDistanceMeters : undefined);
  const whatsappCheckout = WHATSAPP_FIRST_BOOKING || manualDeliveryQuote;

  const [phase, setPhase] = useState<Phase>("extras");
  const [quantity, setQuantity] = useState(1);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  // Protection is withdrawn. Never restore a previously selected option.
  const [protection] = useState({
    cancellation: false,
    motorcycle: false,
  });
  const [promoCode, setPromoCode] = useState(referralCode);
  // Discount engine (database mode): options for this customer and
  // booking, the best one chosen unless the customer picks another.
  const [appliedCode, setAppliedCode] = useState(referralCode);
  const [discountOptions, setDiscountOptions] = useState<DiscountOptionView[]>([]);
  const [discountUnavailable, setDiscountUnavailable] = useState<UnavailableVoucherView[]>([]);
  const [bestKey, setBestKey] = useState<string | null>(null);
  const [discountKey, setDiscountKey] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<{ code: string; ok: boolean; message?: string } | null>(null);
  const [discountsLoading, setDiscountsLoading] = useState(false);
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
        sanitizeExtraQuantities(draft.extras)
      );
      setPromoCode(draft.promoCode);
      if (draft.promoCode) setAppliedCode(draft.promoCode);
      // Draft values win only where they were actually filled, so an old
      // draft never blanks the details pre-filled from the account.
      setCustomer((c) => {
        const d = draft.customer;
        return {
          ...d,
          termsAccepted: false,
          firstName: d.firstName || c.firstName,
          lastName: d.lastName || c.lastName,
          email: d.email || c.email,
          countryCode: d.whatsapp ? d.countryCode : c.countryCode,
          whatsapp: d.whatsapp || c.whatsapp,
        };
      });
    }
  }, [entryId]);

  useEffect(() => {
    if (showroomPickup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomer(current => ({ ...current, hotelName: "Werigo showroom", address: site.address.display }));
      return;
    }
    try {
      const pin = readAppPickup(sessionStorage, pickup);
      // Restore the explicitly confirmed pin from temporary tab storage.
      setAppPin(pin);
      if (pin) setCustomer(current => current.address && !validMapsUrl(current.address) ? current : { ...current, address: pin.mapsUrl });
    } catch { /* Address entry remains available. */ }
  }, [bookingBase, pickup, showroomPickup]);

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

  // Discount options for this booking (signed-in customers only).
  const modelSlugForDiscounts = entry?.modelSlug ?? "";
  useEffect(() => {
    if (whatsappCheckout || !sessionUser || !modelSlugForDiscounts || !isValidPeriod(period) || !pickup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiscountOptions([]);
      setDiscountUnavailable([]);
      setBestKey(null);
      return;
    }
    let cancelled = false;
    setDiscountsLoading(true);
    fetch("/api/checkout/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleModel: modelSlugForDiscounts,
        startAt: `${period.startDate}T${period.startTime}:00+08:00`,
        endAt: `${period.endDate}T${period.endTime}:00+08:00`,
        quantity,
        pickupArea: pickup,
        returnArea: ret,
        code: appliedCode,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setDiscountOptions(d.options);
        setDiscountUnavailable(d.unavailable ?? []);
        setBestKey(d.bestKey);
        setCodeStatus(d.codeStatus);
        // The biggest discount is always the default (management rule);
        // a newly typed code is added to the list, not forced. A manual
        // choice that no longer exists falls back to the best one.
        setDiscountKey((k) =>
          k && k !== "none" && !(d.options as DiscountOptionView[]).some((o) => o.key === k) ? null : k
        );
      })
      .catch(() => {})
      .finally(() => !cancelled && setDiscountsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionUser, modelSlugForDiscounts, period, quantity, pickup, ret, appliedCode, whatsappCheckout]);

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
      // Keep precise app delivery pins out of long-lived localStorage drafts.
      customer: bookingBase === "/app/rent" ? { ...customer, address: "" } : customer,
    });
  }, [entryId, pickup, ret, period, quantity, extraQty, protection, promoCode, customer, bookingBase]);

  // Focus heading on phase change for keyboard/screen-reader users
  useEffect(() => {
    headingRef.current?.focus();
    if (phase === "review" && !whatsappCheckout) preloadSnap();
  }, [phase, preloadSnap, whatsappCheckout]);

  const valid = entry && pickup && isValidPeriod(period);
  const days = valid ? rentalDays(period) : 0;
  const estimate = valid ? estimateRental(entry!.modelSlug, period) : null;
  const selectedDiscount =
    discountKey === "none"
      ? null
      : discountOptions.find((o) => o.key === discountKey) ?? discountOptions.find((o) => o.key === bestKey) ?? null;
  // The amount charged online: same function the server uses to price
  // the booking, so the button and the invoice never disagree.
  const quote = valid
    ? computeQuote({
        modelSlug: entry!.modelSlug,
        period,
        quantity,
        pickupSlug: pickup,
        returnSlug: ret,
        deliveryDistanceMeters,
        discountIdr: selectedDiscount?.discountIdr ?? 0,
        discountCode: selectedDiscount?.code ?? null,
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
  // Base delivery & collection fee by service area, covering
  // both legs ("antar jemput"). Waived automatically on rentals of one
  // month or longer (monthly tier), and by the team within 5 km of the
  // Wedison showroom (confirmed on WhatsApp, never assumed here).
  // Airport terminals use their own USD fee above, so this applies
  // when either point resolves to a service area.
  const touchesServiceArea = Boolean(getArea(pickup) || getArea(ret));
  const monthlyRental = estimate?.tier.id === "monthly";
  const areaFeeWaivedMonthly = Boolean(valid && monthlyRental && touchesServiceArea);
  const areaFeesIdr = quote?.areaFeeIdr ?? 0;
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
          href={bookingBase}
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
    if (!showroomPickup && !customer.hotelName.trim())
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
    if (!sessionUser || identityComplete !== true || !customer.termsAccepted) { setSubmitError("Sign in, save your rider identity and accept the rental responsibilities first."); return; }
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
      pickupAddress: [customer.hotelName, customer.address, appPin && !customer.address.includes(appPin.mapsUrl) ? appPin.mapsUrl : ""]
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
      notes: [manualDeliveryQuote ? deliveryPricingNote : "", customer.specialRequest.trim(), promoCode ? `Promo code: ${promoCode}` : ""]
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
    if (!sessionUser || identityComplete !== true || !customer.termsAccepted) { setSubmitError("Complete your rider identity and accept the rental responsibilities first."); return; }
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
          pickupAddress: [customer.hotelName, customer.address, appPin && !customer.address.includes(appPin.mapsUrl) ? appPin.mapsUrl : ""]
            .filter(Boolean)
            .join(", "),
          returnArea: ret,
          returnAddress: "",
          startAt: `${period.startDate}T${period.startTime}:00+08:00`,
          endAt: `${period.endDate}T${period.endTime}:00+08:00`,
          vehicleModel: entry.modelSlug,
          quantity,
          deliveryMethod: showroomPickup ? "pickup" : "delivery",
          customerNotes: notes,
          privacyConsent: true,
          riderResponsibilitiesAccepted: customer.termsAccepted,
          deliveryQuoteToken: deliveryQuoteToken ?? "",
          sourcePage: window.location.pathname,
          utmSource: search.get("utm_source") ?? "",
          utmMedium: search.get("utm_medium") ?? "",
          utmCampaign: search.get("utm_campaign") ?? "",
          promoCode: appliedCode,
          discountKey: discountKey === "none" ? "none" : selectedDiscount?.key ?? "",
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
      router.push(`${bookingBase}/confirmation?code=${encodeURIComponent(code)}`);
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
      {bookingBase === "/app/rent" ? <nav aria-label="Booking progress" className="wr-app-progress"><Link href={`${bookingBase}?${searchQs}&vehicle=${entryId}`} aria-label="Back to your rental"><ArrowLeft size={18}/></Link><strong>{phase === "extras" ? "Your rental · Options" : phase === "details" ? "Your rental · Rider details" : phase === "review" ? "Your rental · Review & payment" : "Your rental · Request ready"}</strong><span>{phase === "extras" ? "1 / 3" : phase === "details" ? "2 / 3" : "3 / 3"}</span></nav> : <BookingStepper current={phaseToStep[phase]} />}

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
            {bookingBase === "/app/rent" ? `${days} days` : `${period.startDate} ${period.startTime} → ${period.endDate} ${period.endTime}`}
            <Link
              href={`${bookingBase}?${searchQs}&vehicle=${entryId}`}
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
              <p className="mt-2 text-ink-soft"><T>{bookingBase === "/app/rent" ? "Choose how many motorcycles and helmets you need." : "Choose your motorcycle quantity and any helmets you need. Helmets are optional, with a maximum of 2 per booking. A phone holder is installed on the motorcycle."}</T>{" "}</p>


              {/* Quantity */}
              <div className="wr-unit-option mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-card p-5">
                <div>
                  <h2 className="font-semibold text-ink"><T>{"Number of motorcycles"}</T></h2>
                  <p className="mt-0.5 text-sm text-ink-soft"><T>{bookingBase === "/app/rent" ? "Up to 4 of the same model" : "Riding as a group? Request up to 4 of the same model."}</T>{" "}</p>
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
              <ul className="wr-extra-options mt-4 space-y-4">
                {rentalExtras.map((extra) => (
                  <li
                    key={extra.id}
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-line bg-card p-5"
                  >
                    <div>
                      <h2 className="font-semibold text-ink">
                        <T>{extra.name}</T>
                        <span className="ml-2 rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok"><T>{"Free"}</T>{" "}</span>
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-soft"><T>{bookingBase === "/app/rent" ? "Optional · maximum 2 per booking" : extra.description}</T></p>
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

              {(area?.isAirport || returnArea?.isAirport) && addOnBreakdown ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Plane className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Airport handover:"}</T>{" "}{area?.isAirport ? `delivery fee ${formatUsdFee(1)}` : ""}
                  {area?.isAirport && returnArea?.isAirport ? " and " : ""}
                  {returnArea?.isAirport ? `collection fee ${formatUsdFee(1)}` : ""}<T>{", once per booking."}</T>{" "}</p>
              ) : null}

              {!showroomPickup && pickup === ret && <DeliveryFeePicker key={pickup} area={pickup} pin={appPin} onConfirmed={onDeliveryConfirmed}/>}
              {manualDeliveryQuote && bookingBase === "/book" && <p className="mt-3 text-sm text-ink-soft">{deliveryPricingNote}</p>}
              {areaFeesIdr > 0 ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Truck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Delivery & collection:"}</T>{" "}{formatIdr(areaFeesIdr)}<T>{", once per booking."}</T>{" "}<T>{bookingBase === "/app/rent" ? "Calculated by road distance from our showroom; delivery and collection included." : deliveryFeeWaiverNote}</T>
                </p>
              ) : deliveryDistanceMeters !== undefined && deliveryDistanceMeters <= 5000 ? (<p className="mt-4 rounded-xl bg-primary-faint px-4 py-3 text-sm">Delivery & collection are free: your road route is within 5 km of Werigo.</p>) : areaFeeWaivedMonthly ? (
                <p className="mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Truck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" /><T>{"Delivery and collection are free on this rental because it is one month or longer."}</T>{" "}</p>
              ) : null}

              {bookingBase === "/app/rent" && <section className="wr-policy"><h2>Before you book</h2><p><strong>Cancellation & refunds.</strong> {cancellationPolicy.approved ? cancellationPolicy.summary : "Ask Werigo to confirm the applicable cancellation fee and refund terms before you pay."}</p><p className="mt-3"><strong>Return battery.</strong> {batteryReturnNote}</p><Link href="/terms" target="_blank" className="mt-3 inline-flex text-xs">Read rental terms ↗</Link></section>}
              {/* Included with every rental */}
              {bookingBase === "/book" && <><h2 className="mt-8 font-display text-2xl text-ink"><T>{"Included with every rental"}</T>{" "}</h2>
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

              </> }
              {/* Vouchers (database mode) / promo code note (WhatsApp mode) */}
              {!whatsappCheckout ? (
                <div className="mt-4">
                  <VoucherPicker
                    signedIn={Boolean(sessionUser)}
                    options={discountOptions}
                    unavailable={discountUnavailable}
                    bestKey={bestKey}
                    selectedKey={discountKey}
                    onSelect={setDiscountKey}
                    loading={discountsLoading}
                    code={promoCode}
                    onCodeChange={setPromoCode}
                    onApply={() => setAppliedCode(promoCode.trim())}
                    codeStatus={codeStatus}
                  />
                </div>
              ) : (
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !whatsappCheckout) {
                        e.preventDefault();
                        setAppliedCode(promoCode.trim());
                      }
                    }}
                    placeholder={t("Enter a code")}
                    className={inputClass()}
                  />
                  {!whatsappCheckout ? (
                    <Button type="button" variant="outline" onClick={() => setAppliedCode(promoCode.trim())}>
                      <T>{"Apply"}</T>
                    </Button>
                  ) : null}
                </div>
                {!whatsappCheckout && codeStatus && codeStatus.code === promoCode.trim().toUpperCase() ? (
                  <p role="status" className={`mt-1.5 text-xs font-medium ${codeStatus.ok ? "text-ok" : "text-danger"}`}>
                    <T>{codeStatus.ok ? "Code added. We apply your biggest discount automatically; compare them at the review step." : codeStatus.message ?? "This code cannot be used."}</T>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-faint"><T>{whatsappCheckout
                    ? "Have a code from our team or a partner? It's included in your WhatsApp request and applied to your final quote."
                    : "Promo, voucher or referral code. We pick your best discount automatically, and you can choose another at the review step."}</T>{" "}</p>
                )}
              </div>
              )}

              <div className="mt-8 flex justify-between gap-3 pb-20 lg:pb-0">
                <Link
                  href={`${bookingBase}?${searchQs}&vehicle=${entryId}`}
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
                    {!whatsappCheckout && quote ? (
                      <>
                        <span className="block text-xs"><T>{"Total to pay"}</T></span>
                        <span className="font-bold text-ink">{formatIdr(quote.totalIdr)}</span>
                        {quote.discountIdr > 0 ? (
                          <span className="ml-1.5 text-xs text-ink-faint line-through">{formatIdr(quote.baseIdr + quote.areaFeeIdr)}</span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="block text-xs"><T>{"Estimated total"}</T></span>
                        <span className="font-bold text-ink">
                          {grandTotalIdr !== null
                            ? formatIdr(grandTotalIdr)
                            : estimate
                              ? `${formatIdr(estimate.totalIdr * quantity)} + ${formatUsdFee(addOnBreakdown?.totalUsd ?? 0)}`
                              : ""}
                        </span>
                      </>
                    )}
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
              <p className="mt-2 text-xs leading-relaxed text-ink-faint"><T>{"Your passport, KTP or KITAS number is required before submitting a rental. A driving licence number is optional. Please do not upload document photos here."}</T>{" "}</p>

              <form
                className="mt-6 grid gap-5 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateDetails()) setPhase("review");
                }}
                noValidate
              >
                {appPin && <div className="wr-checkout-pin sm:col-span-2"><strong>Delivery location saved</strong><a href={appPin.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a><p>Add your hotel, villa or room details below. Your saved pin is already included with your booking request.</p></div>}
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
                ).filter(field => !showroomPickup || !["hotelName", "address", "flightNumber"].includes(field.key)).map((field) => (
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

                <section className="sm:col-span-2 wr-rider-policy" aria-label="Rider responsibilities"><h2 className="text-base font-semibold">Rider responsibilities</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">{riderLicenceNotice}</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">{riderFinesNotice}</p><small className="mt-2 block text-ink-faint">Policy {RIDER_POLICY_VERSION}</small></section>
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
                    <span className="text-sm text-ink-soft"><T>{"I accept the rider responsibilities above and the"}</T>{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary-strong"
                      ><T>{"rental terms and conditions"}</T>{" "}</Link>{" "}<T>{"and understand that a licence valid for riding in Indonesia is required by law."}</T>{" "}</span>
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
              <p className="mt-2 text-ink-soft"><T>{whatsappCheckout
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
                          term: whatsappCheckout ? "Estimated total" : "Rental",
                          detail: `${formatIdr(estimate.totalIdr * quantity)}${
                            formatUsdApprox(estimate.totalIdr * quantity, usdRate)
                              ? ` (${formatUsdApprox(estimate.totalIdr * quantity, usdRate)})`
                              : ""
                          } ${t("for")} ${days} ${t("days")}${quantity > 1 ? ` × ${quantity} ${t("motorcycles")}` : ""}.${whatsappCheckout ? ` ${t("Confirmed with availability on WhatsApp.")}` : ""}`,
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
                            whatsappCheckout ? "" : t("Not included in the online payment; confirmed by our team."),
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        },
                      ]
                    : []),
                  ...(whatsappCheckout && addOnBreakdown && (addOnBreakdown.totalUsd > 0 || areaFeesIdr > 0)
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
                  ...(!whatsappCheckout && quote && quote.discountIdr > 0 && selectedDiscount
                    ? [
                        {
                          term: "Voucher",
                          detail: `−${formatIdr(quote.discountIdr)} (${t(selectedDiscount.title)}, ${selectedDiscount.code})`,
                        },
                      ]
                    : []),
                  ...(!whatsappCheckout && quote
                    ? [
                        {
                          term: "Total to pay now",
                          detail: `${formatIdr(quote.totalIdr)}${
                            formatUsdApprox(quote.totalIdr, usdRate)
                              ? ` (${formatUsdApprox(quote.totalIdr, usdRate)})`
                              : ""
                          }. ${t("Your selected helmets are provided at no additional charge.")}`,
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
                  <span className="text-sm text-ink-soft"><T>{whatsappCheckout
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

              {!whatsappCheckout && sessionUser && identityComplete !== false ? (
                <div className="mt-6">
                  <VoucherPicker
                    signedIn
                    options={discountOptions}
                    unavailable={discountUnavailable}
                    bestKey={bestKey}
                    selectedKey={discountKey}
                    onSelect={setDiscountKey}
                    loading={discountsLoading}
                    code={promoCode}
                    onCodeChange={setPromoCode}
                    onApply={() => setAppliedCode(promoCode.trim())}
                    codeStatus={codeStatus}
                  />
                </div>
              ) : null}
              {manualDeliveryQuote && <p role="status" className="mt-4 rounded-xl border border-line p-4 text-sm">Your delivery fee is a base estimate. We will confirm the route distance, any surcharge and your final total on WhatsApp before payment. This sends an enquiry; your booking is confirmed by our team.</p>}
              {bookingBase === "/app/rent" && <section className="wr-policy"><h2>{whatsappCheckout ? "Confirm quote before payment" : "Payment"}</h2><p>{whatsappCheckout ? "Send your request to Werigo first. Our team confirms availability, the final total and applicable cancellation terms before arranging payment. No charge is made by this request." : "Continue to secure Midtrans checkout to choose from the payment methods available for your booking, including cards and QRIS when supported."}</p></section>}
              {submitError ? (
                <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
                  <T>{submitError}</T>
                </p>
              ) : null}
              {!sessionUser ? (
                <div className="mt-6 rounded-[14px] border border-line bg-card p-6">
                  <h2 className="font-display text-xl text-ink"><T>{"Sign in to rent"}</T></h2>
                  <p className="mt-1 text-sm text-ink-soft"><T>{"Your booking, payment and receipt are kept in your Werigo account. Everything you filled in above stays here."}</T></p>
                  {featured ? (
                    <p className="mt-3 rounded-[10px] bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                      <T>{"New here? Create an account and get"}</T>{" "}
                      {featured.discountType === "percent" ? `${featured.discountValue}%` : formatIdr(featured.discountValue)}{" "}
                      <T>{"off this rental."}</T>
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <AuthForm
                      googleEnabled={googleEnabled}
                      appMode={bookingBase === "/app/rent"}
                      heading={false}
                      callbackURL={`${bookingBase}/checkout?${params.toString()}`}
                      onSuccess={() => setSubmitError(null)}
                    />
                  </div>
                </div>
              ) : sessionUser && identityComplete === false ? (
                <div className="mt-6 rounded-[14px] border border-line bg-card p-6">
                  <IdentityForm
                    heading="Your rider documents"
                    intro="Passport, KTP or KITAS is required to rent. Your driving licence number is optional. Everything you filled in above stays here."
                    submitLabel="Save rider identity"
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
                    onClick={() => (whatsappCheckout ? sendToWhatsApp() : void confirmBooking())}
                    disabled={submitting || identityComplete !== true || (!whatsappCheckout && !quote)}
                    className="w-full sm:w-auto"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    {submitting ? (
                      <T>{whatsappCheckout ? "Saving your request…" : "Opening secure payment…"}</T>
                    ) : whatsappCheckout ? (
                      <T>{"Send booking request on WhatsApp"}</T>
                    ) : (
                      <><T>{"Pay"}</T>{quote ? ` ${formatIdr(quote.totalIdr)}` : ""}</>
                    )}{" "}</Button>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink-faint"><T>{whatsappCheckout
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
                  href={bookingBase === "/book" ? "/" : bookingBase}
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
            pickupLabel={showroomPickup ? "Pick-up & return" : "Delivery"}
            returnName={ret !== pickup ? returnArea?.name : undefined}
            estimate={estimate}
            addOnBreakdown={addOnBreakdown}
            areaFeeIdr={areaFeesIdr}
            areaFeeWaived={areaFeeWaivedMonthly || deliveryDistanceMeters !== undefined && deliveryDistanceMeters <= 5000}
            payable={
              !whatsappCheckout && quote
                ? {
                    rentalIdr: quote.baseIdr,
                    areaFeeIdr: quote.areaFeeIdr,
                    discountIdr: quote.discountIdr,
                    discountLabel: selectedDiscount ? `${selectedDiscount.title} · ${selectedDiscount.code}` : null,
                    totalIdr: quote.totalIdr,
                  }
                : null
            }
          />
        </aside>
      </div>
    </div>
  );
}
