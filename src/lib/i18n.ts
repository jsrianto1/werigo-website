import messages from "@/data/translations.json";
export type Locale = "en" | "id" | "ru";
const dictionary = messages as Record<string, string[]>;
export function translate(text: string, locale: Locale): string {
  if (locale === "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const translated = dictionary[key]?.[locale === "id" ? 0 : 1];
  if (!translated) return text;
  return `${text.match(/^\s*/)?.[0] ?? ""}${translated}${text.match(/\s*$/)?.[0] ?? ""}`;
}
