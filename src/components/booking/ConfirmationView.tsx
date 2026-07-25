"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { getRecord, type BookingRecord } from "@/lib/booking";
import { getVehicle } from "@/data/vehicles";
import { getArea } from "@/data/locations";
import { getExtra } from "@/data/extras";
import { formatIDR } from "@/lib/config";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";

export function ConfirmationView() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [record, setRecord] = useState<BookingRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  // localStorage is client-only — read after mount to avoid SSR mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(getRecord(ref));
    setLoaded(true);
  }, [ref]);

  if (!loaded) {
    return (
      <div
        className="mx-auto h-96 max-w-2xl animate-pulse rounded-[14px] bg-sunken"
        aria-busy="true"
        aria-label="Loading booking"
      />
    );
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink">Booking not found</h1>
        <p className="mt-3 text-ink-soft">
          We couldn&apos;t find a booking with this reference on this device.
          Bookings are stored in your browser during our launch phase.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Start a new booking
        </Link>
      </div>
    );
  }

  const vehicle = record.vehicleSlug ? getVehicle(record.vehicleSlug) : undefined;
  const area = getArea(record.search.pickupSlug);
  const returnArea = getArea(record.search.returnSlug);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl text-ink md:text-4xl">
          Booking request received
        </h1>
        <p className="tnum mt-3 inline-block rounded-full bg-primary-faint px-4 py-1.5 text-sm font-semibold text-primary">
          Reference: {record.reference}
        </p>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          Our team will confirm availability and final details with{" "}
          <strong className="font-semibold text-ink">{record.customer.fullName}</strong>{" "}
          on WhatsApp. Nothing is charged until you approve the final quote.
        </p>
      </div>

      <dl className="mt-8 space-y-3 rounded-[14px] border border-line bg-card p-6">
        {[
          { term: "Ride", detail: `${vehicle?.name ?? "—"} × ${record.quantity}` },
          {
            term: "Period",
            detail: `${record.search.startDate} ${record.search.startTime} → ${record.search.endDate} ${record.search.endTime}`,
          },
          {
            term: "Delivery",
            detail: `${area?.name ?? "—"}${
              record.customer.hotelName ? ` — ${record.customer.hotelName}` : ""
            }`,
          },
          {
            term: "Return",
            detail:
              record.search.returnSlug !== record.search.pickupSlug
                ? returnArea?.name ?? "—"
                : "Same as delivery",
          },
          ...(record.extras.length > 0
            ? [
                {
                  term: "Extras",
                  detail: record.extras
                    .map((e) => {
                      const def = getExtra(e.id);
                      return def ? `${def.name} × ${e.quantity}` : null;
                    })
                    .filter(Boolean)
                    .join(", "),
                },
              ]
            : []),
          { term: "Estimated total", detail: formatIDR(record.totalIDR) },
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

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href={buildBookingWhatsAppUrl(record)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Open WhatsApp summary
        </a>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-line-strong px-6 text-base font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Back to home
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
        Keep your reference handy — it identifies your booking in every
        conversation with our team.
      </p>
    </div>
  );
}
