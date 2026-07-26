import Image from "next/image";
import { getAreaMedia } from "@/data/areaMedia";

/**
 * Location photograph for a delivery area. object-cover with a
 * per-image focal point; optional navy/teal overlay only where text
 * needs contrast (hero). Renders nothing if the area has no verified
 * image — never a broken element.
 */
export function AreaImage({
  slug,
  variant = "card",
  className = "",
  sizes,
  priority = false,
  children,
}: {
  slug: string;
  variant?: "hero" | "card";
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const media = getAreaMedia(slug);
  if (!media) return null;

  if (variant === "hero") {
    return (
      <div
        className={`relative overflow-hidden rounded-[14px] ${className}`}
      >
        <Image
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          priority={priority}
          sizes={sizes ?? "(max-width: 1024px) 100vw, 1216px"}
          className="h-full w-full object-cover"
          style={{ objectPosition: media.focal }}
        />
        {/* Navy/teal overlay for text contrast */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-deep/85 via-deep/35 to-transparent"
        />
        {children ? (
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">{children}</div>
        ) : null}
        <p className="absolute right-2 top-2 rounded bg-black/35 px-1.5 py-0.5 text-[10px] text-white/75">
          {media.credit}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={media.src}
        alt={media.alt}
        width={media.width}
        height={media.height}
        sizes={sizes ?? "(max-width: 640px) 50vw, 300px"}
        className="h-full w-full object-cover"
        style={{ objectPosition: media.focal }}
      />
    </div>
  );
}
