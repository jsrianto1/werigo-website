"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const VIDEO_SRC = "/media/hero/werigo-hero-canggu.mp4";
const POSTER_SRC = "/media/hero/werigo-hero-canggu-poster.webp";

/**
 * Full-bleed hero background: the Canggu riding video behind the
 * headline and booking widget.
 *
 * The poster image is always painted first, so the hero never waits
 * on the video and never shifts layout. The <video> element is only
 * mounted on screens 640px and up when the visitor has no
 * reduced-motion preference — below that (or with reduced motion)
 * the horizontal video is never downloaded and the poster stands in.
 * A light page-coloured scrim keeps the left side clear for the
 * headline; the footage stays visible toward the right.
 */
export function HeroBackdrop() {
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  // matchMedia is an external system — a one-shot sync read on mount
  // plus a change listener; SSR always renders the poster only.
  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 640px) and (prefers-reduced-motion: no-preference)"
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowVideo(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setShowVideo(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      role="img"
      aria-label="A rider on a white Wedison electric scooter passing surfboards and palm trees on a Canggu street in Bali"
    >
      <Image
        src={POSTER_SRC}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center sm:object-[70%_center]"
      />
      {showVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 sm:object-[70%_center] ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : null}
      {/* Readability scrim: strong over the headline column, lighter
          toward the rider on the right; stronger overall on small
          screens where text spans the full width. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-page/95 via-page/85 to-page/40 sm:via-page/65 sm:to-page/15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-page"
      />
    </div>
  );
}
