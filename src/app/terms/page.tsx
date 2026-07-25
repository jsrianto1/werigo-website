import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Werigo rental terms and conditions. The full legal terms will be published here before launch.",
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
          lede="The complete Werigo rental agreement is being finalised with Indonesian legal counsel."
        />
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            Published before launch
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            This page will contain the full rental terms: rider requirements,
            liability, deposits, cancellation and insurance conditions. No
            booking will ever be bound by terms that weren&apos;t visible at
            the time of booking.
          </p>
        </div>
      </div>
    </Section>
  );
}
