import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { site } from "@/lib/config";
import { extractSitemapEntry, isPublicPage, renderSitemap, type SitemapEntry, type SitemapKind } from "./sitemap-content";

interface PrerenderManifest {
  routes: Record<string, { initialStatus?: number; initialHeaders?: Record<string, string> }>;
}

/**
 * Content currently ships as Next prerendered pages, not a CMS collection.
 * Reading that release's HTML keeps publication, canonical and robots decisions
 * identical to the page itself. A new published chapter/area needs no sitemap edit.
 * Requires the full .next/server/app output used by our Node/Hostinger deployment.
 */
async function readPublishedEntries(): Promise<SitemapEntry[]> {
  const root = process.cwd();
  const manifest: PrerenderManifest = JSON.parse(await readFile(path.join(root, ".next/prerender-manifest.json"), "utf8"));
  const entries = await Promise.all(Object.entries(manifest.routes).map(async ([route, info]) => {
    if (!isPublicPage(route) || (info.initialStatus ?? 200) !== 200) return null;
    const headers = Object.entries(info.initialHeaders ?? {});
    if (headers.some(([key, value]) => key.toLowerCase() === "x-robots-tag" && /\b(noindex|none)\b/i.test(value))) return null;
    if (headers.some(([key]) => key.toLowerCase() === "location")) return null;
    // Metadata endpoints and assets have .body output, not .html page output.
    const file = path.join(root, ".next/server/app", route === "/" ? "index.html" : `${route.slice(1)}.html`);
    let html: string;
    try { html = await readFile(file, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    const entry = extractSitemapEntry(route, html, site.baseUrl, info.initialStatus ?? 200);
    if (!entry) return null;
    const validImages = await Promise.all(entry.images.map(async src => {
      const pathname = decodeURIComponent(new URL(src).pathname);
      const publicRoot = path.resolve(root, "public");
      const imagePath = path.resolve(publicRoot, `.${pathname}`);
      if (!imagePath.startsWith(publicRoot + path.sep)) return null;
      try { return (await stat(imagePath)).isFile() ? src : null; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    }));
    entry.images = validImages.filter((src): src is string => src !== null);
    return entry;
  }));
  return [...new Map(entries.filter((e): e is SitemapEntry => e !== null).map(e => [e.url, e])).values()]
    .sort((a, b) => a.url.localeCompare(b.url));
}

export async function sitemapResponse(kind: SitemapKind): Promise<Response> {
  try {
    const entries = kind === "index" ? [] : await readPublishedEntries();
    if (kind !== "index" && entries.length === 0) throw new Error("Published page output is missing.");
    return new Response(renderSitemap(kind, entries, site.baseUrl), {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" },
    });
  } catch (error) {
    console.error("Sitemap generation failed", error);
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
