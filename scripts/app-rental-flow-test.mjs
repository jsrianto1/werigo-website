import assert from "node:assert/strict";
import { rentalPlanError, appCheckoutUrl, defaultAppDates } from "../src/lib/appRental.ts";
import { isValidPeriod } from "../src/lib/pricing.ts";
import { readAppPickup, PICKUP_MAX_AGE } from "../src/lib/appPickup.ts";

const now = Date.parse("2026-11-15T12:00:00Z");
const period = { startDate: "2026-11-16", startTime: "09:00", endDate: "2026-11-19", endTime: "09:00" };
const base = { validDates: isValidPeriod(period), hasArea: true, delivery: false, confirmedPin: false, savedPin: false, availability: "ready", remaining: 1 };
assert.equal(rentalPlanError(base), null, "Showroom pickup must not request GPS or a delivery quote");
assert.match(rentalPlanError({ ...base, validDates: isValidPeriod({ ...period, endDate: period.startDate }) }), /at least 2 days/);
assert.match(rentalPlanError({ ...base, hasArea: false }), /confirm your delivery/);
assert.match(rentalPlanError({ ...base, availability: "loading" }), /Checking availability/);
assert.match(rentalPlanError({ ...base, availability: "error" }), /could not be confirmed/);
assert.match(rentalPlanError({ ...base, remaining: 0 }), /fully booked/);
assert.equal(rentalPlanError({ ...base, remaining: undefined }), null, "Legacy fleet-disabled mode still defers to server booking validation");

const pin = { version: 1, area: "kuta", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bali", savedAt: now, point: { latitude: -8.7059, longitude: 115.1757 }, route: { distanceMeters: 14000, token: "test-route-token", expiresAt: now + 60000 } };
const read = value => readAppPickup({ getItem: () => JSON.stringify(value) }, "kuta", now);
const delivery = { ...base, delivery: true, confirmedPin: true, savedPin: Boolean(read(pin)) };
assert.equal(rentalPlanError(delivery), null, "A fresh, confirmed delivery quote allows checkout");
assert.match(rentalPlanError({ ...delivery, confirmedPin: false }), /confirm your delivery/);
assert.match(rentalPlanError({ ...delivery, savedPin: false }), /confirm your delivery/);
assert.match(rentalPlanError({ ...delivery, savedPin: Boolean(read({ ...pin, route: { ...pin.route, expiresAt: now - 1 } })) }), /confirm your delivery/, "Expired routing quotes cannot be reused by the shorter flow");
assert.match(rentalPlanError({ ...delivery, savedPin: Boolean(read({ ...pin, savedAt: now - PICKUP_MAX_AGE - 1 })) }), /confirm your delivery/);
assert.equal(readAppPickup({ getItem: () => JSON.stringify(pin) }, "ubud", now), null, "A saved location cannot be used for another delivery area");
assert.match(rentalPlanError({ ...delivery, remaining: 0 }), /fully booked/, "Delivery does not bypass stock checks");

const query = { ...period, vehicle: "edpower", pickup: "kuta", ref: "PARTNER-TEST" };
const url = new URL(appCheckoutUrl(query), "https://werigo.co");
assert.equal(url.pathname, "/app/rent/checkout");
for (const [key, value] of Object.entries(query)) assert.equal(url.searchParams.get(key), value);
assert.equal(url.searchParams.get("return"), "kuta");
assert.ok(!url.searchParams.has("latitude") && !url.searchParams.has("longitude"), "Precise delivery coordinates must stay out of navigation URLs");
assert.deepEqual(defaultAppDates(new Date(now)), { today: "2026-11-15", startDate: "2026-11-16", endDate: "2026-11-19", startTime: "09:00", endTime: "09:00" });
console.log("PWA rental flow: pickup/delivery, required dates, stock, expired pins, referral and navigation checks passed.");
