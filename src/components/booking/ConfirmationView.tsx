"use client";
import { T } from "@/components/i18n/LanguageProvider";


import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { readConfirmation, type ConfirmationPayload } from "@/lib/booking";
import { toCustomerEntry } from "@/data/vehicles";
import { getArea } from "@/data/locations";

/**
 * Step 8: confirmation. The booking is already stored in the
 * database at this point — this screen shows the database booking
 * code and offers the WhatsApp continuation (same code, same
 * details, built server-side).
 */
export function ConfirmationView() {
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const [payload, setPayload] = useState<ConfirmationPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  // sessionStorage is client-only — read after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(readConfirmation(code));
    setLoaded(true);
  }, [code]);

  if (!loaded) {
    return (
      <div
        className="mx-auto h-96 max-w-2xl animate-pulse rounded-[14px] bg-sunken"
        aria-busy="true"
        aria-label="Loading confirmation"
      />
    );
  }

  if (!code) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink"><T>{"No booking to show"}</T></h1>
        <p className="mt-3 text-ink-soft"><T>{"Start a booking and your confirmation will appear here."}</T>{" "}</p>
        <Link
          href="/book"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        ><T>{"Start a new booking"}</T>{" "}</Link>
      </div>
    );
  }

  const b = payload?.booking;
  const entry = b ? toCustomerEntry(b.vehicleModel) : undefined;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl text-ink md:text-4xl"><T>{"Booking request received"}</T>{" "}</h1>
        <p className="tnum mt-3 inline-block rounded-full bg-primary-faint px-4 py-1.5 text-sm font-semibold text-primary"><T>{"Booking code:"}</T>{" "}{code}
        </p>
        <p className="mx-auto mt-4 max-w-md text-ink-soft"><T>{"Your booking is saved."}</T>{" "}
          {b ? (
            <><T>{"Continue to WhatsApp and our team will confirm availability and your rate with"}</T>{" "}
              <strong className="font-semibold text-ink">{b.fullName}</strong>.
            </>
          ) : (
            "Quote your booking code in any conversation with our team."
          )}{" "}<T>{"Nothing is charged until you approve the final quote."}</T>{" "}</p>
      </div>

      {b ? (
        <dl className="mt-8 space-y-3 rounded-[14px] border border-line bg-card p-6">
          {[
            {
              term: "Ride",
              detail: `${entry?.displayName ?? b.vehicleModel} × ${b.quantity}`,
            },
            {
              term: "Period",
              detail: `${fmt(b.startAt)} → ${fmt(b.endAt)}`,
            },
            {
              term: "Delivery",
              detail: `${getArea(b.pickupArea)?.name ?? b.pickupArea}${
                b.pickupAddress ? `, ${b.pickupAddress}` : ""
              }`,
            },
            {
              term: "Return",
              detail:
                b.returnArea !== b.pickupArea
                  ? getArea(b.returnArea)?.name ?? b.returnArea
                  : "Same as delivery",
            },
            ...(b.customerNotes
              ? [{ term: "Notes", detail: b.customerNotes }]
              : []),
            {
              term: "Rate",
              detail:
                "Available upon request and confirmed with your quote on WhatsApp",
            },
          ].map((row) => (
            <div
              key={row.term}
              className="grid gap-1 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-[160px_1fr]"
            >
              <dt className="text-sm font-semibold text-ink">{row.term}</dt>
              <dd className="tnum whitespace-pre-line text-sm text-ink-soft">
                {row.detail}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {payload ? (
          <a
            href={payload.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" /><T>{"Continue to WhatsApp"}</T>{" "}</a>
        ) : null}
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        ><T>{"Back to home"}</T>{" "}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint"><T>{"Keep your booking code handy. It identifies your booking in every conversation with our team."}</T>{" "}</p>
    </div>
  );
}
