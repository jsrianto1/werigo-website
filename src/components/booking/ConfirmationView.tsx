"use client";
import { T } from "@/components/i18n/LanguageProvider";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, CreditCard, MessageCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toCustomerEntry } from "@/data/vehicles";
import { getPickupPoint } from "@/data/locations";
import { formatIdr } from "@/lib/pricing";
import { useSnap } from "@/lib/useSnap";
import type { PublicBooking, PublicPayment } from "@/lib/bookingView";

/**
 * Confirmation / payment status page for a stored booking. The state
 * always comes from the server (which re-checks Midtrans while a
 * payment is pending), never from URL parameters or the Snap popup.
 */
interface Loaded {
  booking: PublicBooking;
  payment: PublicPayment | null;
  whatsappUrl: string;
}

export function ConfirmationView() {
  const params = useSearchParams();
  const code = (params.get("code") ?? "").toUpperCase();
  const [state, setState] = useState<"loading" | "ok" | "auth" | "missing" | "error">("loading");
  const [data, setData] = useState<Loaded | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Captured when data loads so render stays pure (no Date.now() in render).
  const [now, setNow] = useState(0);
  const { pay, preload } = useSnap();

  const load = useCallback(async () => {
    if (!code) {
      setState("missing");
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (res.status === 401) return setState("auth");
      if (res.status === 404) return setState("missing");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json);
      setNow(Date.now());
      setState("ok");
    } catch {
      setState("error");
    }
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // While a payment is pending, poll a few times so a webhook that
  // lands after the popup closed is reflected without a reload.
  const pending = data?.booking.paymentStatus === "pending";
  useEffect(() => {
    if (!pending) return;
    preload();
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > 24) clearInterval(id); // ~2 minutes
      void load();
    }, 5000);
    return () => clearInterval(id);
  }, [pending, load, preload]);

  async function payNow() {
    if (!data) return;
    setPaying(true);
    setActionError(null);
    try {
      let token = data.payment?.snapToken ?? null;
      if (!token) {
        const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/pay`, { method: "POST" });
        const json = await res.json();
        if (!json.ok || !json.payment?.snapToken) {
          setActionError(
            json.error === "sold_out"
              ? "This model is no longer available for those dates. Please start a new booking."
              : "We couldn't start the payment. Please try again or contact us on WhatsApp."
          );
          await load();
          return;
        }
        token = json.payment.snapToken;
      }
      const { outcome } = await pay(token!);
      if (outcome === "error") setActionError("The payment could not be completed. You can try again.");
      await load();
    } finally {
      setPaying(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (state === "loading") {
    return (
      <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-[14px] bg-sunken" aria-busy="true" aria-label="Loading confirmation" />
    );
  }

  if (state === "missing" || state === "error") {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink"><T>{state === "missing" ? "No booking to show" : "We couldn't load this booking"}</T></h1>
        <p className="mt-3 text-ink-soft"><T>{state === "missing" ? "Start a booking and your confirmation will appear here." : "Please refresh the page or open it from your account."}</T></p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/account" variant="outline"><T>{"My bookings"}</T></ButtonLink>
          <ButtonLink href="/book" variant="accent"><T>{"Start a new booking"}</T></ButtonLink>
        </div>
      </div>
    );
  }

  if (state === "auth") {
    const next = `/book/confirmation?code=${encodeURIComponent(code)}`;
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink"><T>{"Sign in to see this booking"}</T></h1>
        <p className="mt-3 text-ink-soft"><T>{"Booking"}</T> <span className="tnum font-semibold text-ink">{code}</span> <T>{"belongs to a Werigo account. Sign in with the account you used at checkout."}</T></p>
        <ButtonLink href={`/account/login?next=${encodeURIComponent(next)}`} variant="accent" className="mt-6"><T>{"Sign in"}</T></ButtonLink>
      </div>
    );
  }

  const b = data!.booking;
  const entry = toCustomerEntry(b.vehicleModel);
  const paid = b.paymentStatus === "paid";
  const closed = b.paymentStatus === "expired" || b.paymentStatus === "failed";
  const cancelled = b.status === "cancelled";
  const refunded = b.paymentStatus === "refunded";
  const canPay = (pending || closed) && !cancelled && new Date(b.startAt).getTime() > now;

  const headline = cancelled
    ? "Booking cancelled"
    : refunded
      ? "Booking refunded"
      : paid
        ? "Booking confirmed"
        : pending
          ? "Complete your payment"
          : closed
            ? "Payment not completed"
            : "Booking request received";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden="true" />
        ) : pending ? (
          <Clock3 className="mx-auto h-12 w-12 text-warn" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-faint" aria-hidden="true" />
        )}
        <h1 className="mt-4 font-display text-3xl text-ink md:text-4xl"><T>{headline}</T></h1>
        <p className="tnum mt-3 inline-block rounded-full bg-primary-faint px-4 py-1.5 text-sm font-semibold text-primary"><T>{"Booking code:"}</T> {b.bookingCode}</p>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          {paid ? (
            <><T>{"Thank you"}</T>, <strong className="font-semibold text-ink">{b.fullName}</strong>. <T>{"Your payment is received and your ride is reserved. We sent a confirmation to your WhatsApp; our team will message you before delivery."}</T></>
          ) : pending ? (
            <><T>{"Your ride is held for you until"}</T> <strong className="tnum font-semibold text-ink">{b.paymentExpiresAt ? fmt(b.paymentExpiresAt) : ""}</strong> <T>{"(Bali time). Finish the payment to confirm it."}</T></>
          ) : closed && canPay ? (
            <T>{"The payment window closed before the payment went through. You can try again if the dates are still available."}</T>
          ) : (
            <T>{"Quote your booking code in any conversation with our team."}</T>
          )}
        </p>
      </div>

      {actionError ? (
        <p role="alert" className="mt-6 rounded-[10px] bg-danger-soft px-3 py-2 text-center text-sm text-danger"><T>{actionError}</T></p>
      ) : null}

      {canPay ? (
        <div className="mt-6 text-center">
          <Button variant="accent" size="lg" disabled={paying} onClick={() => void payNow()}>
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            {paying ? <T>{"Opening payment…"}</T> : (
              <>
                <T>{pending ? "Pay" : "Pay again"}</T>{b.totalIdr !== null ? ` ${formatIdr(b.totalIdr)}` : ""}
              </>
            )}
          </Button>
          <p className="mt-2 text-xs text-ink-faint"><T>{"Secure payment by Midtrans: cards, bank transfer, QRIS and e-wallets."}</T></p>
        </div>
      ) : null}

      <dl className="mt-8 space-y-3 rounded-[14px] border border-line bg-card p-6">
        {[
          { term: "Ride", detail: `${entry?.displayName ?? b.vehicleModel} × ${b.quantity}` },
          { term: "Period", detail: `${fmt(b.startAt)} → ${fmt(b.endAt)}` },
          {
            term: "Delivery",
            detail: `${getPickupPoint(b.pickupArea)?.name ?? b.pickupArea}${b.pickupAddress ? `, ${b.pickupAddress}` : ""}`,
          },
          {
            term: "Return",
            detail: b.returnArea !== b.pickupArea ? getPickupPoint(b.returnArea)?.name ?? b.returnArea : "Same as delivery",
          },
          ...(b.customerNotes ? [{ term: "Notes", detail: b.customerNotes }] : []),
          ...(b.totalIdr !== null
            ? [
                {
                  term: "Price",
                  detail: [
                    b.baseIdr !== null && b.rentalDays !== null && b.ratePerDayIdr !== null
                      ? `${formatIdr(b.ratePerDayIdr)} × ${b.rentalDays} days${b.quantity > 1 ? ` × ${b.quantity}` : ""} = ${formatIdr(b.baseIdr)}`
                      : "",
                    b.areaFeeIdr > 0 ? `Delivery & collection ${formatIdr(b.areaFeeIdr)}` : "",
                    b.discountIdr > 0 ? `Discount −${formatIdr(b.discountIdr)}` : "",
                    `Total ${formatIdr(b.totalIdr)}${paid ? " (paid)" : ""}`,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                },
              ]
            : [{ term: "Rate", detail: "Confirmed with your quote on WhatsApp" }]),
        ].map((row) => (
          <div key={row.term} className="grid gap-1 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm font-semibold text-ink"><T>{row.term}</T></dt>
            <dd className="tnum whitespace-pre-line text-sm text-ink-soft">{row.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href={data!.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" /><T>{"Message us on WhatsApp"}</T>
        </a>
        <Link
          href="/account"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary-strong"
        ><T>{"My bookings"}</T> <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint"><T>{"Keep your booking code handy. It identifies your booking in every conversation with our team."}</T></p>
    </div>
  );
}
