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
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Bali, Indonesia",
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: "Bali",
      addressCountry: "ID",
    },
    priceRange: "Rp",
  };
}

/**
 * Product schema for a Wedison fleet model.
 * No price or availability claims — rates are provided on request
 * and availability is confirmed by the team.
 */
export function vehicleSchema(entry: WedisonEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${entry.displayName} Electric Motorcycle Rental in Bali`,
    description: entry.description,
    brand: { "@type": "Brand", name: entry.brand },
    url: `${site.baseUrl}/fleet/${entry.modelSlug}`,
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
