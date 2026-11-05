"use client";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Accordion } from "@/components/ui/Accordion";
import type { HomeContentData, LocalizedText } from "@/lib/cmsRules";
export function CmsText({ value }: { value: LocalizedText }) {
  const { locale } = useLanguage();
  return value[locale] || value.en;
}
export function CmsFaqs({ items }: { items: HomeContentData["faqs"] }) {
  const { locale } = useLanguage();
  return <Accordion items={items.map(item => ({ question: item.question[locale] || item.question.en, answer: item.answer[locale] || item.answer.en }))}/>;
}
