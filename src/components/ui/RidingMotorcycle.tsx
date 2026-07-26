"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Decorative brand moment: a real Wedison motorcycle travels once
 * across a subtle Werigo route line when the section scrolls into
 * view. The cutout is a transparent derivative of the approved
 * EdPower product photograph (background removed only).
 *
 * - Pure CSS transforms (translate3d), no animation library
 * - Plays once per page load, triggered by IntersectionObserver
 * - Paused whenever the strip leaves the viewport
 * - prefers-reduced-motion: shows a tasteful static motorcycle
 * - pointer-events: none, aria-hidden — never blocks content
 * - Fixed-height strip: zero layout shift
 */
export function RidingMotorcycle({ className = "" }: { className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const startedRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // static presentation, no observer needed

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startedRef.current = true;
            setState("playing");
          } else if (startedRef.current) {
            setState("paused");
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      data-riding={state}
      className={`ride-track pointer-events-none relative h-24 select-none overflow-hidden sm:h-28 ${className}`}
    >
      {/* Route line the bike travels along */}
      <svg
        viewBox="0 0 1440 20"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-4 h-5 w-full"
      >
        <path
          d="M-10 12 C 240 12, 400 6, 720 10 S 1200 14, 1450 9"
          stroke="var(--brand-primary)"
          strokeOpacity="0.28"
          strokeWidth="1.5"
          fill="none"
          className="route-dash"
        />
        <circle cx="360" cy="8" r="3" fill="var(--brand-accent)" fillOpacity="0.7" />
        <circle cx="1080" cy="12" r="3" fill="var(--brand-primary)" fillOpacity="0.45" />
      </svg>

      {/* Moving group: static center position for idle/reduced-motion */}
      <div
        className={`ride-mover absolute bottom-3 will-change-transform ${
          state === "idle" ? "left-1/2 -translate-x-1/2" : "left-0"
        }`}
      >
        <div className="ride-body relative">
          <Image
            src="/brand/riding-motorcycle.png"
            alt=""
            width={900}
            height={774}
            className="h-16 w-auto sm:h-20"
            sizes="96px"
          />
          {/* Soft moving shadow */}
          <div
            className="ride-shadow absolute -bottom-1.5 left-1/2 h-2 w-4/5 -translate-x-1/2 rounded-full bg-ink/25"
            style={{ filter: "blur(4px)" }}
          />
        </div>
      </div>
    </div>
  );
}
