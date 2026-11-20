import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MetaPageViews } from "@/components/analytics/MetaPageViews";
import { Manrope, Inter } from "next/font/google";
import localFont from "next/font/local";
import { BrandMotion } from "@/components/brand/BrandMotion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HideOnAdmin } from "@/components/layout/HideOnAdmin";
import { HideOnOps } from "@/components/layout/HideOnOps";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { site } from "@/lib/config";
import { siteIdentitySchema, jsonLd } from "@/lib/schema";
import { MarketingEvents } from "@/components/analytics/MarketingEvents";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { consentBootstrapScript } from "@/lib/consent";
import "./globals.css";
import "./marketing.css";
import "./brand.css";
import "./journey-loop.css";
import { ChristmasOffer } from "@/components/marketing/ChristmasOffer";
import { WelcomeOffer } from "@/components/marketing/WelcomeOffer";

const geist = localFont({ src: [
  { path: "./fonts/Geist/Geist-400.ttf", weight: "400", style: "normal" },
  { path: "./fonts/Geist/Geist-500.ttf", weight: "500", style: "normal" },
  { path: "./fonts/Geist/Geist-700.ttf", weight: "700", style: "normal" },
], variable: "--font-geist", display: "swap" });

const brandDisplay = localFont({ src: "./fonts/BricolageGrotesque.ttf", variable: "--font-brand-display", weight: "200 800", display: "swap" });

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  title: {
    default: `${site.name} Electric Motorcycle Rental in Bali`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    url: site.baseUrl,
    title: `${site.name} Electric Motorcycle Rental in Bali`,
    description: site.description,
    locale: "en_US",
    images: [
      {
        url: "/brand/journey-loop-v20261119/og-image.png",
        width: 1200,
        height: 630,
        alt: "Werigo electric motorcycle rental in Bali, powered by WEDISON",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} Electric Motorcycle Rental in Bali`,
    description: site.description,
    images: ["/brand/journey-loop-v20261119/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Consent Mode defaults and the GTM / Meta Pixel loaders, before hydration.
            Neither tag is requested until the visitor allows it. */}
        <script id="werigo-consent" dangerouslySetInnerHTML={{ __html: consentBootstrapScript() }} />
      </head>
      <body
        className={`${manrope.variable} ${inter.variable} ${brandDisplay.variable} ${geist.variable} flex min-h-dvh flex-col antialiased`}
      >
        <Suspense fallback={null}>
          <HideOnOps><MetaPageViews /><MarketingEvents /></HideOnOps>
        </Suspense>
        <LanguageProvider>
        <HideOnOps><BrandMotion /></HideOnOps>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg"
        >
          Skip to main content
        </a>
        <HideOnOps><WelcomeOffer /></HideOnOps>
        <HideOnAdmin>
          <Header />
        </HideOnAdmin>
        <HideOnAdmin><ChristmasOffer /></HideOnAdmin>
        <main id="main" className="flex-1">
          {children}
        </main>
        <HideOnAdmin>
          <Footer />
          <FloatingWhatsApp />
        </HideOnAdmin>
        <HideOnOps><CookieConsent /></HideOnOps>
        </LanguageProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(siteIdentitySchema()) }}
        />
      </body>
    </html>
  );
}
