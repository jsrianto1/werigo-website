"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** The staff dashboard has its own frame: no marketing header, footer or WhatsApp bubble there. */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
