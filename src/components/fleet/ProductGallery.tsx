"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { MediaImage } from "@/components/media/MediaImage";
import type { ColorVariant } from "@/data/media";

/**
 * Product gallery with an accessible colour selector.
 * Changing colour only swaps the displayed photo — model,
 * specifications, rate status and booking flow are unaffected.
 * Uses native radio inputs for full keyboard and screen-reader
 * support. Images are official Wedison colour photography,
 * rendered uncropped (object-contain).
 */
export function ProductGallery({
  modelSlug,
  displayName,
  colors,
}: {
  modelSlug: string;
  displayName: string;
  colors: ColorVariant[];
}) {
  const groupId = useId();
  // "" = default studio photo
  const [selected, setSelected] = useState<string>("");
  const active = colors.find((c) => c.name === selected);

  return (
    <div className="space-y-4">
      {/* Main image */}
      {active ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-white">
          <Image
            key={active.name}
            src={active.image}
            alt={active.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-contain"
          />
        </div>
      ) : (
        <MediaImage
          id={`fleet-${modelSlug}-main`}
          fallbackLabel={`${displayName} — main product photo`}
          ratio="4/3"
          fit="contain"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
      )}

      {/* Colour selector */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Colour
        </legend>
        <div className="flex flex-wrap gap-2" role="presentation">
          <label
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-1.5 text-sm font-medium transition-colors ${
              selected === ""
                ? "border-primary bg-primary-faint text-primary"
                : "border-line-strong text-ink-soft hover:border-primary"
            }`}
          >
            <input
              type="radio"
              name={`${groupId}-color`}
              value=""
              checked={selected === ""}
              onChange={() => setSelected("")}
              className="sr-only"
            />
            As photographed
          </label>
          {colors.map((c) => (
            <label
              key={c.name}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                selected === c.name
                  ? "border-primary bg-primary-faint text-primary"
                  : "border-line-strong text-ink-soft hover:border-primary"
              }`}
            >
              <input
                type="radio"
                name={`${groupId}-color`}
                value={c.name}
                checked={selected === c.name}
                onChange={() => setSelected(c.name)}
                className="sr-only"
              />
              <span className="relative h-8 w-12 overflow-hidden rounded-md bg-white">
                <Image
                  src={c.thumb}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </span>
              {c.name}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {colors.length > 0
            ? "Colour availability is subject to confirmation."
            : "Colour options awaiting confirmation."}
        </p>
      </fieldset>
    </div>
  );
}
