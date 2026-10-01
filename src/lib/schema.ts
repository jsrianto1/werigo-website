import { MIN_RENTAL_DAYS, ratesIdrPerDay } from "@/lib/pricing";
import { findMedia } from "@/data/media";
import { site } from "@/lib/config";
import type { WedisonEntry } from "@/data/vehicles";
import type { FaqItem } from "@/data/faqs";

/** LocalBusiness JSON-LD for Werigo */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.baseUrl}/#business`,
    name: site.name,
    description: site.description,
    url: site.baseUrl,
    email: site.contactEmail,
    telephone: `+${site.whatsappNumber}`,
    logo: `${site.baseUrl}/brand/werigo-logo-full.png`,
    sameAs: [site.social.instagram, site.social.tiktok],
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Bali, Indonesia",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.streetAddress,
      addressLocality: site.address.addressLocality,
      addressRegion: site.address.addressRegion,
      postalCode: site.address.postalCode,
      addressCountry: site.address.addressCountry,
    },
    geo: { "@type": "GeoCoordinates", ...site.geo },
    hasMap: site.mapsUrl,
    priceRange: "Rp",
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00", closes: "20:00",
    }],
  };
}

/**
 * Product schema for a Wedison fleet model.
 * Published IDR daily rental rate with its actual minimum period.
 * Availability stays unclaimed until confirmed for the customer's dates.
 */
export function vehicleSchema(entry: WedisonEntry) {
  const rate = ratesIdrPerDay[entry.modelSlug]?.daily;
  const image = findMedia(`fleet-${entry.modelSlug}-main`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${entry.displayName} Electric Motorcycle Rental in Bali`,
    description: entry.description,
    brand: { "@type": "Brand", name: entry.brand },
    image: new URL(image?.src ?? `/media/fleet/${entry.modelSlug}/catalog.webp`, site.baseUrl).href,
    url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
    ...(rate ? { offers: {
      "@type": "Offer",
      url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
      price: rate,
      priceCurrency: "IDR",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      description: `Daily rental rate per motorcycle; minimum ${MIN_RENTAL_DAYS} days. Availability and final quote confirmed on WhatsApp.`,
      eligibleDuration: { "@type": "QuantitativeValue", minValue: MIN_RENTAL_DAYS, unitCode: "DAY" },
      priceSpecification: {
        "@type": "UnitPriceSpecification", price: rate, priceCurrency: "IDR",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
      },
      seller: { "@id": `${site.baseUrl}/#business` },
    } } : {}),
  };
}

export interface BreadcrumbItem { name: string; path: string }

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name,
      item: new URL(item.path, site.baseUrl).href,
    })),
  };
}

/** FAQPage schema from FAQ items */
export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Renders JSON-LD safely into a script tag */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
