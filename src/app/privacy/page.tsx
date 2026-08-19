import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Werigo privacy policy. How we collect, use, store and protect your information when you book an electric motorcycle rental in Bali.",
  alternates: { canonical: "/privacy" },
};

const lastUpdated = "26 July 2026";

export default function PrivacyPage() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <SectionHeading
          eyebrow="Legal"
          title="Privacy Policy"
          lede={`How Werigo collects, uses and protects your information. Last updated ${lastUpdated}.`}
        />

        <div className="space-y-8 text-sm leading-relaxed text-ink-soft">
          <div>
            <h2 className="font-display text-lg text-ink">Who this policy covers</h2>
            <p className="mt-2">
              This policy applies to werigo.co and to the WhatsApp conversations,
              phone calls and emails you have with the Werigo team while
              booking, renting or returning a Wedison electric motorcycle in
              Bali. Werigo is Wedison&apos;s electric motorcycle rental and
              mobility service.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">Information we collect</h2>
            <p className="mt-2">When you submit a booking request, we collect:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your full name, email address and WhatsApp number</li>
              <li>Nationality, if you provide it</li>
              <li>Pickup and return locations and addresses</li>
              <li>Your requested rental dates, motorcycle model and quantity</li>
              <li>Any notes or special requests you add to your booking</li>
            </ul>
            <p className="mt-2">
              If your booking proceeds, our team may also ask for a copy of
              your driving licence or International Driving Permit and identity
              document, and confirm payment details with you directly, on
              WhatsApp.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">How we use it</h2>
            <p className="mt-2">We use your information only to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Confirm availability and arrange your rental on WhatsApp</li>
              <li>Deliver, collect and support your motorcycle rental</li>
              <li>Meet our own accounting and legal record-keeping obligations</li>
              <li>Respond to questions you send us directly</li>
            </ul>
            <p className="mt-2">
              We do not use your information for unrelated marketing without
              your consent, and we do not sell your information to anyone.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">Who we share it with</h2>
            <p className="mt-2">
              Your booking details are visible to the Werigo team members who
              arrange delivery and support your rental, and are processed
              through the tools we use to run bookings and communicate with
              you (including WhatsApp and our booking database). We do not
              share your information with third parties for their own
              marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">How long we keep it</h2>
            <p className="mt-2">
              We keep booking information for as long as needed to support
              your rental, resolve any related questions afterward, and meet
              our accounting and legal obligations. We don&apos;t keep it
              longer than that.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">Your choices</h2>
            <p className="mt-2">
              You can ask us what information we hold about you, ask us to
              correct it, or ask us to delete it once it&apos;s no longer
              needed for an active or recent booking. Message us on WhatsApp
              or by email and we&apos;ll handle it directly.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">Contact us</h2>
            <p className="mt-2">
              Questions about this policy or your information are welcome any
              time on WhatsApp at {site.whatsappDisplay}, or by email at{" "}
              <a
                href={`mailto:${site.contactEmail}`}
                className="font-semibold text-primary hover:text-primary-strong"
              >
                {site.contactEmail}
              </a>
              . {site.supportHoursSentence}
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink">Changes to this policy</h2>
            <p className="mt-2">
              If we make a meaningful change to how we handle your
              information, we&apos;ll update this page and the date at the
              top.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
