"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Mobile sticky booking bar — appears only once the hero booking
 * widget has scrolled out of view, and scrolls the user back to it.
 *
 * - Mobile only (hidden ≥ md); sits below the drawer/dialog layers
 * - Respects safe-area-inset-bottom; no layout shift (fixed element)
 * - Keyboard accessible button; entrance motion disabled under
 *   prefers-reduced-motion (via the global reduced-motion rules)
 */
export function StickyBookCTA({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  if (!visible) return null;

  return (
    <div
      className="rise-in fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 px-4 pt-3 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs leading-snug text-ink-soft">
          <span className="block font-semibold text-ink">Ready to ride?</span>
          Request in minutes, confirmed on WhatsApp.
        </p>
        <button
          onClick={() => {
            document
              .getElementById(targetId)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            // move focus to the first field for keyboard users
            document.getElementById("pickup-location")?.focus({ preventScroll: true });
          }}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          Check availability
        </button>
      </div>
    </div>
  );
}
