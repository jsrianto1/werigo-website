"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { translate, type Locale } from "@/lib/i18n";

const KEY = "werigo-language";
let fallback: Locale = "en";
const LanguageContext = createContext<Locale>("en");
function snapshot(): Locale {
  try { const value = localStorage.getItem(KEY); return value === "id" || value === "ru" || value === "en" ? value : fallback; }
  catch { return fallback; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("werigo-language-change", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("werigo-language-change", listener); };
}
export function setLanguage(locale: Locale) {
  fallback = locale;
  try { localStorage.setItem(KEY, locale); } catch { /* Keep this tab's choice when storage is unavailable. */ }
  window.dispatchEvent(new Event("werigo-language-change"));
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, snapshot, () => "en" as Locale);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const locale = useContext(LanguageContext);
  return { locale, setLanguage, t: (text: string) => translate(text, locale) };
}
export function T({ children }: { children: string | number | null | undefined }) {
  const { t } = useLanguage();
  return typeof children === "string" ? t(children) : children;
}
