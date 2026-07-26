import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight, Truck } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { RidingMotorcycle } from "@/components/ui/RidingMotorcycle";
import { AreaImage } from "@/components/areas/AreaImage";
import { serviceAreas } from "@/data/locations";

export const metadata: Metadata = {
  title: "Delivery Areas — Free Scooter Delivery Across South Bali",
  description:
    "Werigo delivers electric motorcycles across Bali: free in Canggu and Seminyak, plus Kuta, Ubud, Uluwatu, Jimbaran, Sanur and Denpasar. See delivery windows and fees.",
  alternates: { canonical: "/delivery-areas" },
};

export default function DeliveryAreasPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Delivery areas"
        title="Wherever you're staying, we bring the ride"
        lede="Every delivery includes a charged battery, fitted helmets and a riding briefing. Fees and windows are always shown before you book — no surprises at the door."
      />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {serviceAreas.map((area) => (
          <li key={area.slug}>
            <Link
              href={`/delivery-areas/${area.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-card transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(14,43,39,0.3)]"
            >
              <AreaImage
                slug={area.slug}
                variant="card"
                className="h-40 w-full"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
              />
              <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                {area.deliveryFee === 0 ? (
                  <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-medium text-ok">
                    Free delivery
                  </span>
                ) : (
                  <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    Fee confirmed with quote
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-display text-2xl text-ink transition-colors group-hover:text-primary">
                {area.name}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {area.vibe}
              </p>
              <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-faint">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                {area.deliveryWindow}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Explore {area.name}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 rounded-[14px] border border-line bg-primary-faint p-5 text-sm leading-relaxed text-ink-soft">
        Staying somewhere else? We regularly arrange custom deliveries beyond
        these zones —{" "}
        <Link
          href="/contact"
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary-strong"
        >
          contact us
        </Link>{" "}
        with your address and dates.
      </p>
      <RidingMotorcycle className="mt-10" />
    </Section>
  );
}
