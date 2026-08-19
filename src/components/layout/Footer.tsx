import Link from "next/link";
import { MessageCircle, Mail } from "lucide-react";

/** Minimal original brand glyphs (lucide dropped brand icons in v1) */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 8h2.5V4.5H14A4.5 4.5 0 0 0 9.5 9v2.5H7V15h2.5v5.5H13V15h2.5l.5-3.5h-3V9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
import { Logo } from "@/components/ui/Logo";
import { site } from "@/lib/config";
import { serviceAreas } from "@/data/locations";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

const companyLinks = [
  { href: "/about", label: "About Werigo" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/fleet", label: "Our Fleet" },
  { href: "/supercharge", label: "Supercharge" },
  { href: "/partners", label: "Partners" },
  { href: "/help-center", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer className="bg-deep text-ink-inverse">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Logo variant="footer" />
            <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-inverse/50">
              Powered by Wedison
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-inverse/70">
              Werigo is Wedison&apos;s electric motorcycle rental and mobility
              service in Bali. Official Wedison electric motorcycles, delivered
              to your door with at least 80% battery, ready to ride.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Werigo on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-inverse/20 text-ink-inverse/80 transition-colors hover:border-ink-inverse/60 hover:text-ink-inverse"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={site.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Werigo on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-inverse/20 text-ink-inverse/80 transition-colors hover:border-ink-inverse/60 hover:text-ink-inverse"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Delivery areas */}
          <nav aria-label="Delivery areas">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-inverse/60">
              Delivery Areas
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4">
              {serviceAreas.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={`/delivery-areas/${area.slug}`}
                    className="block py-1.5 text-sm text-ink-inverse/80 transition-colors hover:text-ink-inverse"
                  >
                    {area.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-inverse/60">
              Company
            </h2>
            <ul className="mt-4">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block py-1.5 text-sm text-ink-inverse/80 transition-colors hover:text-ink-inverse"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-inverse/60">
              Get in touch
            </h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href={buildSupportWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-1.5 text-sm text-ink-inverse/80 transition-colors hover:text-ink-inverse"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp us
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="inline-flex items-center gap-2 py-1.5 text-sm text-ink-inverse/80 transition-colors hover:text-ink-inverse"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {site.contactEmail}
                </a>
              </li>
              <li className="pt-1 text-sm text-ink-inverse/60">
                {site.operatingHours}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-inverse/10 pt-6 text-sm text-ink-inverse/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name} · {site.domain}
          </p>
          <ul className="flex gap-6">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-ink-inverse"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
