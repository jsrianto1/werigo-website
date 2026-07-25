/* Verify real photos render (no placeholders) + capture screenshots. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const OUT = "C:/Users/LOQ/Documents/werigo-website/screenshots";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
const results = {};

async function audit(url, name) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[src*="/media/"], img[src*="_next/image"]')];
    return {
      realImages: imgs.length,
      loaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
      alts: imgs.map((i) => i.alt.slice(0, 60)),
      placeholderTexts: [...document.querySelectorAll("*")].filter((el) =>
        el.childNodes.length === 1 &&
        el.textContent === "Official photography in production"
      ).length,
    };
  });
}

// Desktop
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
results.homeDesktop = await audit("/", "home");
results.fleetDesktop = await audit("/fleet", "fleet");
for (const slug of ["bees", "victory", "athena", "edpower"]) {
  results[`${slug}Desktop`] = await audit(`/fleet/${slug}`, slug);
}
results.superchargeDesktop = await audit("/supercharge", "supercharge");
results.bookResults = await audit(
  "/book?pickup=canggu&return=canggu&startDate=2026-07-28&startTime=09%3A00&endDate=2026-07-31&endTime=09%3A00",
  "book"
);

// Screenshots desktop
for (const [name, url] of [
  ["home-desktop", "/"],
  ["fleet-desktop", "/fleet"],
  ["athena-desktop", "/fleet/athena"],
  ["supercharge-desktop", "/supercharge"],
]) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

// Mobile
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
results.homeMobile = await audit("/", "home-m");
results.athenaMobile = await audit("/fleet/athena", "athena-m");
for (const [name, url] of [
  ["home-mobile", "/"],
  ["fleet-mobile", "/fleet"],
  ["athena-mobile", "/fleet/athena"],
  ["supercharge-mobile", "/supercharge"],
]) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
