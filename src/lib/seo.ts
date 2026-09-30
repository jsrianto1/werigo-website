import type { Metadata } from "next";
import { site } from "@/lib/config";

export function pageMetadata(title: string, description: string, path: string, image = "/brand/og-image.png"): Metadata {
  const socialTitle = `${title} | Werigo`;
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: "en_US", url: path, title: socialTitle, description, images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [image] },
  };
}
