/* Verify checkout renders correctly for all six Wedison entries. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const qs =
  "pickup=canggu&return=canggu&startDate=2026-07-28&startTime=09%3A00&endDate=2026-07-31&endTime=09%3A00";
const entries = [
  ["bees", "Wedison Bees"],
  ["victory", "Wedison Victory"],
  ["victory-extended", "Wedison Victory Extended"],
  ["athena", "Wedison Athena"],
  ["athena-extended", "Wedison Athena Extended"],
  ["edpower", "Wedison EdPower"],
];

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
const results = {};
for (const [id, name] of entries) {
  await page.goto(`${BASE}/book/checkout?vehicle=${id}&${qs}`, {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("Make it yours"),
    { timeout: 15000 }
  );
  const body = await page.evaluate(() => document.body.textContent);
  results[id] = {
    showsName: body.includes(name),
    noPrices: !/Rp\s?\d{2,3}[.,]\d{3}/.test(body),
    variantPicker: body.includes("Standard and Extended"),
  };
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
