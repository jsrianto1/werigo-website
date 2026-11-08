"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: readable without JS and with reduced motion. */
export function BrandMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (/^\/(admin|account|api)(\/|$)/.test(pathname)) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || !window.IntersectionObserver) return;
    // Forms, payment, rental steps and persistent navigation remain stationary.
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".home-hero-inner .hero-copy,.proof-strip,.section-intro,.monthly-feature,#werigo-saga > div,.charging-panel,.wg-charge-feature,.wg-section-heading,.wg-club-ticket"));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.brandReveal = "visible"; observer.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: "0px 0px 30px 0px" });
    elements.forEach(element => { element.dataset.brandReveal = "pending"; observer.observe(element); });
    const revealAll = () => elements.forEach(element => { element.dataset.brandReveal = "visible"; });
    media.addEventListener("change", revealAll);
    const pause = () => { document.documentElement.toggleAttribute("data-brand-paused", document.hidden); };
    document.addEventListener("visibilitychange", pause);
    return () => { observer.disconnect(); elements.forEach(element => delete element.dataset.brandReveal); media.removeEventListener("change", revealAll); document.removeEventListener("visibilitychange", pause); document.documentElement.removeAttribute("data-brand-paused"); };
  }, [pathname]);
  return null;
}
