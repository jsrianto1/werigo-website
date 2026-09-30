"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

const VIDEO_MP4 = "/media/hero/werigo-athena-canggu-hero.mp4";
const VIDEO_WEBM = "/media/hero/werigo-athena-canggu-hero.webm";
const POSTER_SRC = "/media/hero/werigo-athena-canggu-hero-poster.webp";

/** Original riding footage, with a first-frame fallback and motion controls. */
export function HeroBackdrop() {
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowVideo(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setShowVideo(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
    } else {
      try { await video.play(); } catch { setPlaying(false); }
    }
  }

  return (
    <>
      <div className="hero-video-background" aria-hidden="true">
        <Image src={POSTER_SRC} alt="" fill priority sizes="100vw" className="hero-footage" />
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay muted loop playsInline preload="metadata" poster={POSTER_SRC}
            onPlaying={() => { setPlaying(true); setHasPlayed(true); }}
            onPause={() => setPlaying(false)}
            className={`hero-footage ${hasPlayed ? "opacity-100" : "opacity-0"}`}
          >
            <source src={VIDEO_WEBM} type="video/webm" />
            <source src={VIDEO_MP4} type="video/mp4" />
          </video>
        ) : null}
        <div className="hero-video-scrim" />
      </div>
      {showVideo ? (
        <button type="button" onClick={togglePlayback} className="hero-video-control" aria-label={playing ? "Pause background video" : "Play background video"}>
          {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          <span>{playing ? "Pause video" : "Play video"}</span>
        </button>
      ) : null}
    </>
  );
}
