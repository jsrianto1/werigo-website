import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto("http://localhost:3001/", { waitUntil: "networkidle0", timeout: 45000 });
const r = await page.evaluate(() => {
  const info = (id) => {
    const sec = document.getElementById(id).closest("section");
    const inner = sec.querySelector(":scope > div");
    const cs = getComputedStyle(sec), ci = getComputedStyle(inner);
    return { sectionPad: [cs.paddingTop, cs.paddingBottom], innerPad: [ci.paddingTop, ci.paddingBottom], sectionClass: sec.className };
  };
  return {
    trust: info("trust-heading"),
    includes: info("includes-heading"),
    how: info("how-heading"),
    benefits: info("benefits-heading"),
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
