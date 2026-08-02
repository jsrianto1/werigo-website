import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const page = await browser.newPage();
const out = {};
// Responsive widths incl. new 390/430
for (const w of [375, 390, 430, 768, 1440, 1920]) {
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3001/", { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));
  out[`overflow@${w}`] = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  out[`ctaVisible@${w}`] = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Search availability"));
    const r = btn?.getBoundingClientRect();
    return !!r && r.width > 0 && r.left >= 0;
  });
}
// Banned phrase scan across routes
const routes = ["/","/fleet","/fleet/bees","/fleet/victory","/fleet/athena","/fleet/edpower","/supercharge","/how-it-works","/delivery-areas","/about","/help-center","/contact","/terms","/privacy","/book"];
const banned = [/24\s*\/\s*7/i, /24[- ]hour/i, /midnight/i, /emergency (line|hotline|number|support)/i, /roadside (help|assistance)/i, /rescue|recovery service/i, /replacement motorcycle/i, /always available/i, /any hour/i, /riding hours/i, /current support hours/i, /petrol scooter/i, /petrol motorcycle/i];
let bad = 0;
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
for (const route of routes) {
  await page.goto(`http://localhost:3001${route}`, { waitUntil: "networkidle0", timeout: 45000 });
  await page.evaluate(() => { document.querySelectorAll("button[aria-expanded]").forEach(b => b.click()); });
  await new Promise(r => setTimeout(r, 300));
  const text = await page.evaluate(() => document.body.innerText + " " + document.title + " " + (document.querySelector('meta[name="description"]')?.content ?? ""));
  for (const re of banned) { const m = text.match(re); if (m) { console.log(`VIOLATION ${route}: "${m[0]}"`); bad++; } }
}
out.phraseScan = bad === 0 ? "PASS" : `FAIL (${bad})`;
// New section + hours render check
await page.goto("http://localhost:3001/", { waitUntil: "networkidle0" });
out.newSection = await page.evaluate(() =>
  ["MADE FOR BALI", "Electric riding that fits the island", "Quiet, easy to charge and ready for everyday Bali journeys.",
   "Quiet electric riding", "Zero tailpipe emissions", "Charging from a standard outlet", "Comfortable for everyday Bali trips"]
    .every(t => document.body.innerText.includes(t)));
out.hoursStated = await page.evaluate(() => document.body.innerText.includes("Our team replies daily from 08:00 to 20:00 WITA."));
// Section screenshots
await page.setViewport({ width: 1440, height: 1250, deviceScaleFactor: 1 });
await page.goto("http://localhost:3001/", { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 1500));
for (const [id, name] of [["benefits-heading","made-for-bali"],["support-heading","support-hours"]]) {
  const y = await page.evaluate((i) => document.getElementById(i).closest("section").getBoundingClientRect().top + scrollY - 30, id);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `screenshots/rev-${name}.png` });
}
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto("http://localhost:3001/", { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 1200));
const y = await page.evaluate(() => document.getElementById("benefits-heading").closest("section").getBoundingClientRect().top + scrollY - 20);
await page.evaluate((yy) => window.scrollTo(0, yy), y);
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: "screenshots/rev-mobile-390.png" });
console.log(JSON.stringify(out, null, 2));
await browser.close();
process.exit(bad === 0 && out.newSection && out.hoursStated ? 0 : 1);
