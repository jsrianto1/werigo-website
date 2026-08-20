"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { confirmedBenefits, cardPaymentFeeNote } from "@/data/commercialTerms";
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
import { buildDirectBookingWhatsAppUrl } from "@/lib/whatsapp";
import {
  emptyCustomer,
  saveDraft,
  loadDraft,
  clearDraft,
  type CustomerInfo,
} from "@/lib/booking";

type Phase = "extras" | "details" | "review" | "sent";

const phaseToStep: Record<Phase, number> = {
  extras: 2,
  details: 3,
  review: 4,
  sent: 5,
};

export function CheckoutFlow() {
  const params = useSearchParams();

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
  }, [phase]);

  const valid = entry && pickup && isValidPeriod(period);
  const days = valid ? rentalDays(period) : 0;
  const estimate = valid ? estimateRental(entry!.modelSlug, period) : null;
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
  // both legs ("antar jemput"), waived only within 5 km of the Wedison
  // showroom (confirmed on WhatsApp, never assumed here). Airport
  // terminals use their own USD fee above, so this applies when either
  // point resolves to a service area.
  const areaFeesIdr = valid
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
        <h1 className="font-display text-3xl text-ink">
          Your booking session is incomplete
        </h1>
        <p className="mt-3 text-ink-soft">
          We couldn&apos;t find the ride or dates for this checkout.
          {" "}{MIN_RENTAL_MESSAGE} Start a fresh search. It only takes a
          moment.
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
      tierLabel: `${estimate.tier.label} (${estimate.tier.range})`,
      ratePerDayIdr: estimate.ratePerDayIdr,
      estimatedTotalIdr: estimate.totalIdr * quantity,
      baseUsdApprox: formatUsdApprox(estimate.totalIdr * quantity, usdRate),
      areaFeeIdr: areaFeesIdr,
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
    setWhatsappUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
    clearDraft();
    setPhase("sent");
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
            ·{" "}
            {area?.isAirport ? (
              <Plane className="inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
            ) : null}{" "}
            {area?.name}
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
                Two sanitised helmets and one installed phone holder are
                already included. Add-on requests below are optional, and
                their price and availability are confirmed on WhatsApp.
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
                        <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-faint">
                          Price on request
                        </span>
                      </h2>
                      <p className="mt-0.5 text-sm text-ink-soft">{extra.description}</p>
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
              <h2 className="mt-8 font-display text-2xl text-ink">
                Optional protection
              </h2>
              <ul className="mt-3 space-y-4">
                {[
                  {
                    key: "cancellation" as const,
                    name: "Cancellation Protection",
                    price: `${formatUsdFee(0.5)} per rental day`,
                    amount: addOnBreakdown?.cancellationProtectionUsd ?? 0,
                    computed: formatUsdFee(0.5 * days),
                    copy: protectionCopy.cancellation,
                  },
                  {
                    key: "motorcycle" as const,
                    name: "Motorcycle Protection",
                    price: `${formatUsdFee(4.95)} per motorcycle, per rental day`,
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
                            {item.name}
                          </h3>
                          <p className="tnum mt-0.5 text-sm font-medium text-ink-soft">
                            {item.price}
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                            {item.copy}
                          </p>
                          {selected ? (
                            <p className="tnum mt-2 text-sm font-semibold text-primary">
                              Added: {item.computed} for this booking
                            </p>
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
                          {selected ? "Remove" : "Add"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {(area?.isAirport || returnArea?.isAirport) && addOnBreakdown ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Plane className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" />
                  Airport handover: {area?.isAirport ? `delivery fee ${formatUsdFee(1)}` : ""}
                  {area?.isAirport && returnArea?.isAirport ? " and " : ""}
                  {returnArea?.isAirport ? `collection fee ${formatUsdFee(1)}` : ""}, once per
                  booking.
                </p>
              ) : null}

              {areaFeesIdr > 0 ? (
                <p className="tnum mt-4 rounded-[10px] bg-primary-faint px-4 py-2.5 text-sm text-ink-soft">
                  <Truck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" />
                  Delivery & collection: {formatIdr(areaFeesIdr)}, once per
                  booking. {deliveryFeeWaiverNote}
                </p>
              ) : null}

              {/* Included with every rental */}
              <h2 className="mt-8 font-display text-2xl text-ink">
                Included with every rental
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {confirmedBenefits.map((b) => (
                  <li
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-faint px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    <b.icon className="h-4 w-4" aria-hidden="true" />
                    {b.label}
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
                  Have a code from our team or a partner? It&apos;s included in
                  your WhatsApp request and applied to your final quote.
                </p>
              </div>

              <div className="mt-8 flex justify-between gap-3 pb-20 lg:pb-0">
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

              {/* Compact mobile summary bar (services step only) */}
              <div
                className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page/95 px-4 py-3 backdrop-blur-sm lg:hidden"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="tnum min-w-0 text-sm leading-snug text-ink-soft">
                    <span className="block text-xs">Estimated total</span>
                    <span className="font-bold text-ink">
                      {grandTotalIdr !== null
                        ? formatIdr(grandTotalIdr)
                        : estimate
                          ? `${formatIdr(estimate.totalIdr * quantity)} + ${formatUsdFee(addOnBreakdown?.totalUsd ?? 0)}`
                          : ""}
                    </span>
                  </p>
                  <Button variant="accent" onClick={() => setPhase("details")}>
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              >
                Who&apos;s riding?
              </h1>
              <p className="mt-2 text-ink-soft">
                We use these details for delivery and to reply to your booking
                request, and for nothing else.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                What to prepare: after availability is confirmed, Werigo may
                request a valid driving licence and identification through a
                separately approved secure process. Please don&apos;t send
                document photos through this form.
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
                      <span className="text-sm text-ink-soft">
                        I confirm the rider is at least 25 years old, as
                        required for the Wedison EdPower.
                      </span>
                    </label>
                    {errors.ageConfirmed ? (
                      <p
                        id="error-ageConfirmed"
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-danger"
                      >
                        {errors.ageConfirmed}
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
                  ...(estimate
                    ? [
                        {
                          term: "Pricing tier",
                          detail: `${estimate.tier.label} (${estimate.tier.range})`,
                        },
                        {
                          term: "Rate",
                          detail: `${formatIdr(estimate.ratePerDayIdr)} per day${
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
                          } for ${days} day${days === 1 ? "" : "s"}${quantity > 1 ? ` × ${quantity} motorcycles` : ""}. Confirmed with availability on WhatsApp.`,
                        },
                      ]
                    : []),
                  ...(areaFeesIdr > 0
                    ? [
                        {
                          term: "Delivery & collection",
                          detail: `${formatIdr(areaFeesIdr)} once per booking. ${deliveryFeeWaiverNote}`,
                        },
                      ]
                    : []),
                  ...(addOnBreakdown && addOnBreakdown.totalUsd > 0
                    ? [
                        {
                          term: "Add-ons",
                          detail: [
                            addOnBreakdown.airportDeliveryUsd > 0
                              ? `Airport delivery fee ${formatUsdFee(addOnBreakdown.airportDeliveryUsd)}`
                              : "",
                            addOnBreakdown.airportCollectionUsd > 0
                              ? `Airport collection fee ${formatUsdFee(addOnBreakdown.airportCollectionUsd)}`
                              : "",
                            addOnBreakdown.cancellationProtectionUsd > 0
                              ? `Cancellation Protection ${formatUsdFee(addOnBreakdown.cancellationProtectionUsd)}`
                              : "",
                            addOnBreakdown.motorcycleProtectionUsd > 0
                              ? `Motorcycle Protection ${formatUsdFee(addOnBreakdown.motorcycleProtectionUsd)}`
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
                                }. Confirmed with availability on WhatsApp.`
                              : `${formatIdr((estimate?.totalIdr ?? 0) * quantity + areaFeesIdr)} plus ${formatUsdFee(addOnBreakdown.totalUsd)} add-ons. Confirmed with availability on WhatsApp.`,
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
                    <dt className="text-sm font-semibold text-ink">{row.term}</dt>
                    <dd className="tnum text-sm text-ink-soft">{row.detail}</dd>
                  </div>
                ))}
              </dl>

              {/* Battery-return acknowledgement — required */}
              <div className="mt-6 rounded-[10px] border border-line bg-primary-faint p-4">
                <p className="text-sm leading-relaxed text-ink">
                  {batteryReturnNote}
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
                  <span className="text-sm text-ink-soft">
                    I understand, and I&apos;ll arrange anything different with
                    the team on WhatsApp.
                  </span>
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
                  <span className="text-sm text-ink-soft">
                    I agree to send these details to Werigo through WhatsApp so
                    the team can respond to my booking request. See the{" "}
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

              <div className="mt-6">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => sendToWhatsApp()}
                  className="w-full sm:w-auto"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Send booking request on WhatsApp
                </Button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                Availability, final pricing, delivery, add-ons and your
                booking are confirmed by the Werigo team on WhatsApp. Nothing
                is charged before that. {cardPaymentFeeNote}
              </p>

              <div className="mt-6">
                <Button variant="ghost" onClick={() => setPhase("details")}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Edit details
                </Button>
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
              >
                Your request is ready in WhatsApp
              </h1>
              <p className="mt-3 max-w-xl text-ink-soft">
                WhatsApp should have opened with your booking request. Send the
                message and our team will reply with availability and your
                quote. If WhatsApp did not open, use the button below.
              </p>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Open WhatsApp
                </a>
              ) : null}
              <p className="mt-5 text-xs leading-relaxed text-ink-faint">
                Your rental stays a request until our team confirms
                availability and you approve the quote. Nothing is booked or
                charged before that.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  Back to home
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
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
            estimate={estimate}
            addOnBreakdown={addOnBreakdown}
            areaFeeIdr={areaFeesIdr}
          />
        </aside>
      </div>
    </div>
  );
}
