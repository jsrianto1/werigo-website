import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Werigo privacy policy. What we collect when you create an account, book and pay for an electric motorcycle rental in Bali, why we need it, who we share it with and how long we keep it.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

const lastUpdated = "7 October 2026";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <SectionHeading
          as="h1"
          eyebrow="Legal"
          title="Privacy Policy"
          lede={`What Werigo collects, why we need it, who sees it and how long we keep it. Last updated ${lastUpdated}.`}
        />

        <div className="space-y-8 text-sm leading-relaxed text-ink-soft">
          <Block title="Who we are">
            <p>
              Werigo is Wedison&apos;s electric motorcycle rental and mobility
              service in Bali. This policy covers werigo.co, your Werigo
              account, and the WhatsApp conversations, phone calls and emails
              you have with our team while booking, renting or returning a
              Wedison electric motorcycle. Our office is at{" "}
              {site.address.display}.
            </p>
            <p>
              We handle personal data in line with Indonesia&apos;s Personal
              Data Protection Law (Law No. 27 of 2022).
            </p>
          </Block>

          <Block title="Information we collect">
            <p className="font-semibold text-ink">Your account</p>
            <List
              items={[
                "Your name, email address and password. We store the password only as a secure one-way hash, so nobody at Werigo can read it.",
                "Your WhatsApp number and nationality, if you add them.",
                "If you sign in with Google: the name, email address and profile picture Google shares with us. We never see your Google password.",
              ]}
            />
            <p className="font-semibold text-ink">Rider documents</p>
            <List
              items={[
                "The type and number of your identity document (passport or Indonesian KTP) and your driving licence number. We need these before you can book, because we hand over a motor vehicle to you.",
                "We collect the numbers only. We do not ask you to upload photos of your documents on the website. When we deliver your ride, our team checks the physical documents in person.",
              ]}
            />
            <p className="font-semibold text-ink">Your bookings</p>
            <List
              items={[
                "Rental dates and times, motorcycle model and quantity.",
                "Delivery and return locations, the hotel, villa or address you give us, and your flight number if you add it.",
                "Notes, special requests and any add-on or protection requests.",
                "The price we charged, any discount applied and the code used.",
              ]}
            />
            <p className="font-semibold text-ink">Payments</p>
            <p>
              Online payments are processed by Midtrans, a licensed Indonesian
              payment gateway. You enter your card, bank or e-wallet details on
              the Midtrans payment window, not on werigo.co. We receive the
              payment result: the amount, the payment method type (for example
              card, bank transfer or QRIS), the transaction reference and the
              time. We never receive or store your full card number or CVV.
            </p>
            <p className="font-semibold text-ink">Promotions and referrals</p>
            <List
              items={[
                "Vouchers given to your account and the promo codes you use.",
                "Your personal referral code, the bookings made with it and the referral earnings on your account.",
                "When you ask us to pay out referral earnings: your bank name, account number and account holder name.",
              ]}
            />
            <p className="font-semibold text-ink">Messages</p>
            <p>
              WhatsApp messages and emails you exchange with us, and the
              booking confirmations and updates we send you on WhatsApp.
            </p>
            <p className="font-semibold text-ink">Cookies and device information</p>
            <List
              items={[
                "A sign-in cookie that keeps you logged in to your account. The site cannot work without it.",
                "Small items stored in your browser to remember your language, an unfinished booking form and offers you have closed.",
                "A cookie that remembers your cookie choice, and a record of that choice on our server (a random ID, the categories you allowed and the date, without your name or IP address).",
                "Only if you allow them in the cookie banner: Google Tag Manager and Google Analytics (analytics), and the Meta Pixel (marketing). They record the pages you visit, how you reached us and basic device and browser information. We use them to understand which pages and advertising work. They are not loaded at all until you choose.",
              ]}
            />
            <p>
              You can change or withdraw your choice at any time with Cookie
              settings at the bottom of every page. When you withdraw it, we
              stop the tags and remove the analytics and advertising cookies
              they set on our site.
            </p>
          </Block>

          <Block title="How we use it">
            <List
              items={[
                "To create and secure your account and let you sign in.",
                "To take your booking, collect payment, deliver and collect your motorcycle and support you during the rental. This is necessary to provide the rental you asked for.",
                "To check that the rider holds a driving licence and identity document, and to identify the renter if something goes wrong with the vehicle.",
                "To apply vouchers, promo codes and referral discounts, calculate referral earnings and pay them out.",
                "To send you booking confirmations and updates on WhatsApp and email.",
                "To keep accounting, tax and legal records we are required to keep.",
                "With your consent, to understand how the website is used and measure our advertising.",
                "To prevent fraud and misuse, for example the same identity document being used to claim a first booking offer twice.",
              ]}
            />
            <p>
              We do not sell your information, and we do not use it for
              unrelated marketing without your consent.
            </p>
          </Block>

          <Block title="Who can see it">
            <p>
              Werigo team members see your details when they need them to
              handle your booking. Rider documents are visible only to staff
              signed in to our admin system, on the booking itself, so they
              can check them at handover.
            </p>
            <p>We also use these service providers, who process data for us:</p>
            <List
              items={[
                "Midtrans, to process payments.",
                "Hostinger, which hosts the website, our database and our email.",
                "Fonnte, which sends our WhatsApp notifications.",
                "Google, for Google sign-in and Google Analytics.",
                "Meta, for the Meta Pixel.",
              ]}
            />
            <p>
              We share information with authorities only when Indonesian law
              requires it, for example in connection with a traffic incident or
              a legal request.
            </p>
          </Block>

          <Block title="How we protect it">
            <p>
              Every connection to werigo.co and to our database is encrypted.
              Access to our admin system needs a staff account, and staff
              actions are recorded. Passwords are stored as one-way hashes.
              No system is perfectly secure, so if we ever learn of a breach
              that affects your information, we will tell you and the
              authorities as the law requires.
            </p>
          </Block>

          <Block title="How long we keep it">
            <List
              items={[
                "Account details and rider documents: while your account is open. If you ask us to close your account, we delete them, except what we must keep for the records below.",
                "Booking, payment and referral payout records: as long as Indonesian tax and accounting rules require, which can be up to 10 years.",
                "WhatsApp and email conversations: as long as they are needed to support your rental and handle any questions afterwards.",
                "Your cookie choice: the cookie on your device for six months, then we ask again. The record on our server for two years.",
              ]}
            />
          </Block>

          <Block title="Your rights">
            <p>You can ask us to:</p>
            <List
              items={[
                "Tell you what information we hold about you and give you a copy.",
                "Correct information that is wrong. You can update your name, WhatsApp number and nationality yourself on your account Profile page.",
                "Delete your information or close your account, when we no longer need it for an active booking or a legal record.",
                "Stop using your information for a purpose you previously agreed to.",
              ]}
            />
            <p>
              Rider documents linked to a paid booking can only be changed by
              our team, so message us if yours need correcting. We reply to
              privacy requests as quickly as we can and within the time the law
              allows.
            </p>
          </Block>

          <Block title="Contact us">
            <p>
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
          </Block>

          <Block title="Changes to this policy">
            <p>
              If we change how we handle your information, we will update this
              page and the date at the top. For a significant change we will
              also let account holders know by email or WhatsApp.
            </p>
          </Block>
        </div>
      </div>
    </Section>
  );
}
