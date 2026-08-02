import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Werigo rental terms and conditions. The full written terms are being added to this page. Current terms are confirmed with every booking.",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <SectionHeading
          eyebrow="Legal"
          title="Terms & Conditions"
          lede="The complete written rental agreement is being finalised with Indonesian legal counsel and will be published on this page."
        />
        <div className="mb-8 rounded-[14px] border border-line bg-card p-6">
          <h2 className="font-display text-xl text-ink">
            Confirmed rental terms
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-soft">
            <li>Minimum rental period is 2 days.</li>
            <li>
              Every rental includes two sanitised helmets and one premium
              phone holder already installed on the motorcycle.
            </li>
            <li>
              Please return the motorcycle with at least 80% battery unless
              another arrangement has been confirmed with our team on
              WhatsApp.
            </li>
            <li>
              Riders must be at least 25 years old for the Wedison EdPower.
            </li>
            <li>
              Rates are quoted per motorcycle per day in IDR. Estimated
              totals are confirmed with availability by the Werigo team on
              WhatsApp before anything is charged.
            </li>
            <li>
              Optional in-house bike damage protection can be requested.
              Availability, price, coverage and liability limit are
              confirmed by our team on WhatsApp. It is provided in-house by
              Werigo, not by an insurer, and does not cover personal injury,
              medical costs, personal belongings or liability to others.
            </li>
          </ul>
        </div>
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            Your terms come with your booking
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Until the full text is published here, the remaining terms that
            apply to your rental (rider requirements, liability, deposits and
            cancellation conditions) are confirmed with you in writing before
            you book. No booking is ever bound by terms that weren&apos;t
            visible at the time of booking.
          </p>
        </div>
      </div>
    </Section>
  );
}
