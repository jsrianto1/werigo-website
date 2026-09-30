"use client";
import { Globe } from "lucide-react";
import { useId } from "react";
import { useLanguage } from "./LanguageProvider";
import type { Locale } from "@/lib/i18n";
export function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  const { locale, setLanguage, t } = useLanguage();
  const id = useId();
  return <div className={`language-selector ${mobile ? "language-selector-mobile" : ""}`}>
    <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
    <label htmlFor={id} className="sr-only">{t("Website language")}</label>
    <select id={id} value={locale} onChange={e => setLanguage(e.target.value as Locale)}>
      <option value="en" lang="en">English</option>
      <option value="id" lang="id">Indonesia</option>
      <option value="ru" lang="ru">Русский</option>
    </select>
  </div>;
}
