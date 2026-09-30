"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";


/** The head snippet tracks the first load; this covers App Router navigation. */
export function MetaPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = `${pathname}?${searchParams.toString()}`;
  const previousPage = useRef<string | null>(null);

  useEffect(() => {
    if (previousPage.current === page) return;
    const isNavigation = previousPage.current !== null;
    previousPage.current = page;
    if (isNavigation) window.fbq?.("track", "PageView");
  }, [page]);

  return null;
}
