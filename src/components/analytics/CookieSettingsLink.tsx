"use client";

import { T } from "@/components/i18n/LanguageProvider";
import { openCookieSettings } from "@/lib/consent";

/** Reopens the cookie preferences dialog; usable from Server Components such as the footer. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => openCookieSettings()} className={`cursor-pointer ${className}`}>
      <T>{"Cookie settings"}</T>
    </button>
  );
}
