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
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            Your terms come with your booking
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Until the full text is published here, the terms that apply to your
            rental (rider requirements, liability, deposits, cancellation and
            insurance conditions) are confirmed with you in writing before
            you book. No booking is ever bound by terms that weren&apos;t
            visible at the time of booking.
          </p>
        </div>
      </div>
    </Section>
  );
}
