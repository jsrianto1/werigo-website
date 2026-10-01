"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const VIDEO_MP4 = "/media/hero/werigo-canggu-hero-720p.mp4";
const POSTER_SRC = "/media/hero/werigo-athena-canggu-hero-poster.webp";

/** Original footage on desktop and mobile; respect reduced-motion and Save-Data. */
export function HeroBackdrop() {
  const [showVideo, setShowVideo] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    // Let the eager poster finish before the video competes for bandwidth.
    const update = () => setShowVideo(!motion.matches && !connection?.saveData);
    const ready = () => { timer = window.setTimeout(update, 250); };
    let timer: number | undefined;
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => {
      window.removeEventListener("load", ready);
      window.clearTimeout(timer);
      motion.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className="hero-video-background" aria-hidden="true">
      <Image src={POSTER_SRC} alt="" width={1600} height={902} preload sizes="100vw" className="hero-footage" />
      {showVideo ? (
        <video
          autoPlay muted loop playsInline preload="none" poster={POSTER_SRC}
          width={1278} height={720}
          onPlaying={() => setHasPlayed(true)} onError={() => setHasPlayed(false)}
          className={`hero-footage ${hasPlayed ? "opacity-100" : "opacity-0"}`}
        >
          <source src={VIDEO_MP4} type="video/mp4" />
        </video>
      ) : null}
      <div className="hero-video-scrim" />
    </div>
  );
}
