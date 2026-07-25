import Image from "next/image";
import { findMedia } from "@/data/media";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

/**
 * Manifest-driven photograph slot.
 * Renders an optimized next/image once the asset is marked available
 * in src/data/media.ts; until then shows the labelled placeholder so
 * the layout never breaks and no image element 404s.
 *
 * fit="contain" is for studio product photography: the full vehicle
 * is always visible (never cropped or stretched) on a clean white
 * surface consistent with the design system.
 */
export function MediaImage({
  id,
  fallbackLabel,
  ratio = "4/3",
  fit = "cover",
  className = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}: {
  /** Manifest key from src/data/media.ts */
  id: string;
  /** Placeholder label when the asset isn't in the manifest yet */
  fallbackLabel?: string;
  ratio?: "4/3" | "16/9" | "1/1" | "3/4" | "3/2";
  /** contain-bare: uncropped with no background frame (transparent PNGs) */
  fit?: "cover" | "contain" | "contain-bare";
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const asset = findMedia(id);

  if (!asset || asset.kind !== "image" || !asset.available) {
    const label =
      (asset && (asset.kind === "image" ? asset.alt : asset.label)) ??
      fallbackLabel ??
      "Photo";
    // 3/2 falls back to the closest supported placeholder ratio
    const phRatio = ratio === "3/2" ? "16/9" : ratio;
    return <PlaceholderImage label={label} ratio={phRatio} className={className} />;
  }

  const ratios = {
    "4/3": "aspect-[4/3]",
    "16/9": "aspect-[16/9]",
    "1/1": "aspect-square",
    "3/4": "aspect-[3/4]",
    "3/2": "aspect-[3/2]",
  };

  return (
    <div
      className={`relative ${ratios[ratio]} w-full overflow-hidden ${
        fit === "contain-bare" ? "" : "rounded-[14px]"
      } ${fit === "contain" ? "bg-white" : ""} ${className}`}
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
