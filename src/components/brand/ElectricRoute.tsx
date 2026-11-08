"use client";
import { useEffect, useRef } from "react";

/** A short, once-only route draw; the finished route stays still. */
export function ElectricRoute({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { element.dataset.routeEntered = "true"; observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <svg ref={ref} className={`brand-electric-route ${className}`} viewBox="0 0 680 560" fill="none" aria-hidden="true"><path className="brand-route-track" d="M620 32H243C107 32 92 165 200 195L457 265C591 302 569 447 431 447H55"/><path className="brand-route-draw" pathLength="1" d="M620 32H243C107 32 92 165 200 195L457 265C591 302 569 447 431 447H55"/><circle cx="620" cy="32" r="5"/><circle cx="55" cy="447" r="5"/></svg>;
}
