/* Mobile drawer interaction test on the production build (375px). */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
});
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1200));

const results = {};
const btnSel = 'button[aria-controls="mobile-drawer"]';

async function tapHamburger() {
  const btn = await page.$(btnSel);
  const box = await btn.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await new Promise((r) => setTimeout(r, 500));
}

// 1. First tap opens with full-height drawer
await tapHamburger();
results.afterFirstTap = await page.evaluate(() => {
  const d = document.getElementById("mobile-drawer");
  const b = document.querySelector('button[aria-controls="mobile-drawer"]');
  const r = d?.getBoundingClientRect();
  return {
    open: Boolean(d),
    height: r?.height,
    fullHeight: r ? r.height > 700 : false,
    ariaExpanded: b?.getAttribute("aria-expanded"),
    links: d ? d.querySelectorAll("a").length : 0,
    bodyLocked: document.body.style.overflow === "hidden",
    focusInDrawer: d?.contains(document.activeElement) ?? false,
    hasCloseButton: Boolean(d?.querySelector('button[aria-label="Close menu"]')),
    hasRentCta: Boolean([...(d?.querySelectorAll("a") ?? [])].find((a) => a.textContent.includes("Rent a Bike"))),
    hasLanguage: d?.textContent.includes("Bahasa Indonesia") ?? false,
  };
});

// 2. Delivery Areas submenu accordion
results.submenu = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll('#mobile-drawer button')].find((b) =>
    b.textContent.trim().startsWith("Delivery Areas")
  );
  btn.click();
  await new Promise((r) => setTimeout(r, 300));
  const sub = document.getElementById("drawer-areas");
  return {
    ariaExpanded: btn.getAttribute("aria-expanded"),
    visible: sub ? !sub.hidden : false,
    areaLinks: sub ? sub.querySelectorAll("a").length : 0,
  };
});

// 3. Escape closes + focus returns to hamburger
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 400));
results.afterEscape = await page.evaluate(() => ({
  closed: !document.getElementById("mobile-drawer"),
  bodyUnlocked: document.body.style.overflow !== "hidden",
  focusOnHamburger:
    document.activeElement ===
    document.querySelector('button[aria-controls="mobile-drawer"]'),
}));

// 4. Outside tap closes
await tapHamburger();
await page.mouse.click(20, 400); // overlay area left of panel
await new Promise((r) => setTimeout(r, 400));
results.afterOutsideTap = await page.evaluate(() => ({
  closed: !document.getElementById("mobile-drawer"),
}));

// 5. Link selection closes + navigates
await tapHamburger();
await page.evaluate(() => {
  [...document.querySelectorAll("#mobile-drawer a")]
    .find((a) => a.textContent.trim() === "Our Fleet")
    .click();
});
await new Promise((r) => setTimeout(r, 1500));
results.afterLinkTap = await page.evaluate(() => ({
  navigatedToFleet: location.pathname === "/fleet",
  drawerClosed: !document.getElementById("mobile-drawer"),
}));

// 6. No horizontal overflow with drawer open
await tapHamburger();
results.noHorizontalOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
);

results.consoleErrors = consoleErrors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
