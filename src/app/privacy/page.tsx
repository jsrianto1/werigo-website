import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Werigo privacy policy. Booking details are used only for delivery and support, and never sold. The formal policy text is being added to this page.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <SectionHeading
          eyebrow="Legal"
          title="Privacy Policy"
          lede="How Werigo handles your data. The full policy is being prepared."
        />
        <div className="rounded-[14px] border border-dashed border-line-strong bg-card p-8 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl text-ink">
            The principles are already fixed
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Booking details are used only for delivery and support, never
            sold, and stored no longer than operations require. The formal
            policy text is being added to this page. Questions in the
            meantime are welcome on WhatsApp or by email.
          </p>
        </div>
      </div>
    </Section>
  );
}
