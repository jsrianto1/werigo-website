import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { vehicles } from "@/data/vehicles";
import { serviceAreas } from "@/data/locations";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    { path: "", priority: 1.0 },
    { path: "/fleet", priority: 0.9 },
    { path: "/book", priority: 0.9 },
    { path: "/how-it-works", priority: 0.8 },
    { path: "/delivery-areas", priority: 0.8 },
    { path: "/about", priority: 0.6 },
    { path: "/help-center", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
  ];

  return [
    ...staticPages.map((page) => ({
      url: `${site.baseUrl}${page.path}`,
      lastModified: now,
      priority: page.priority,
    })),
    ...vehicles.map((v) => ({
      url: `${site.baseUrl}/fleet/${v.slug}`,
      lastModified: now,
      priority: 0.8,
    })),
    ...serviceAreas.map((a) => ({
      url: `${site.baseUrl}/delivery-areas/${a.slug}`,
      lastModified: now,
      priority: 0.7,
    })),
  ];
}
