import type { Metadata } from "next";
import { site } from "@/lib/config";

export function conciseDescription(text: string, max = 155): string {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  const cropped = value.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[.,;:!?]+$/, "");
  return `${cropped}…`;
}

export function pageMetadata(title: string, description: string, path: string, image = "/brand/og-image.png"): Metadata {
  const socialTitle = `${title} | Werigo`;
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: "en_US", url: path, title: socialTitle, description, images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [image] },
  };
}
