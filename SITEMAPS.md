# Werigo sitemap implementation

The public /sitemap.xml index references page, fleet, location, saga and image sitemaps. All six endpoints return application/xml and use the canonical https://werigo.co origin. robots.txt keeps existing private-path exclusions and points at the index.

## Actual content source

This site uses source-controlled Next.js content rather than a publishing CMS. Sitemap handlers discover the current release's prerendered HTML and canonical/robots metadata, which were generated from the same fleet/location/SAGA data that renders the site. Adding, updating, removing or unpublishing source content requires the normal build/deploy; no XML or sitemap URL list is edited. Newly added prerendered public pages are discovered automatically. Runtime CMS-only/dynamic pages would require an additional content adapter when that architecture is introduced.

The deployment must retain the full .next/prerender-manifest.json and .next/server/app tree (the existing npm start / Hostinger setup). Hostinger standalone output is supported when it retains this published HTML tree; postbuild copies the generated date manifest into the standalone tree. This is not a static export. Test all six routes after any hosting architecture change. Missing build output returns HTTP 503 rather than a successful empty sitemap.

## Filtering

Only same-origin self-canonical, prerendered HTML pages with status 200 are included. noindex/none (HTML or recorded X-Robots-Tag), redirects, private paths, fragments, parameters, noncanonical aliases and missing output are excluded. /terms remains noindex and is therefore omitted; its page is not changed. Transient infrastructure failures are handled by release HTTP verification, not an HTTP crawl on every sitemap request.

Image entries use relevant nondecorative /media images rendered in the page. Next image optimizer URLs are resolved to their original source. Missing local files, branding, tracking pixels and external images are excluded; version query parameters on image resources are preserved. Page loc URLs never contain queries or fragments.

## Automatic content dates

Every URL in the five child sitemaps has `lastmod`. The index lists sitemap files; its optional dates are intentionally omitted because a page update date is not necessarily the sitemap-file update date (for example, removal of a page).

After Next builds the site, npm's `postbuild` discovers eligible pages from the prerender manifest and resolves their source page, ancestor layouts, recursively imported local content/components, and rendered local images. It takes the latest actual Git content commit timestamp among those inputs. Comment-only and formatting-only source commits are ignored. Shared content, templates and translations affect every page that imports them; these are conservative source-change dates, not a CMS record's `updated_at`. Imported analytics modules, dependencies, documentation, build timestamps, filesystem mtimes and live exchange-rate refreshes do not supply timestamps.

The generated `.next/sitemap-dates.json` is also copied into `.next/standalone/.next` when that output exists, so production needs neither Git nor TypeScript. A missing/invalid date fails the sitemap response instead of silently publishing incomplete XML. New/deleted/unpublished pages still follow the published HTML automatically.

Release workflow: commit authored content and images first, then run `npm run build` (not bare `next build`). Full Git history is required; the build automatically fetches it with `git fetch --unshallow --quiet origin` for shallow hosting clones. Git read access must remain available to that build; a failed fetch stops publication rather than inventing dates. Uncommitted source changes or missing history fail generation rather than inventing a date. A rebuild or an unrelated commit keeps dates unchanged. If a CMS or remotely updated public content is introduced, use its reliable per-record modification dates instead of this repository adapter.

## Verification file

public/google0904d12c419b16bd.html is copied byte-for-byte from the supplied Google file, with the downloaded (1) suffix removed. Publishing this token allows its associated Google account to verify ownership of the https://werigo.co/ Search Console property. Obtain direct authorization for that ownership grant before deployment. Keep the file after verification. Installing it does not click Verify or submit the sitemap in Fahri's account.

## Checks

- npm run test:sitemap
- npm run lint
- npm run build
- Start the production server and fetch the index, all children and robots.txt.
- Parse XML, confirm every page loc returns 200, is self-canonical and is indexable.
- Check image URLs and compare the verification file's exact bytes.
- In Search Console, submit only https://werigo.co/sitemap.xml after release.
