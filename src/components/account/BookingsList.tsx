"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CreditCard, Inbox, MessageCircle, RefreshCw } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toCustomerEntry } from "@/data/vehicles";
import { getPickupPoint } from "@/data/locations";
import { formatIdr } from "@/lib/pricing";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { useSnap } from "@/lib/useSnap";
import type { PublicBooking } from "@/lib/bookingView";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** One human label per booking, combining payment and ops status. */
export function bookingBadge(b: PublicBooking): { label: string; tone: string } {
  if (b.status === "cancelled") return { label: "Cancelled", tone: "bg-danger-soft text-danger" };
  if (b.paymentStatus === "refunded") return { label: "Refunded", tone: "bg-sunken text-ink-soft" };
  if (b.paymentStatus === "pending") return { label: "Awaiting payment", tone: "bg-warn-soft text-warn" };
  if (b.paymentStatus === "expired" || b.paymentStatus === "failed") return { label: "Payment not completed", tone: "bg-danger-soft text-danger" };
  if (b.status === "completed") return { label: "Completed", tone: "bg-sunken text-ink-soft" };
  if (b.status === "active") return { label: "On the road", tone: "bg-ok-soft text-ok" };
  if (b.paymentStatus === "paid") return { label: "Paid, confirmed", tone: "bg-ok-soft text-ok" };
  return { label: "Request received", tone: "bg-primary-faint text-primary" };
}

export function canPay(b: PublicBooking): boolean {
  return (
    (b.paymentStatus === "pending" || b.paymentStatus === "expired" || b.paymentStatus === "failed") &&
    b.status !== "cancelled" &&
    new Date(b.startAt).getTime() > Date.now()
  );
}

export function BookingsList() {
  const [bookings, setBookings] = useState<PublicBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const { pay } = useSnap();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/account/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setBookings(data.bookings);
    } catch {
      setError("Couldn't load your bookings. Please try again.");
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function payNow(code: string) {
    setPaying(code);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(code)}/pay`, { method: "POST" });
      const data = await res.json();
      if (!data.ok || !data.payment?.snapToken) {
        setError(
          data.error === "sold_out"
            ? "This model is no longer available for those dates. Please start a new booking."
            : data.error === "already_paid"
              ? "This booking is already paid."
              : "We couldn't start the payment. Please try again or contact us on WhatsApp."
        );
        await load();
        return;
      }
      await pay(data.payment.snapToken);
      await load();
    } finally {
      setPaying(null);
    }
  }

  if (bookings === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading bookings">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-[14px] bg-sunken" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          <T>{error}</T>
        </p>
      ) : null}
      {bookings.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
          <Inbox className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink"><T>{"No bookings yet"}</T></h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft"><T>{"Your bookings and payments will appear here."}</T></p>
          <ButtonLink href="/book" variant="accent" className="mt-5"><T>{"Find a ride"}</T></ButtonLink>
        </div>
      ) : (
        <ul className="space-y-4">
          {bookings.map((b) => {
            const badge = bookingBadge(b);
            const entry = toCustomerEntry(b.vehicleModel);
            return (
              <li key={b.bookingCode} className="rounded-[14px] border border-line bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="tnum text-sm font-semibold text-primary">{b.bookingCode}</p>
                    <h3 className="mt-0.5 font-display text-xl text-ink">
                      {entry?.displayName ?? b.vehicleModel} × {b.quantity}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.tone}`}><T>{badge.label}</T></span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2 text-ink-soft">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <dd className="tnum">{fmt(b.startAt)} → {fmt(b.endAt)}</dd>
                  </div>
                  <div className="text-ink-soft">
                    <dt className="sr-only">Delivery</dt>
                    <dd>{getPickupPoint(b.pickupArea)?.name ?? b.pickupArea}{b.pickupAddress ? `, ${b.pickupAddress}` : ""}</dd>
                  </div>
                  {b.totalIdr !== null ? (
                    <div className="text-ink-soft">
                      <dt className="sr-only">Total</dt>
                      <dd className="tnum">
                        <T>{"Total"}</T>: <strong className="font-semibold text-ink">{formatIdr(b.totalIdr)}</strong>
                        {b.paymentStatus === "pending" && b.paymentExpiresAt ? (
                          <span className="text-ink-faint"> · <T>{"pay before"}</T> {fmt(b.paymentExpiresAt)}</span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canPay(b) ? (
                    <Button variant="accent" size="sm" disabled={paying === b.bookingCode} onClick={() => void payNow(b.bookingCode)}>
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      {paying === b.bookingCode ? <T>{"Opening payment…"}</T> : <T>{"Pay now"}</T>}
                    </Button>
                  ) : null}
                  <ButtonLink href={`/book/confirmation?code=${encodeURIComponent(b.bookingCode)}`} variant="outline" size="sm">
                    <T>{"Details"}</T>
                  </ButtonLink>
                  <a
                    href={buildSupportWhatsAppUrl(`Hi Werigo, about my booking ${b.bookingCode}:`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-faint"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <T>{"Refresh"}</T>
        </Button>
      </div>
    </div>
  );
}
