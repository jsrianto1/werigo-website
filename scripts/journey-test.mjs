/* Functional test: full booking journey with Extended variant on the
   production build. Run `next start` first. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const results = {};
try {
  // Step 1-2: search results
  await page.goto(
    `${BASE}/book?pickup=canggu&return=ubud&startDate=2026-07-28&startTime=09%3A00&endDate=2026-07-31&endTime=09%3A00`,
    { waitUntil: "networkidle0" }
  );
  await page.waitForFunction(
    () => document.body.textContent.includes("Wedison models for"),
    { timeout: 15000 }
  );
  results.resultsRendered = true;
  results.exactlyFourModels = await page.evaluate(
    () => document.querySelectorAll("main ul > li h2").length === 4
  );
  results.noVariantWording = await page.evaluate(
    () => !/(Standard|Extended)/.test(document.querySelector("main").textContent)
  );

  // Step 3: select Victory → checkout
  await page.evaluate(() => {
    const row = [...document.querySelectorAll("main li")].find((li) =>
      li.textContent.includes("Wedison Victory")
    );
    [...row.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Check availability"))
      .click();
  });
  await page.waitForFunction(
    () => location.pathname === "/book/checkout",
    { timeout: 15000 }
  );
  results.checkoutUrlModel = page.url().includes("vehicle=victory");
  await page.waitForFunction(
    () => document.body.textContent.includes("Make it yours"),
    { timeout: 15000 }
  );
  results.checkoutShowsModelName = await page.evaluate(() =>
    document.body.textContent.includes("Wedison Victory")
  );
  results.checkoutNoVariantWording = await page.evaluate(
    () => !/(Standard|Extended)/.test(document.body.textContent)
  );
  results.checkoutHasNoPrices = await page.evaluate(
    () => !/Rp\s?\d{2,3}[.,]\d{3}/.test(document.body.textContent)
  );

  // Step 4: add extra helmet, continue
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.getAttribute("aria-label") === "Add one Extra helmet")
      ?.click();
  });
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to your details"))
      .click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("Who's riding?"),
    { timeout: 10000 }
  );

  // Step 5: fill details
  await page.type("#field-fullName", "Test Rider");
  await page.type("#field-email", "test@example.com");
  await page.type("#field-whatsapp", "+61 400 000 000");
  await page.type("#field-nationality", "Australian");
  await page.type("#field-hotelName", "Villa Test Canggu");
  await page.click("#field-termsAccepted");
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("One last look"),
    { timeout: 10000 }
  );
  results.reviewShowsRateOnRequest = await page.evaluate(() =>
    document.body.textContent.includes("Available upon request")
  );

  // Step 6-8: confirm via save (avoid opening WhatsApp window)
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Save booking request"))
      .click();
  });
  await page.waitForFunction(
    () => location.pathname === "/book/confirmation",
    { timeout: 10000 }
  );
  await page.waitForFunction(
    () => document.body.textContent.includes("Booking request received"),
    { timeout: 10000 }
  );
  results.confirmationRendered = true;

  // WhatsApp link content
  const waHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((x) =>
      x.href.includes("wa.me")
    );
    return a ? decodeURIComponent(a.href) : null;
  });
  results.waHasModel = waHref?.includes("Wedison Victory") ?? false;
  results.waNoVariant = waHref ? !waHref.includes("Extended") : false;
  results.waHasNoTotal = waHref ? !/Rp\s?\d/.test(waHref) : false;
  results.waAsksForRate = waHref?.includes("rate and availability") ?? false;
} catch (err) {
  results.error = String(err).slice(0, 300);
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
process.exit(results.error ? 1 : 0);
