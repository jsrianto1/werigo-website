/* Functional test: full booking journey on the production build.
   TEMPORARY WhatsApp-first mode: the final step must open WhatsApp
   with every booking detail and make ZERO /api/bookings requests. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const apiRequests = [];
page.on("request", (req) => {
  if (req.url().includes("/api/bookings")) apiRequests.push(req.url());
});

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
    () => !/(Standard|Extended)/.test(document.querySelector("main").textContent)
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
    () => !/(Standard|Extended)/.test(document.body.textContent)
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

  // Validation keeps the form: submit empty first
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  results.validationBlocksEmptyDetails = await page.evaluate(() =>
    document.body.textContent.includes("Enter your full name.")
  );

  // Step 5: fill details
  await page.type("#field-fullName", "Test Rider");
  await page.type("#field-email", "test@example.com");
  await page.type("#field-whatsapp", "+61 400 000 000");
  await page.type("#field-nationality", "Australian");
  await page.type("#field-hotelName", "Villa Test Canggu");
  await page.type("#field-flightNumber", "GA715");
  await page.type("#field-specialRequest", "Please include a surf rack if possible");
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
  results.finalButtonIsWhatsApp = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) =>
      b.textContent.includes("Continue to WhatsApp")
    )
  );
  results.helperTextPresent = await page.evaluate(() =>
    document.body.textContent.includes(
      "Your booking request will open in WhatsApp. Our team will confirm availability and send your quote."
    )
  );
  results.consentWordingPresent = await page.evaluate(() =>
    document.body.textContent.includes(
      "I agree to send these details to Werigo through WhatsApp"
    )
  );

  // Consent is required: click without consent → error, data preserved
  await page.evaluate(() => {
    window.__waUrl = null;
    window.open = (u) => {
      window.__waUrl = u;
      return null;
    };
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to WhatsApp"))
      .click();
  });
  results.consentRequired = await page.evaluate(
    () => window.__waUrl === null &&
      document.body.textContent.includes("Please confirm you agree")
  );

  // Consent + send
  await page.click("#field-privacyConsent");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to WhatsApp"))
      .click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("Your request is ready in WhatsApp"),
    { timeout: 10000 }
  );
  results.handoffRendered = true;

  const wa = await page.evaluate(() => window.__waUrl && decodeURIComponent(window.__waUrl));
  results.waOpened = Boolean(wa);
  results.waIsWaMe = wa?.startsWith("https://wa.me/") ?? false;
  results.waHasModelAndQty = wa?.includes("Wedison Victory × 1") ?? false;
  results.waHasDeliveryAreaAndAddress = (wa?.includes("Canggu") && wa?.includes("Villa Test Canggu")) ?? false;
  results.waHasReturnArea = wa?.includes("Ubud") ?? false;
  results.waHasStart = wa?.includes("From: 2026-07-28 09:00") ?? false;
  results.waHasEnd = wa?.includes("To: 2026-07-31 09:00") ?? false;
  results.waHasDuration = wa?.includes("Duration: 3 days") ?? false;
  results.waHasExtras = wa?.includes("Extra helmet × 1") ?? false;
  results.waHasName = wa?.includes("Test Rider") ?? false;
  results.waHasWhatsApp = wa?.includes("+61 400 000 000") ?? false;
  results.waHasEmail = wa?.includes("test@example.com") ?? false;
  results.waHasFlight = wa?.includes("GA715") ?? false;
  results.waHasNotes = wa?.includes("surf rack") ?? false;
  results.waHasNoBookingCode = wa ? !/WRG-\d{8}/.test(wa) : false;
  results.waHasNoTotal = wa ? !/Rp\s?\d/.test(wa) : false;
  results.waAsksForRate = wa?.includes("availability and the rate") ?? false;

  // Truthfulness: no stored/saved/booking-code wording anywhere in flow
  results.noStoredClaims = await page.evaluate(
    () => !/(saved securely|booking code|booking reference)/i.test(document.body.textContent)
  );

  // Zero database traffic in the whole journey
  results.noApiBookingsRequests = apiRequests.length === 0;
} catch (err) {
  results.error = String(err).slice(0, 300);
}

console.log(JSON.stringify(results, null, 2));
const failed =
  Boolean(results.error) ||
  Object.values(results).some((v) => v === false);
console.log(failed ? "JOURNEY FAIL" : "JOURNEY PASS");
await browser.close();
process.exit(failed ? 1 : 0);
