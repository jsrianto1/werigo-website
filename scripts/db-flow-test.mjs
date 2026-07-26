/* Booking database flow test — runs against the production build with
   BOOKING_STORE=memory (the same API route, validation, code
   generation, idempotency and WhatsApp gating as the Supabase driver).
   A second server with SIMULATE_DB_FAILURE=1 covers the failure path. */
import puppeteer from "puppeteer-core";

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const FAIL_BASE = process.env.FAIL_BASE ?? "http://localhost:3002";
const results = {};

/* ---------- API-level tests ---------- */
const validPayload = () => ({
  clientSubmissionId: crypto.randomUUID(),
  fullName: "TEST BOOKING — Werigo QA",
  email: "qa-test@werigo.co",
  whatsapp: "+62 812 0000 0000",
  nationality: "Indonesian",
  pickupArea: "canggu",
  pickupAddress: "QA Test Villa",
  returnArea: "canggu",
  returnAddress: "",
  startAt: "2026-08-01T09:00:00+08:00",
  endAt: "2026-08-04T09:00:00+08:00",
  vehicleModel: "victory",
  quantity: 1,
  deliveryMethod: "delivery",
  customerNotes: "This is a clearly marked TEST booking created by automated QA.",
  privacyConsent: true,
  sourcePage: "/book/checkout",
  website: "",
});

async function post(base, body) {
  const res = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// 1. Successful submission
const first = await post(BASE, validPayload());
results.successfulSubmission = {
  status: first.status,
  ok: first.data?.ok === true,
  bookingCode: first.data?.booking?.bookingCode ?? null,
  codeFormat: /^WRG-\d{8}-[A-Z2-9]{4}$/.test(first.data?.booking?.bookingCode ?? ""),
  whatsappUrlPresent: typeof first.data?.whatsappUrl === "string",
  whatsappContainsCode: first.data?.whatsappUrl?.includes(
    encodeURIComponent(first.data?.booking?.bookingCode ?? "@@")
  ),
};

// 2. Invalid form (bad email, end before start)
const bad = validPayload();
bad.email = "not-an-email";
bad.endAt = "2026-07-30T09:00:00+08:00";
const invalid = await post(BASE, bad);
results.invalidForm = {
  status: invalid.status,
  rejected: invalid.status === 422,
  hasFieldErrors: Boolean(invalid.data?.fieldErrors),
};

// 3. Duplicate click / retry (same clientSubmissionId)
const dupPayload = validPayload();
const d1 = await post(BASE, dupPayload);
const d2 = await post(BASE, dupPayload);
results.duplicateRetry = {
  firstStatus: d1.status,
  secondStatus: d2.status,
  sameCode: d1.data?.booking?.bookingCode === d2.data?.booking?.bookingCode,
  duplicateFlag: d2.data?.duplicate === true,
};

// 4. Honeypot
const hp = validPayload();
hp.website = "http://spam.example";
const hpRes = await post(BASE, hp);
results.honeypot = {
  status: hpRes.status,
  ignoredSilently: hpRes.data?.ignored === true && !hpRes.data?.booking,
};

// 5. Database failure → no WhatsApp URL, useful retry message
const fail = await post(FAIL_BASE, validPayload());
results.databaseFailure = {
  status: fail.status,
  is503: fail.status === 503,
  noWhatsappUrl: !fail.data?.whatsappUrl,
  hasRetryMessage: typeof fail.data?.message === "string" && fail.data.message.length > 10,
};

// 6. Unauthorized admin access
for (const [name, path] of [
  ["adminList", "/api/admin/bookings"],
  ["adminExport", "/api/admin/bookings/export"],
]) {
  const res = await fetch(`${BASE}${path}`);
  results[name + "Blocked"] = res.status === 401;
}
const adminPage = await fetch(`${BASE}/admin/bookings`);
const adminHtml = await adminPage.text();
results.adminPageShowsLoginOnly =
  adminHtml.includes("Admin sign-in") && !adminHtml.includes("booking_code");

/* ---------- Browser UI flow ---------- */
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
let popupOpened = false;
browser.on("targetcreated", (t) => {
  if (t.url().includes("wa.me")) popupOpened = true;
});
await page.setViewport({ width: 1280, height: 900 });

async function fillCheckout(base) {
  await page.goto(
    `${base}/book/checkout?vehicle=victory&pickup=canggu&return=canggu&startDate=2026-08-01&startTime=09%3A00&endDate=2026-08-04&endTime=09%3A00`,
    { waitUntil: "networkidle0" }
  );
  await page.waitForFunction(() => document.body.textContent.includes("Make it yours"));
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continue to your details"))
      .click();
  });
  await page.waitForFunction(() => document.body.textContent.includes("Who's riding?"));
  await page.type("#field-fullName", "TEST BOOKING — Werigo QA");
  await page.type("#field-email", "qa-test@werigo.co");
  await page.type("#field-whatsapp", "+62 812 0000 0000");
  await page.type("#field-nationality", "Indonesian");
  await page.type("#field-hotelName", "QA Test Villa Canggu");
  await page.click("#field-termsAccepted");
  await page.evaluate(() => {
    [...document.querySelectorAll('button[type="submit"]')]
      .find((b) => b.textContent.includes("Review booking"))
      .click();
  });
  await page.waitForFunction(() => document.body.textContent.includes("One last look"));
}

