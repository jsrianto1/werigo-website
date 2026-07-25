import { site } from "@/lib/config";
import type { Vehicle } from "@/data/vehicles";
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

/** Product schema for a fleet vehicle */
export function vehicleSchema(vehicle: Vehicle) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${vehicle.name} — Electric Motorcycle Rental`,
    description: vehicle.description,
    brand: { "@type": "Brand", name: site.name },
    url: `${site.baseUrl}/fleet/${vehicle.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: vehicle.pricePerDay,
      availability: vehicle.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${site.baseUrl}/fleet/${vehicle.slug}`,
    },
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
