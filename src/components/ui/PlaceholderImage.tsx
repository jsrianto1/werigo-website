import { Zap } from "lucide-react";

/**
 * Clearly-labelled placeholder for official Werigo photography.
 * Replace by dropping real images into /public and swapping the
 * component usage for next/image.
 */
export function PlaceholderImage({
  label,
  ratio = "4/3",
  className = "",
}: {
  label: string;
  ratio?: "4/3" | "16/9" | "1/1" | "3/4";
  className?: string;
}) {
  const ratios = {
    "4/3": "aspect-[4/3]",
    "16/9": "aspect-[16/9]",
    "1/1": "aspect-square",
    "3/4": "aspect-[3/4]",
  };
  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      className={`relative flex ${ratios[ratio]} w-full items-center justify-center overflow-hidden rounded-[14px] border border-line bg-sunken ${className}`}
    >
      {/* subtle diagonal texture so placeholders are obviously placeholders */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-line"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="ph-lines"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ph-lines)" opacity="0.5" />
      </svg>
      <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
        <Zap className="h-6 w-6 text-ink-faint" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        <span className="text-[10px] text-ink-faint/70">
          Official photo coming soon
        </span>
      </div>
    </div>
  );
}
