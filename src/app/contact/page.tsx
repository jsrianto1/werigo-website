import { pageMetadata } from "@/lib/seo";
import { Mail, MessageCircle, Clock, MapPin } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/config";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata = pageMetadata("Contact Werigo for Electric Scooter Rental in Bali", "Ask the Werigo Bali team about electric scooter availability, monthly rentals and hotel delivery. WhatsApp support daily, 08:00 to 20:00 WITA.", "/contact");

export default function ContactPage() {
  return (
    <Section>
      <SectionHeading as="h1"
        eyebrow="Contact"
        title="Talk to a person, not a ticket queue"
        lede="WhatsApp is fastest, and it's the same thread we'll use for your booking. Email and the form below work too."
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
                {site.whatsappDisplay} · Daily 08:00 to 20:00 WITA
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
              <span className="block font-semibold text-ink">Werigo address</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                {site.address.display}
              </span>
              <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">View location on Google Maps</a>
              <span className="mt-1 block text-sm text-ink-soft">Please confirm your visit or motorcycle handover with our team on WhatsApp.</span>
            </span>
          </div>
        </div>

        <ContactForm />
      </div>
    </Section>
  );
}
