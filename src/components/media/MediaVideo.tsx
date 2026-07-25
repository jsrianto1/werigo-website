import { findMedia } from "@/data/media";

/**
 * Manifest-driven HTML5 video slot.
 * Renders nothing until the asset is marked available in
 * src/data/media.ts — no broken players are ever published.
 * Muted + playsInline for autoplay compliance; controls stay on so
 * the video never traps users, and preload stays light.
 */
export function MediaVideo({
  id,
  className = "",
  autoPlay = false,
}: {
  /** Manifest key from src/data/media.ts */
  id: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const asset = findMedia(id);
  if (!asset || asset.kind !== "video" || !asset.available) return null;

  return (
    <video
      className={`w-full rounded-[14px] object-cover ${className}`}
      poster={asset.poster}
      width={asset.width}
      height={asset.height}
      controls
      muted={autoPlay}
      loop={autoPlay}
      autoPlay={autoPlay}
      playsInline
      preload="metadata"
      aria-label={asset.label}
    >
      <source src={asset.src} type="video/mp4" />
      {asset.label}
    </video>
  );
}
