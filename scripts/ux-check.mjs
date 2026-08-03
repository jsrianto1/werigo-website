/* UX refinement checks: sticky mobile CTA behavior, includes section,
   4-step process, FAQ groups, best-for cards, reassurance line. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
const results = {};

// ---- Mobile 375: sticky CTA ----
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1000));

results.stickyHiddenAtTop = await page.evaluate(
  () => ![...document.querySelectorAll("button")].some((b) => b.closest(".fixed.bottom-0") && b.textContent.includes("Check availability"))
);
// scroll past hero
await page.evaluate(() => window.scrollTo(0, 2200));
await new Promise((r) => setTimeout(r, 700));
const sticky = await page.evaluate(() => {
  const bar = [...document.querySelectorAll("div")].find(
    (d) => d.className.includes("fixed") && d.className.includes("bottom-0") && d.textContent.includes("Check availability")
  );
  if (!bar) return { visible: false };
  const r = bar.getBoundingClientRect();
  return {
    visible: true,
    atBottom: Math.abs(window.innerHeight - r.bottom) < 2,
    height: r.height,
    noHorizontalOverflow: document.documentElement.scrollWidth <= 375,
  };
});
results.stickyAfterScroll = sticky;

// tapping scrolls back to booking widget
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.closest(".fixed") && b.textContent.includes("Check availability"))
    .click();
});
await new Promise((r) => setTimeout(r, 1300));
results.stickyScrollsToWidget = await page.evaluate(() => {
  const w = document.getElementById("hero-booking");
  const r = w.getBoundingClientRect();
  return r.top > -100 && r.top < window.innerHeight;
});
// hidden again once widget is visible
await new Promise((r) => setTimeout(r, 500));
results.stickyHiddenWhenWidgetVisible = await page.evaluate(
  () => !document.querySelector(".fixed.bottom-0.z-40")
);
// does not obstruct checkout forms (different route — component only mounts on homepage)
await page.goto(
  `${BASE}/book/checkout?vehicle=bees&pickup=canggu&return=canggu&startDate=2026-08-01&startTime=09%3A00&endDate=2026-08-04&endTime=09%3A00`,
  { waitUntil: "networkidle0" }
);
results.stickyAbsentOnCheckout = await page.evaluate(
  () => !document.querySelector(".fixed.bottom-0.z-40")
);

// ---- Homepage content checks (mobile) ----
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const body = await page.evaluate(() => document.body.textContent);
results.reassuranceLine = body.includes("Your request goes straight to our team on WhatsApp. Availability and your quote confirmed there.");
results.includesSection = body.includes("What comes with your Werigo rental") && body.includes("Fully charged handover") && body.includes("2 sanitised helmets");
results.fourStepProcess = ["Choose your ride", "Review your estimate", "We confirm on WhatsApp", "Ride out ready"].every((t) => body.includes(t));
results.areaCardsEnhanced = body.includes("Explore area");
results.noFreeMisuse = !body.includes("Free helmet");
results.reviewsEmptyStatePreserved = body.includes("never invent or borrow reviews");

// ---- Fleet cards (desktop) ----
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/fleet`, { waitUntil: "networkidle0" });
const fleetChecks = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")];
  return {
    fourCards: cards.length >= 4,
    allHaveBestFor: cards.every((c) => c.textContent.includes("Best for")),
    allHaveCheckAvailability: cards.every((c) =>
      [...c.querySelectorAll("a")].some((a) => a.textContent.includes("Check availability"))
    ),
    allHaveViewDetails: cards.every((c) =>
      [...c.querySelectorAll("a")].some((a) => a.textContent.includes("View details"))
    ),
    idrRatesShown: cards.every((c) => /Rp\s?[\d,]+\/day/.test(c.textContent)),
    minTwoDayNoteOnceBelowGrid: !cards.some((c) => c.textContent.includes("Minimum rental 2 days")) && document.body.textContent.includes("Minimum rental 2 days"),
    compactStripTiers: cards.every((c) => c.textContent.includes("Best rate") && c.textContent.includes("View all duration rates")),
    durationTiers: cards.every((c) =>
      ["Daily", "Weekly", "2 Weeks", "3 Weeks", "Monthly"].every((d) => c.textContent.includes(d))
    ),
    usdEstimateFormatOk: cards.every(
      (c) => !c.textContent.includes("US$") || c.textContent.includes("≈ US$")
    ),
    benefitChips: cards.every((c) => c.textContent.includes("2 sanitised helmets")),
    noUnapprovedPolicies: cards.every(
      (c) => !/free cancellation|insurance/i.test(c.textContent)
    ),
    noVariants: !/(Standard|Extended)\b/.test(document.querySelector("main").textContent),
  };
});
results.fleetCards = fleetChecks;

// ---- Help center groups ----
await page.goto(`${BASE}/help-center`, { waitUntil: "networkidle0" });
const helpBody = await page.evaluate(() => document.body.textContent);
results.faqGroups = [
  "Booking & availability", "Delivery & return", "Licence & riding",
  "Charging & SuperCharge", "Support", "Terms & privacy",
].every((g) => helpBody.includes(g));
results.faqAnswersPreserved = helpBody.includes("International Driving Permit");

// ---- Keyboard: sticky button focusable ----
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.scrollTo(0, 2200));
await new Promise((r) => setTimeout(r, 700));
results.stickyKeyboardFocusable = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.closest(".fixed") && b.textContent.includes("Check availability")
  );
  btn?.focus();
  return document.activeElement === btn;
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
const failCount = (JSON.stringify(results).match(/false/g) || []).length;
console.log(failCount === 0 ? "ALL PASS" : `FAILURES (${failCount})`);
process.exit(failCount === 0 ? 0 : 1);
