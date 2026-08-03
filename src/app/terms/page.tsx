import type { Metadata } from "next";
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
          lede="These are the current Werigo rental terms used for every booking request. Your final quote, delivery arrangements and any optional protection are confirmed with you on WhatsApp before anything is charged."
        />
        <div className="rounded-[14px] border border-line bg-card p-6 sm:p-8">
          <ul className="space-y-3 text-sm leading-relaxed text-ink-soft">
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
              Protection is provided in-house by Werigo, not by an insurer,
              and does not cover personal injury, medical costs, personal
              belongings or liability to others.
            </li>
            <li>
              Airport handover at Ngurah Rai Airport carries a US$1.00
              delivery fee and a US$1.00 collection fee, each applied once
              per booking. If both pickup and return are at the airport,
              both fees apply for US$2.00 in total.
            </li>
            <li>
              Optional protection is added only when you select it.
              Cancellation Protection is US$0.50 per rental day and
              Motorcycle Protection is US$4.95 per motorcycle per rental
              day. Eligibility, coverage, exclusions, refunds and any
              applicable excess are confirmed with you before you approve
              your quote.
            </li>
            <li>
              Riders must hold a licence valid for riding in Indonesia and
              follow local traffic law. A properly fitted helmet is
              essential on every ride.
            </li>
            <li>
              Rider requirements, liability, deposits and cancellation
              conditions that are not listed here are confirmed with you in
              writing with your quote. No booking is ever bound by terms
              that weren&apos;t visible to you at the time of booking.
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}
