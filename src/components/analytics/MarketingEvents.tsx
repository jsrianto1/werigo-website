"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMarketingEvent } from "@/lib/analytics";

export function MarketingEvents() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const model = pathname.match(/^\/fleet\/(bees|victory|athena|edpower)$/)?.[1];
    if (model) trackMarketingEvent("view_vehicle", { content_ids: [model], content_type: "product" });
    if (pathname === "/book/checkout") trackMarketingEvent("begin_checkout");
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor) return;
      try {
        const url = new URL(anchor.href);
        if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") {
          trackMarketingEvent("whatsapp_click", { contact_method: "whatsapp" });
        }
      } catch { /* Ignore non-URL anchors. */ }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
