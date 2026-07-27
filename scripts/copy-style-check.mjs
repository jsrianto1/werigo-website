/* Copy-style check: renders every public route and fails if visible
   customer-facing text or public metadata contains an em dash (U+2014)
   or en dash (U+2013). Inspects rendered text only, so technical
   hyphens in source code are never flagged. See COPY-STYLE.md. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const EXECUTABLE =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const routes = [
  "/", "/fleet", "/fleet/bees", "/fleet/victory", "/fleet/athena",
  "/fleet/edpower", "/supercharge", "/how-it-works", "/delivery-areas",
  "/delivery-areas/canggu", "/delivery-areas/seminyak",
  "/delivery-areas/kuta", "/delivery-areas/ubud",
  "/delivery-areas/uluwatu", "/delivery-areas/jimbaran",
  "/delivery-areas/sanur", "/delivery-areas/denpasar",
  "/about", "/help-center", "/contact", "/terms", "/privacy", "/book",
  "/book/checkout?vehicle=victory&pickup=canggu&return=canggu&startDate=2099-08-01&startTime=09%3A00&endDate=2099-08-04&endTime=09%3A00",
  "/does-not-exist-404",
];

const browser = await puppeteer.launch({ executablePath: EXECUTABLE, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const violations = [];
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  // expand accordions so hidden answers are rendered text too
  await page
    .evaluate(() => {
      document
        .querySelectorAll('button[aria-expanded="false"]')
        .forEach((b) => b.click());
    })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  const found = await page.evaluate(() => {
    const bad = [];
    const texts = [
      document.title,
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "",
      document.body.innerText,
    ];
    // also alt text and aria-labels (spoken to customers)
    document.querySelectorAll("img[alt]").forEach((i) => texts.push(i.getAttribute("alt") ?? ""));
    document.querySelectorAll("[aria-label]").forEach((el) => texts.push(el.getAttribute("aria-label") ?? ""));
    for (const t of texts) {
      for (const m of t.matchAll(/[^\n]{0,40}[\u2013\u2014][^\n]{0,40}/g)) {
        bad.push(m[0].trim());
      }
    }
    return [...new Set(bad)];
  });
  // Expand hidden FAQ panels: also scan full HTML text nodes of accordions
  if (found.length > 0) violations.push({ route, samples: found.slice(0, 8) });
}

await browser.close();
if (violations.length > 0) {
  console.log(JSON.stringify(violations, null, 2));
  console.log(`COPY STYLE FAIL: ${violations.length} route(s) contain long dashes`);
  process.exit(1);
}
console.log(`COPY STYLE PASS: ${routes.length} routes clean`);
