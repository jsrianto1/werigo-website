/* Customer database capture test.

   Runs against the production build with LEAD_STORE=memory, which
   exercises the real API route, validation, normalization, reference
   codes, idempotency and admin gating without Supabase credentials.
   A second server with SIMULATE_DB_FAILURE=1 covers the failure path,
   and an optional third with LEAD_CAPTURE=off covers the kill switch.

     npm run build
     LEAD_STORE=memory ALLOW_MEMORY_STORE=1 npx next start -p 3001
     LEAD_STORE=memory ALLOW_MEMORY_STORE=1 SIMULATE_DB_FAILURE=1 npx next start -p 3002
     LEAD_CAPTURE=off npx next start -p 3003          # optional
     node scripts/lead-capture-test.mjs
*/

const BASE = process.env.TEST_BASE ?? "http://localhost:3001";
const FAIL_BASE = process.env.FAIL_BASE ?? "http://localhost:3002";
const OFF_BASE = process.env.OFF_BASE ?? "";
const results = {};

const REF_RE = /^WRG-L-\d{8}-[A-Z2-9]{4}$/;

const bookingLead = (over = {}) => ({
  formType: "booking_request",
  clientSubmissionId: crypto.randomUUID(),
  firstName: "QA",
  lastName: "Tester",
  countryCode: "+62",
  whatsapp: "812 0000 0000",
  email: "qa-test@werigo.co",
  hotelName: "QA Test Villa Canggu",
  address: "Jalan QA 1",
  flightNumber: "QA123",
  specialRequest: "Clearly marked TEST submission from automated QA.",
  vehicleModel: "victory",
  quantity: 2,
  pickupArea: "canggu",
  returnArea: "canggu",
  startDate: "2026-09-01",
  startTime: "09:00",
  endDate: "2026-09-04",
  endTime: "09:00",
  promoCode: "QA10",
  extras: [{ id: "rain-poncho", quantity: 2 }],
  termsAccepted: true,
  batteryAck: true,
  ageConfirmed: true,
  privacyConsent: true,
  sourcePage: "/book/checkout",
  referrer: "https://example.test/",
  locale: "en-GB",
  utmSource: "qa",
  website: "",
  ...over,
});

const contactLead = (over = {}) => ({
  formType: "contact_message",
  clientSubmissionId: crypto.randomUUID(),
  fullName: "QA Tester",
  email: "qa-test@werigo.co",
  message: "Clearly marked TEST contact message from automated QA.",
  privacyConsent: true,
  sourcePage: "/contact",
  website: "",
  ...over,
});

async function post(base, body) {
  const res = await fetch(`${base}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

/* 1. Booking request is stored */
const booking = await post(BASE, bookingLead());
results.bookingStored = {
  status: booking.status,
  created: booking.status === 201,
  ok: booking.data?.ok === true,
  stored: booking.data?.stored === true,
  referenceFormat: REF_RE.test(booking.data?.reference ?? ""),
};

/* 2. Contact message is stored */
const contact = await post(BASE, contactLead());
results.contactStored = {
  status: contact.status,
  created: contact.status === 201,
  stored: contact.data?.stored === true,
  referenceFormat: REF_RE.test(contact.data?.reference ?? ""),
};

/* 3. Retry with the same submission id stores one record, not two */
const replayPayload = bookingLead();
const r1 = await post(BASE, replayPayload);
const r2 = await post(BASE, replayPayload);
results.idempotentReplay = {
  firstStatus: r1.status,
  secondStatus: r2.status,
  duplicateFlagged: r2.data?.duplicate === true,
  sameReference: r1.data?.reference === r2.data?.reference,
};

/* 4. A local number written with a trunk zero still normalizes */
const trunkZero = await post(
  BASE,
  bookingLead({ whatsapp: "0812 3333 4444", email: "" })
);
results.trunkZeroNumberAccepted = {
  status: trunkZero.status,
  stored: trunkZero.data?.stored === true,
};

/* 5. Invalid input is rejected with field errors */
const invalid = await post(
  BASE,
  bookingLead({ pickupArea: "not-a-real-area", quantity: 99 })
);
results.invalidRejected = {
  status: invalid.status,
  rejected: invalid.status === 422,
  hasFieldErrors: Boolean(invalid.data?.fieldErrors),
  nothingStored: invalid.data?.stored !== true,
};

/* 6. A contact message without an email is rejected */
const noContact = await post(BASE, contactLead({ email: "" }));
results.uncontactableRejected = {
  status: noContact.status,
  rejected: noContact.status === 422,
};

/* 7. Honeypot: answered normally, stored silently as nothing */
const honeypot = await post(BASE, bookingLead({ website: "http://spam.example" }));
results.honeypot = {
  status: honeypot.status,
  looksNormal: honeypot.data?.ok === true,
  nothingStored: honeypot.data?.stored === false,
  flagged: honeypot.data?.ignored === true,
};

/* 8. Missing consent is refused */
const noConsent = await post(BASE, contactLead({ privacyConsent: false }));
results.consentRequired = {
  status: noConsent.status,
  rejected: noConsent.status === 422,
};

/* 9. Storage failure is reported, never silently swallowed */
const failure = await post(FAIL_BASE, bookingLead());
results.storageFailure = {
  status: failure.status,
  is503: failure.status === 503,
  notStored: failure.data?.stored === false,
};

/* 10. Admin surfaces are closed without a session */
for (const [name, path] of [
  ["adminCustomers", "/api/admin/customers"],
  ["adminSubmissions", "/api/admin/submissions"],
  ["adminExport", "/api/admin/customers/export"],
  ["adminExportSubmissions", "/api/admin/customers/export?entity=submissions"],
]) {
  const res = await fetch(`${BASE}${path}`);
  results[name + "Blocked"] = res.status === 401;
}
const patch = await fetch(`${BASE}/api/admin/customers/${crypto.randomUUID()}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "blocked" }),
});
results.adminPatchBlocked = patch.status === 401;

const adminPage = await fetch(`${BASE}/admin/customers`);
const adminHtml = await adminPage.text();
results.adminPageShowsLoginOnly =
  adminHtml.includes("Admin sign-in") && !adminHtml.includes("qa-test@werigo.co");

/* 11. Optional: the LEAD_CAPTURE=off kill switch */
if (OFF_BASE) {
  const off = await post(OFF_BASE, contactLead());
  results.captureSwitchedOff = {
    ok: off.data?.ok === true,
    nothingStored: off.data?.stored === false,
    reason: off.data?.reason === "disabled",
  };
}

/* 12. Rate limiting (runs last: it spends this IP's window) */
let limited = false;
for (let i = 0; i < 14; i++) {
  const res = await post(BASE, contactLead());
  if (res.status === 429) {
    limited = true;
    break;
  }
}
results.rateLimited = limited;

console.log(JSON.stringify(results, null, 2));
const failCount = (JSON.stringify(results).match(/false/g) || []).length;
console.log(failCount === 0 ? "ALL PASS" : `FAILURES PRESENT (${failCount} false values)`);
process.exit(failCount === 0 ? 0 : 1);
