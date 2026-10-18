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
    image: `${site.baseUrl}/brand/werigo-logo-full.png`,
    priceRange: `IDR ${Math.min(...Object.values(ratesIdrPerDay).map(rate => rate.daily)).toLocaleString("en-US")}–${Math.max(...Object.values(ratesIdrPerDay).map(rate => rate.daily)).toLocaleString("en-US")} per day (2–6 days)`,
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00", closes: "20:00",
    }],
  };
}

/** Connected site identity; do not invent a site-search action or review scores. */
export function siteIdentitySchema() {
  const business = localBusinessSchema();
  return {
    "@context": "https://schema.org",
    "@graph": [business, {
      "@type": "WebSite", "@id": `${site.baseUrl}/#website`,
      url: `${site.baseUrl}/`, name: site.name, description: site.description,
      inLanguage: "en", publisher: { "@id": `${site.baseUrl}/#business` },
    }],
  };
}

/** Homepage content and the rental business share the same stable identity. */
export function homePageSchema() {
  return {
    "@context": "https://schema.org", "@type": "WebPage",
    "@id": `${site.baseUrl}/#webpage`, url: `${site.baseUrl}/`,
    name: "Electric Scooter Rental Bali | Daily & Monthly", inLanguage: "en",
    isPartOf: { "@id": `${site.baseUrl}/#website` },
    about: { "@id": `${site.baseUrl}/#business` },
    description: site.description,
  };
}

/** Only list the models actually rendered on the fleet collection page. */
export function fleetCollectionSchema(entries: WedisonEntry[]) {
  return {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "@id": `${site.baseUrl}/fleet#webpage`, url: `${site.baseUrl}/fleet`,
    name: "Compare Electric Scooters & Rates in Bali", inLanguage: "en",
    isPartOf: { "@id": `${site.baseUrl}/#website` },
    about: { "@id": `${site.baseUrl}/#business` },
    breadcrumb: { "@id": `${site.baseUrl}/fleet#breadcrumb` },
    mainEntity: {
      "@type": "ItemList", "@id": `${site.baseUrl}/fleet#models`,
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem", position: index + 1, name: entry.displayName,
        url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
      })),
    },
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
    "@id": `${site.baseUrl}/fleet/${entry.modelSlug}#motorcycle`,
    name: `${entry.displayName} Electric Motorcycle Rental in Bali`,
    description: entry.description,
    brand: { "@type": "Brand", name: entry.brand },
    image: new URL(image?.src ?? `/media/fleet/${entry.modelSlug}/catalog.webp`, site.baseUrl).href,
    url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
    mainEntityOfPage: {
      "@type": "WebPage", "@id": `${site.baseUrl}/fleet/${entry.modelSlug}#webpage`,
      url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
      isPartOf: { "@id": `${site.baseUrl}/#website` },
      breadcrumb: { "@id": `${site.baseUrl}/fleet/${entry.modelSlug}#breadcrumb` },
    },
    ...(rate ? { offers: {
      "@type": "Offer",
      "@id": `${site.baseUrl}/fleet/${entry.modelSlug}#daily-rental`,
      url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
      price: rate,
      priceCurrency: "IDR",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      description: `IDR ${rate} per motorcycle per day for ${MIN_RENTAL_DAYS}–6 days. Longer rentals have different rates. Availability and final quote confirmed on WhatsApp.`,
      eligibleDuration: { "@type": "QuantitativeValue", minValue: MIN_RENTAL_DAYS, maxValue: 6, unitCode: "DAY" },
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
    ...(items.length ? { "@id": `${new URL(items[items.length - 1].path, site.baseUrl).href}#breadcrumb` } : {}),
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
