# Werigo sitemap implementation

The public /sitemap.xml index references page, fleet, location, saga and image sitemaps. All six endpoints return application/xml and use the canonical https://werigo.co origin. robots.txt keeps existing private-path exclusions and points at the index.

## Actual content source

This site uses source-controlled Next.js content rather than a publishing CMS. Sitemap handlers discover the current release's prerendered HTML and canonical/robots metadata, which were generated from the same fleet/location/SAGA data that renders the site. Adding, updating, removing or unpublishing source content requires the normal build/deploy; no XML or sitemap URL list is edited. Newly added prerendered public pages are discovered automatically. Runtime CMS-only/dynamic pages would require an additional content adapter when that architecture is introduced.

The deployment must retain the full .next/prerender-manifest.json and .next/server/app tree (the existing npm start / Hostinger setup). This implementation is not a static export or a standalone trace-only deployment. Test all six routes after any hosting architecture change. Missing build output returns HTTP 503 rather than a successful empty sitemap.

## Filtering

Only same-origin self-canonical, prerendered HTML pages with status 200 are included. noindex/none (HTML or recorded X-Robots-Tag), redirects, private paths, fragments, parameters, noncanonical aliases and missing output are excluded. /terms remains noindex and is therefore omitted; its page is not changed. Transient infrastructure failures are handled by release HTTP verification, not an HTTP crawl on every sitemap request.

Image entries use relevant nondecorative /media images rendered in the page. Next image optimizer URLs are resolved to their original source. Missing local files, branding, tracking pixels and external images are excluded; version query parameters on image resources are preserved. Page loc URLs never contain queries or fragments.

## Accurate lastmod limitation

The current public content has no authored updated_at / dateModified timestamps. Booking database timestamps are unrelated and must not be used. The old sitemap fabricated freshness using new Date(); that has been removed. lastmod is omitted when a reliable content timestamp is unavailable, as allowed by the sitemap protocol. If content metadata provides article:modified_time, it is automatically carried into the sitemap after validation. Do not use build times, filesystem mtimes or the example dates in the supplied Word specification. Full automatic updated_at behavior needs real timestamps in the future content source; it is intentionally not claimed here.

## Verification file

public/google0904d12c419b16bd.html is copied byte-for-byte from the supplied Google file, with the downloaded (1) suffix removed. Publishing this token allows its associated Google account to verify ownership of the https://werigo.co/ Search Console property. Obtain direct authorization for that ownership grant before deployment. Keep the file after verification. Installing it does not click Verify or submit the sitemap in Fahri's account.

## Checks

- node scripts/sitemap-test.mjs
- npm run lint
- npm run build
- Start the production server and fetch the index, all children and robots.txt.
- Parse XML, confirm every page loc returns 200, is self-canonical and is indexable.
- Check image URLs and compare the verification file's exact bytes.
- In Search Console, submit only https://werigo.co/sitemap.xml after release.
