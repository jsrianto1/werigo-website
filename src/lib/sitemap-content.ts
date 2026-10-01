/** Extract the canonical, indexable content actually rendered by Next.js. */
export type SitemapGroup = "page" | "fleet" | "location" | "saga";
export type SitemapKind = SitemapGroup | "image" | "index";
export interface SitemapEntry {
  url: string;
  group: SitemapGroup;
  lastModified?: string;
  images: string[];
}
export const sitemapGroups: SitemapGroup[] = ["page", "fleet", "location", "saga"];
export const childSitemaps = [...sitemapGroups, "image"] as const;

function decode(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (match, key: string) => {
    const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
    if (!key.startsWith("#")) return named[key.toLowerCase()] ?? match;
    const number = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
  });
}
function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
    (match) => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4])]));
}
export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}
export function isPublicPage(path: string): boolean {
  return path.startsWith("/") && !/[?#\\]/.test(path) &&
    !/^\/(?:_|admin(?:\/|$)|api(?:\/|$)|book\/(?:checkout|confirmation)(?:\/|$))/.test(path);
}

export function extractSitemapEntry(path: string, html: string, origin: string, status = 200): SitemapEntry | null {
  if (status !== 200 || !isPublicPage(path)) return null;
  // Do not parse escaped React payloads or tracking fallbacks as page metadata/images.
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  const metas = Array.from(document.matchAll(/<meta\b[^>]*>/gi), m => attributes(m[0]));
  if (metas.some(m => ["robots", "googlebot", "bingbot"].includes(m.name?.toLowerCase()) && /\b(noindex|none)\b/i.test(m.content ?? ""))) return null;
  if (metas.some(m => m["http-equiv"]?.toLowerCase() === "refresh")) return null;
  const canonical = Array.from(document.matchAll(/<link\b[^>]*>/gi), m => attributes(m[0]))
    .find(a => a.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href;
  if (!canonical) return null;
  let url: URL;
  try { url = new URL(canonical, origin); } catch { return null; }
  if (url.origin !== new URL(origin).origin || url.search || url.hash || url.href !== new URL(path, origin).href) return null;
  const group: SitemapGroup = /^\/fleet(?:\/|$)/.test(path) ? "fleet" :
    /^\/delivery-areas(?:\/|$)/.test(path) ? "location" : /^\/saga(?:\/|$)/.test(path) ? "saga" : "page";
  // Only use an explicitly authored content timestamp. Build/request times are not content dates.
  const modified = metas.find(m => m.property === "article:modified_time")?.content;
  const lastModified = modified && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(modified) &&
    Number.isFinite(Date.parse(modified)) && Date.parse(modified) <= Date.now() ? modified : undefined;
  const images = new Set<string>();
  for (const match of document.matchAll(/<img\b[^>]*>/gi)) {
    const a = attributes(match[0]);
    if (!a.src || !a.alt?.trim() || a["aria-hidden"] === "true" || a.role === "presentation") continue;
    try {
      let image = new URL(a.src, origin);
      if (image.origin === new URL(origin).origin && image.pathname === "/_next/image") {
        image = new URL(image.searchParams.get("url") ?? "", origin);
      }
      if (image.origin !== new URL(origin).origin || !image.pathname.startsWith("/media/") ||
          !/\.(?:webp|png|jpe?g|avif|gif)$/i.test(image.pathname)) continue;
      image.hash = "";
      images.add(image.href);
    } catch { /* Invalid or external image sources are not published. */ }
  }
  return { url: /^https?:\/\//i.test(canonical) ? canonical : url.href, group, ...(lastModified ? { lastModified } : {}), images: [...images].slice(0, 1000) };
}

export function renderSitemap(kind: SitemapKind, entries: SitemapEntry[], origin: string): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  if (kind === "index") return header + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    childSitemaps.map(group => `  <sitemap><loc>${escapeXml(new URL(`/${group}-sitemap.xml`, origin).href)}</loc></sitemap>`).join("\n") + '\n</sitemapindex>\n';
  const selected = entries.filter(entry => kind === "image" ? entry.images.length > 0 : entry.group === kind);
  if (selected.length > 50000) throw new Error("Sitemap exceeds 50,000 URLs; split this content group before publishing.");
  const xml = header + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
    (kind === "image" ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "") + '>\n' +
    selected.map(entry => `  <url><loc>${escapeXml(entry.url)}</loc>` +
      (entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : "") +
      (kind === "image" ? entry.images.map(src => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`).join("") : "") + '</url>').join("\n") + '\n</urlset>\n';
  if (Buffer.byteLength(xml, "utf8") > 50 * 1024 * 1024) throw new Error("Sitemap exceeds the uncompressed size limit.");
  return xml;
}
