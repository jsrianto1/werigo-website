/* Functional test: full booking journey on the production build.
   WhatsApp-only booking mode: the final step must open WhatsApp with
   every booking detail (including the approved pricing estimate and
   the battery-return acknowledgement) and make ZERO /api/bookings
   requests. Also covers the 2-day minimum and the EdPower age rule. */
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
  // ---- Minimum 2 days: a 1-day search must show the validation message
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const sd = document.querySelector("#start-date") ?? document.querySelector('input[type="date"]');
    // fall through — widget test below drives via /book URL instead
    return Boolean(sd);
  });
  await page.goto(
    `${BASE}/book/checkout?vehicle=victory&pickup=canggu&return=canggu&startDate=2026-08-01&startTime=09%3A00&endDate=2026-08-02&endTime=09%3A00`,
    { waitUntil: "networkidle0" }
  );
  results.oneDayCheckoutBlocked = await page.evaluate(() =>
    document.body.textContent.includes("Minimum rental is 2 days.")
  );

  // ---- Full journey: Victory, 3 days (Daily tier: 90,000/day, 270,000)
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
  results.resultsShowVictoryEstimate = await page.evaluate(() => {
    const row = [...document.querySelectorAll("main li")].find((li) =>
      li.textContent.includes("Wedison Victory")
    );
    return row?.textContent.includes("Rp 90,000/day") && row?.textContent.includes("Rp 270,000");
  });

  await page.evaluate(() => {
    const row = [...document.querySelectorAll("main li")].find((li) =>
      li.textContent.includes("Wedison Victory")
    );
    [...row.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Check availability"))
      .click();
  });
  await page.waitForFunction(() => location.pathname === "/book/checkout", { timeout: 15000 });
  await page.waitForFunction(
    () => document.body.textContent.includes("Make it yours"),
    { timeout: 15000 }
  );
  results.checkoutShowsModelName = await page.evaluate(() =>
    document.body.textContent.includes("Wedison Victory")
  );
  results.checkoutInclusionsWording = await page.evaluate(() =>
    document.body.textContent.includes(
      "Two sanitised helmets and one installed phone holder are already included."
    )
  );

  // Add-ons: request a rain poncho
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.getAttribute("aria-label") === "Add one Rain poncho")
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
  results.whatToPrepareNote = await page.evaluate(() =>
    document.body.textContent.includes("What to prepare")
  );

  // Empty submit blocks with first-name error
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  results.validationBlocksEmptyDetails = await page.evaluate(() =>
    document.body.textContent.includes("Enter your first name.")
  );

  // Paste scenario A: full international number into the NUMBER field
  await page.evaluate(() => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("field-countryCode", "+62");
    set("field-whatsapp", "+628121311712");
  });
  await page.focus("#field-whatsapp");
  await page.focus("#field-firstName"); // blur triggers normalization
  await new Promise((r) => setTimeout(r, 200));
  results.pasteFullNumberNormalized = await page.evaluate(
    () =>
      document.getElementById("field-countryCode").value === "+62" &&
      document.getElementById("field-whatsapp").value === "8121311712"
  );

  // Paste scenario B: full number into the COUNTRY-CODE field
  await page.evaluate(() => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("field-countryCode", "+618121311712");
    set("field-whatsapp", "");
  });
  await page.focus("#field-countryCode");
  await page.focus("#field-firstName");
  await new Promise((r) => setTimeout(r, 200));
  results.pasteIntoCcFieldNormalized = await page.evaluate(
    () =>
      document.getElementById("field-countryCode").value === "+61" &&
      document.getElementById("field-whatsapp").value === "8121311712"
  );

  // Reset phone fields for the real run
  await page.evaluate(() => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("field-countryCode", "");
    set("field-whatsapp", "");
  });

  // Fill details (email left empty: optional)
  await page.type("#field-firstName", "Test");
  await page.type("#field-lastName", "Rider");
  await page.evaluate(() => {
    const cc = document.getElementById("field-countryCode");
    cc.value = "";
  });
  await page.type("#field-countryCode", "+61");
  await page.type("#field-whatsapp", "400 000 000");
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

  // Review shows the pricing estimate
  results.reviewShowsTier = await page.evaluate(() =>
    document.body.textContent.includes("Daily (2 to 6 days)")
  );
  results.reviewShowsRate = await page.evaluate(() =>
    document.body.textContent.includes("Rp 90,000 per day")
  );
  results.reviewShowsTotal = await page.evaluate(() => {
    const t = document.body.textContent;
    return t.includes("Rp 270,000") && t.includes("for 3 days");
  });
  results.summaryShowsEstimate = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    return aside?.textContent.includes("Rp 90,000/day") && aside?.textContent.includes("Rp 270,000");
  });
  results.batteryNoteShown = await page.evaluate(() =>
    document.body.textContent.includes(
      "Please return the motorcycle with at least 80% battery"
    )
  );
  results.finalCtaWording = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) =>
      b.textContent.includes("Send booking request on WhatsApp")
    )
  );

  // Battery ack required before anything opens
  await page.evaluate(() => {
    window.__waUrl = null;
    window.open = (u) => {
      window.__waUrl = u;
      return null;
    };
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Send booking request on WhatsApp"))
      .click();
  });
  results.batteryAckRequired = await page.evaluate(
    () => window.__waUrl === null &&
      document.body.textContent.includes("Please acknowledge the 80% battery-return arrangement")
  );
  await page.click("#field-batteryAck");

  // Privacy consent still required
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Send booking request on WhatsApp"))
      .click();
  });
  results.consentRequired = await page.evaluate(
    () => window.__waUrl === null &&
      document.body.textContent.includes("Please confirm you agree")
  );
  await page.click("#field-privacyConsent");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Send booking request on WhatsApp"))
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
  results.waHasTier = wa?.includes("Tier: Daily (2 to 6 days)") ?? false;
  results.waHasRate = wa?.includes("Rate: Rp 90,000/day") ?? false;
  results.waHasTotal = wa?.includes("Estimated total: Rp 270,000") ?? false;
  results.waHasEstimateCaveat = wa?.includes("Subject to availability and confirmation by Werigo.") ?? false;
  results.waHasDeliveryAreaAndAddress = (wa?.includes("Canggu") && wa?.includes("Villa Test Canggu")) ?? false;
  results.waHasReturnArea = wa?.includes("Ubud") ?? false;
  results.waHasStart = wa?.includes("From: 2026-07-28 09:00") ?? false;
  results.waHasEnd = wa?.includes("To: 2026-07-31 09:00") ?? false;
  results.waHasDuration = wa?.includes("Duration: 3 days") ?? false;
  results.waHasAddOn = wa?.includes("Rain poncho × 1") ?? false;
  results.waHasName = wa?.includes("Name: Test Rider") ?? false;
  results.waHasCountryCodeAndNumber = wa?.includes("WhatsApp: +61 400000000") ?? false;
  results.waOmitsEmptyEmail = wa ? !wa.includes("Email:") : false;
  results.waHasFlight = wa?.includes("GA715") ?? false;
  results.waHasBatteryAck = wa?.includes("Battery return: I will return the motorcycle with at least 80% battery") ?? false;
  results.waHasNotes = wa?.includes("surf rack") ?? false;
  results.waHasNoBookingCode = wa ? !/WRG-\d{8}/.test(wa) : false;

  // No stored/saved/booking-code claims anywhere in the flow
  results.noStoredClaims = await page.evaluate(
    () => !/(saved securely|booking code|booking reference)/i.test(document.body.textContent)
  );

  // ---- EdPower age rule: age checkbox required
  await page.goto(
    `${BASE}/book/checkout?vehicle=edpower&pickup=canggu&return=canggu&startDate=2026-07-28&startTime=09%3A00&endDate=2026-07-31&endTime=09%3A00`,
    { waitUntil: "networkidle0" }
  );
  await page.waitForFunction(
    () => document.body.textContent.includes("Make it yours"),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to your details"))
      .click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("Who's riding?"),
    { timeout: 10000 }
  );
  results.edpowerAgeCheckboxShown = await page.evaluate(() =>
    Boolean(document.getElementById("field-ageConfirmed"))
  );
  await page.type("#field-firstName", "Age");
  await page.type("#field-lastName", "Test");
  await page.evaluate(() => { document.getElementById("field-countryCode").value = ""; });
  await page.type("#field-countryCode", "+62");
  await page.type("#field-whatsapp", "81234567");
  await page.type("#field-hotelName", "Test Hotel");
  await page.click("#field-termsAccepted");
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  results.edpowerAgeBlocked = await page.evaluate(() =>
    document.body.textContent.includes("The EdPower requires a rider aged 25 or older.")
  );
  await page.click("#field-ageConfirmed");
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("One last look"),
    { timeout: 10000 }
  );
  results.edpowerReviewReached = true;

  // Bees checkout must NOT show an age checkbox (no invented restrictions)
  await page.goto(
    `${BASE}/book/checkout?vehicle=bees&pickup=canggu&return=canggu&startDate=2026-07-28&startTime=09%3A00&endDate=2026-07-31&endTime=09%3A00`,
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );
  await page.waitForFunction(
    () => document.body.textContent.includes("Make it yours"),
    { timeout: 20000 }
  );
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to your details"))
      ?.click();
  });
  await page.waitForFunction(
    () => document.body.textContent.includes("Who's riding?"),
    { timeout: 10000 }
  );
  results.beesHasNoAgeCheckbox = await page.evaluate(() =>
    !document.getElementById("field-ageConfirmed")
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