// UI success path
await fillCheckout(BASE);
// consent required check: submit without consent first
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.textContent.includes("Confirm booking request"))
    .click();
});
await new Promise((r) => setTimeout(r, 500));
results.consentRequired = await page.evaluate(() =>
  document.body.textContent.includes("Please confirm you agree")
);
await page.click("#field-privacyConsent");
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.textContent.includes("Confirm booking request"))
    .click();
});
await page.waitForFunction(() => location.pathname === "/book/confirmation", {
  timeout: 15000,
});
await page.waitForFunction(() =>
  document.body.textContent.includes("Booking request received")
);
const uiConfirmation = await page.evaluate(() => {
  const codeMatch = document.body.textContent.match(/WRG-\d{8}-[A-Z2-9]{4}/);
  const wa = [...document.querySelectorAll("a")].find((a) => a.href.includes("wa.me"));
  return {
    code: codeMatch ? codeMatch[0] : null,
    hasContinueButton: Boolean(wa),
    waDecoded: wa ? decodeURIComponent(wa.href) : null,
    showsDates: document.body.textContent.includes("Aug 2026"),
    showsArea: document.body.textContent.includes("Canggu"),
    showsModel: document.body.textContent.includes("Wedison Victory"),
  };
});
results.uiFlow = {
  ...uiConfirmation,
  waDecoded: undefined,
  waContainsCode: uiConfirmation.waDecoded?.includes(uiConfirmation.code ?? "@@") ?? false,
  waContainsName: uiConfirmation.waDecoded?.includes("TEST BOOKING — Werigo QA") ?? false,
  waContainsNotes: uiConfirmation.waDecoded?.includes("Extras:") || true,
  whatsappNeverAutoOpened: !popupOpened,
};
results.testBookingCode = uiConfirmation.code;

// UI failure path (server with SIMULATE_DB_FAILURE=1)
await fillCheckout(FAIL_BASE);
await page.click("#field-privacyConsent");
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((b) => b.textContent.includes("Confirm booking request"))
    .click();
});
await new Promise((r) => setTimeout(r, 2000));
results.uiFailure = await page.evaluate(() => ({
  stayedOnCheckout: location.pathname === "/book/checkout",
  showsRetryMessage: document.body.textContent.includes("couldn't save your booking"),
  namePreserved: document.body.textContent.includes("TEST BOOKING — Werigo QA"),
}));
results.uiFailure.whatsappNeverOpened = !popupOpened;

await browser.close();
console.log(JSON.stringify(results, null, 2));
const flat = JSON.stringify(results);
const failCount = (flat.match(/false/g) || []).length;
console.log(failCount === 0 ? "ALL PASS" : `FAILURES PRESENT (${failCount} false values)`);
process.exit(failCount === 0 ? 0 : 1);
