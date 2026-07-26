/* Verify colour selectors on all product pages + no external hotlinks. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const OUT = "C:/Users/LOQ/Documents/werigo-website/screenshots";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
const results = {};

async function checkModel(slug, expectColors) {
  await page.goto(`${BASE}/fleet/${slug}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 700));
  const info = await page.evaluate(() => {
    const radios = [...document.querySelectorAll('fieldset input[type="radio"]')];
    const labels = radios.map((r) => r.closest("label").textContent.trim());
    const externalImgs = [...document.images].filter(
      (i) => i.src && !i.src.startsWith(location.origin) && !i.src.startsWith("data:")
    );
    return {
      swatches: labels,
      externalHotlinks: externalImgs.map((i) => i.src),
      confirmNote: document.body.textContent.includes(
        "Colour availability is subject to confirmation."
      ) || document.body.textContent.includes("Colour options awaiting confirmation."),
    };
  });
  // Select last colour (if any) and confirm the main image changes, specs don't
  let swap = null;
  if (expectColors.length > 0) {
    const before = await page.evaluate(() => {
      const img = document.querySelector(".space-y-4 img");
      return { src: img?.src, body: document.body.textContent.length };
    });
    await page.evaluate((color) => {
      const radios = [...document.querySelectorAll('fieldset input[type="radio"]')];
      const target = radios.find((r) => r.value === color);
      target.closest("label").click();
    }, expectColors[expectColors.length - 1]);
    await new Promise((r) => setTimeout(r, 700));
    const after = await page.evaluate(() => {
      const img = document.querySelector(".space-y-4 img");
      return {
        src: img?.src,
        alt: img?.alt,
        specsIntact: document.body.textContent.includes("up to"),
        rateIntact: document.body.textContent.includes(
          "Rental rate available upon request"
        ),
      };
    });
    swap = {
      imageChanged: before.src !== after.src,
      newAlt: after.alt?.slice(0, 70),
      specsIntact: after.specsIntact,
      rateIntact: after.rateIntact,
    };
  }
  return { ...info, swap };
}

const expectations = {
  bees: ["Red", "White"],
  victory: ["Grey"],
  athena: ["Green"],
  edpower: [],
};

// Desktop
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
for (const [slug, colors] of Object.entries(expectations)) {
  results[`${slug}-desktop`] = await checkModel(slug, colors);
}
await page.goto(`${BASE}/fleet/bees`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/bees-colors-desktop.png`, fullPage: false });

// Mobile 375
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
results["bees-mobile"] = await checkModel("bees", ["Red", "White"]);
results["athena-mobile"] = await checkModel("athena", ["Green"]);
await page.goto(`${BASE}/fleet/bees`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/bees-colors-mobile.png`, fullPage: false });

console.log(JSON.stringify(results, null, 2));
await browser.close();
