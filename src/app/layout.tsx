import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MetaPageViews } from "@/components/analytics/MetaPageViews";
import { Manrope, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HideOnAdmin } from "@/components/layout/HideOnAdmin";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { site } from "@/lib/config";
import { localBusinessSchema, jsonLd } from "@/lib/schema";
import { MarketingEvents } from "@/components/analytics/MarketingEvents";
import "./globals.css";
import "./marketing.css";
import { WelcomeOffer } from "@/components/marketing/WelcomeOffer";

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
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Werigo. Move the Future.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} Electric Motorcycle Rental in Bali`,
    description: site.description,
    images: ["/brand/og-image.png"],
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
        {/* Keep the supplied GTM bootstrap in head, before hydration. */}
        {/* eslint-disable-next-line @next/next/next-script-for-ga */}
        <script
          id="werigo-gtm"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5RC9TGR4');`,
          }}
        />
        <script
          id="werigo-meta-pixel"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','27824990167174730');
fbq('track','PageView');`,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${inter.variable} flex min-h-dvh flex-col antialiased`}
      >
        {/* Google Tag Manager fallback belongs immediately after body opens. */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5RC9TGR4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <noscript>
          {/* A tracking beacon must not use the Next.js image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=27824990167174730&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Suspense fallback={null}>
          <MetaPageViews />
          <MarketingEvents />
        </Suspense>
        <LanguageProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg"
        >
          Skip to main content
        </a>
        <WelcomeOffer />
        <HideOnAdmin>
          <Header />
        </HideOnAdmin>
        <main id="main" className="flex-1">
          {children}
        </main>
        <HideOnAdmin>
          <Footer />
          <FloatingWhatsApp />
        </HideOnAdmin>
        </LanguageProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
        />
      </body>
    </html>
  );
}
