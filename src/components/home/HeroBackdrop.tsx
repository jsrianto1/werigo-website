"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const VIDEO_MP4 = "/media/hero/werigo-athena-canggu-hero.mp4";
const VIDEO_WEBM = "/media/hero/werigo-athena-canggu-hero.webm";
const POSTER_SRC = "/media/hero/werigo-athena-canggu-hero-poster.webp";

/** Original riding footage, with a first-frame fallback and reduced-motion support. */
export function HeroBackdrop() {
  const [showVideo, setShowVideo] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowVideo(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setShowVideo(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <div className="hero-video-background" aria-hidden="true">
        <Image src={POSTER_SRC} alt="" fill priority sizes="100vw" className="hero-footage" />
        {showVideo ? (
          <video
            autoPlay muted loop playsInline preload="metadata" poster={POSTER_SRC}
            onPlaying={() => setHasPlayed(true)}
            className={`hero-footage ${hasPlayed ? "opacity-100" : "opacity-0"}`}
          >
            <source src={VIDEO_WEBM} type="video/webm" />
            <source src={VIDEO_MP4} type="video/mp4" />
          </video>
        ) : null}
        <div className="hero-video-scrim" />
      </div>

    </>
  );
}
