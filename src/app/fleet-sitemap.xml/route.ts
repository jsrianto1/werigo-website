import { sitemapResponse } from "@/lib/sitemap-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return sitemapResponse("fleet");
}
