import { z } from "zod";

export const homeFields = [
  ["heroEyebrow", "Hero", "Eyebrow", 100], ["heroTitle1", "Hero", "Heading, first line", 50],
  ["heroTitle2", "Hero", "Heading, second line", 50], ["heroIntro", "Hero", "Introduction", 260],
  ["heroPrimary", "Hero", "Booking button", 45], ["heroSecondary", "Hero", "Monthly rental link", 45],
  ["fleetTitle", "Sections", "Fleet heading", 100], ["fleetIntro", "Sections", "Fleet introduction", 350],
  ["monthlyEyebrow", "Sections", "Monthly eyebrow", 80], ["monthlyTitle1", "Sections", "Monthly heading, first line", 60],
  ["monthlyTitle2", "Sections", "Monthly heading, second line", 60], ["monthlyIntro", "Sections", "Monthly introduction", 450],
  ["monthlyCta", "Sections", "Monthly button", 45], ["essentialsTitle1", "Sections", "Essentials heading, first line", 60],
  ["essentialsTitle2", "Sections", "Essentials heading, second line", 60], ["essentialsIntro", "Sections", "Essentials introduction", 350],
  ["areasTitle", "Sections", "Delivery heading", 100], ["areasIntro", "Sections", "Delivery introduction", 350],
  ["closingTitle1", "Sections", "Closing heading, first line", 60], ["closingTitle2", "Sections", "Closing heading, second line", 60],
  ["closingIntro", "Sections", "Closing introduction", 250], ["closingCta", "Sections", "Closing button", 45],
  ["howTitle", "Booking guide", "Booking guide heading", 100], ["howIntro", "Booking guide", "Booking guide introduction", 250],
  ["howCta", "Booking guide", "Booking button", 45], ["faqTitle1", "FAQ", "FAQ heading, first line", 60],
  ["faqTitle2", "FAQ", "FAQ heading, second line", 60], ["faqIntro", "FAQ", "FAQ introduction", 250],
  ["seoTitle", "SEO", "Search title", 65], ["seoDescription", "SEO", "Search description", 170],
] as const;
export type HomeField = typeof homeFields[number][0];
export const contentKeys = ["home", "places"] as const;
export type ContentKey = typeof contentKeys[number];
export const placeKinds = ["cafe", "activity", "place", "stay", "wellness", "shop"] as const;
export type PlaceKind = typeof placeKinds[number];
export const placeKindLabels: Record<PlaceKind, string> = { cafe: "Café hopping", activity: "Activities", place: "Places to visit", stay: "Where to stay", wellness: "Workout & wellness", shop: "Where to shop" };

function localized(max: number) {
  return z.object({ en: z.string().trim().min(1, "English is required.").max(max), id: z.string().trim().max(max), ru: z.string().trim().max(max) }).strict();
}
export type LocalizedText = { en: string; id: string; ru: string };
export const homeContentSchema = z.object({
  copy: z.object(Object.fromEntries(homeFields.map(([key, , , max]) => [key, localized(max)]))).strict(),
  steps: z.array(z.object({ title: localized(80), detail: localized(350) }).strict()).length(4),
  faqs: z.array(z.object({ question: localized(180), answer: localized(1500) }).strict()).min(1).max(15),
}).strict();
export interface HomeContentData {
  copy: Record<HomeField, LocalizedText>;
  steps: { title: LocalizedText; detail: LocalizedText }[];
  faqs: { question: LocalizedText; answer: LocalizedText }[];
}
export function safeHttps(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password && !/^(localhost|127\.|0\.|\[)/i.test(u.hostname); }
  catch { return false; }
}
const https = z.string().trim().max(1000).refine(v => !v || safeHttps(v), "Use an HTTPS website address.");
export const mediaPathSchema = z.string().trim().max(350).refine(v =>
  /^\/(?:media|app|brand)\/[a-zA-Z0-9_/-]+\.(?:webp|png|jpe?g|avif)$/.test(v) ||
  /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v), "Choose an image from the library or upload one.");
export const placeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), kind: z.enum(placeKinds), enabled: z.boolean(),
  name: z.string().trim().max(150), area: z.string().trim().max(160),
  category: z.string().trim().max(80), description: z.string().trim().max(1200),
  query: z.string().trim().max(500), website: https,
  tip: z.string().trim().max(500), image: mediaPathSchema.or(z.literal("")), imageAlt: z.string().trim().max(200),
  photoLabel: z.string().trim().max(150), photoCredit: z.string().trim().max(200), photoSource: https,
  imagePosition: z.string().max(40), neighbourhood: z.string().trim().max(160), address: z.string().trim().max(400),
  headline: z.string().trim().max(180), brand: z.string().trim().max(100), featured: z.boolean(),
  categories: z.array(z.string().trim().min(1).max(60)).max(8), highlights: z.array(z.string().trim().min(1).max(100)).max(8),
}).strict();
export type CmsPlace = z.infer<typeof placeSchema>;
export const placesContentSchema = z.object({ items: z.array(placeSchema).max(200) }).strict().superRefine((v, ctx) => {
  const seen = new Set<string>();
  v.items.forEach((p, i) => { if (seen.has(p.id)) ctx.addIssue({ code: "custom", path: ["items", i, "id"], message: "This place ID is already used." }); seen.add(p.id); });
});
export interface ContentPayloads { home: HomeContentData; places: z.infer<typeof placesContentSchema> }
export function parseContent<K extends ContentKey>(key: K, value: unknown, publishing = false): ContentPayloads[K] {
  const parsed = (key === "home" ? homeContentSchema : placesContentSchema).parse(value);
  if (key === "places" && publishing) {
    const issues: z.core.$ZodIssue[] = [];
    (parsed as ContentPayloads["places"]).items.forEach((p, i) => {
      if (!p.enabled) return;
      for (const [field, min] of [["name",2],["area",2],["category",2],["description",10],["query",3],["website",8],["image",1],["imageAlt",3]] as const) {
        if (p[field].length < min) issues.push({ code: "custom", path: ["items",i,field], message: `${p.name || "New place"}: ${field} is required before publishing.` });
      }
      if (p.kind === "wellness" && !p.categories.length) issues.push({ code: "custom", path: ["items",i,"categories"], message: `${p.name}: choose a wellness category.` });
    });
    if (issues.length) throw new z.ZodError(issues);
  }
  return parsed as ContentPayloads[K];
}
export interface CmsDocument<K extends ContentKey = ContentKey> {
  key: K; draft: ContentPayloads[K]; published: ContentPayloads[K] | null; version: number;
  updatedAt: string | null; publishedAt: string | null; updatedBy: string | null;
}
export interface CmsRevision { id: string; key: ContentKey; version: number; event: string; actor: string; createdAt: string }
export function contentMediaIds(payload: unknown): string[] {
  const found = new Set<string>();
  function walk(value: unknown) {
    if (typeof value === "string") { const id = value.match(/^\/api\/media\/([0-9a-f-]{36})$/)?.[1]; if (id) found.add(id); }
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  }
  walk(payload); return [...found];
}
