import type { Metadata } from "next";
import { Mail, MessageCircle, Clock, MapPin } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/config";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Werigo — Bali Electric Motorcycle Rental",
  description:
    "Get in touch with the Werigo team in Bali — WhatsApp, email or the contact form. Questions about bookings, custom deliveries or partnerships welcome.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Contact"
        title="Talk to a person, not a ticket queue"
        lede="WhatsApp is fastest — it's the same thread we'll use for your booking. Email and the form below work too."
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <a
            href={buildSupportWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-[14px] border border-line bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-ink">WhatsApp</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                Fastest replies during riding hours
              </span>
            </span>
          </a>
          <a
            href={`mailto:${site.contactEmail}`}
            className="flex items-start gap-4 rounded-[14px] border border-line bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(14,43,39,0.35)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-ink">Email</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                {site.contactEmail}
              </span>
            </span>
          </a>
          <div className="flex items-start gap-4 rounded-[14px] border border-line bg-card p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-ink">Hours</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                {site.operatingHours}
              </span>
            </span>
          </div>
          <div className="flex items-start gap-4 rounded-[14px] border border-line bg-card p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-ink">Base</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                Canggu, Bali — exact address published at launch
              </span>
            </span>
          </div>
        </div>

        <ContactForm />
      </div>
    </Section>
  );
}
