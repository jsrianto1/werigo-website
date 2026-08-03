/* Add-on tests: airport fee cases, protection calculations across
   days and quantity, defaults, rounding, and IDR conversion. */
import {
  computeAddOns,
  formatUsdFee,
  usdToIdr,
  AIRPORT_DELIVERY_FEE_USD,
  AIRPORT_COLLECTION_FEE_USD,
} from "../src/lib/addons.ts";
import { isAirportSlug, getPickupPoint, airportPoints } from "../src/data/locations.ts";

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

const base = { days: 3, quantity: 1, cancellationProtection: false, motorcycleProtection: false };

// ---- Airport fee cases ----
check("no airport: zero fee",
  computeAddOns({ ...base, pickupIsAirport: false, returnIsAirport: false }).totalUsd, 0);
check("airport pickup only: US$1 delivery",
  computeAddOns({ ...base, pickupIsAirport: true, returnIsAirport: false }),
  { airportDeliveryUsd: 1, airportCollectionUsd: 0, cancellationProtectionUsd: 0, motorcycleProtectionUsd: 0, totalUsd: 1 });
check("airport return only: US$1 collection",
  computeAddOns({ ...base, pickupIsAirport: false, returnIsAirport: true }).airportCollectionUsd, 1);
check("both airport: US$2 total",
  computeAddOns({ ...base, pickupIsAirport: true, returnIsAirport: true }).totalUsd, 2);
check("fee is per booking, not per motorcycle",
  computeAddOns({ ...base, quantity: 4, pickupIsAirport: true, returnIsAirport: true }).totalUsd, 2);
check("fee is per booking, not per day",
  computeAddOns({ ...base, days: 30, pickupIsAirport: true, returnIsAirport: false }).airportDeliveryUsd, 1);
check("recomputation never accumulates",
  (() => {
    const sel = { ...base, pickupIsAirport: true, returnIsAirport: true };
    computeAddOns(sel);
    computeAddOns(sel);
    return computeAddOns(sel).totalUsd;
  })(), 2);
check("fee constants", [AIRPORT_DELIVERY_FEE_USD, AIRPORT_COLLECTION_FEE_USD], [1, 1]);

// ---- Terminal handling ----
check("domestic terminal is airport", isAirportSlug("airport-domestic"), true);
check("international terminal is airport", isAirportSlug("airport-international"), true);
check("canggu is not airport", isAirportSlug("canggu"), false);
check("two terminals exist", airportPoints.length, 2);
check("terminal names carry the terminal",
  airportPoints.map((a) => a.name),
  ["Ngurah Rai Airport, Domestic Terminal", "Ngurah Rai Airport, International Terminal"]);
check("pickup point resolves airport",
  getPickupPoint("airport-international")?.isAirport, true);
check("pickup point resolves area",
  getPickupPoint("canggu")?.isAirport, false);

// ---- Cancellation Protection: USD 0.50 x days ----
check("cancellation 3 days = US$1.50",
  computeAddOns({ ...base, pickupIsAirport: false, returnIsAirport: false, cancellationProtection: true }).cancellationProtectionUsd, 1.5);
check("cancellation 7 days = US$3.50",
  computeAddOns({ ...base, days: 7, pickupIsAirport: false, returnIsAirport: false, cancellationProtection: true }).cancellationProtectionUsd, 3.5);
check("cancellation is per booking, not per bike",
  computeAddOns({ ...base, quantity: 3, pickupIsAirport: false, returnIsAirport: false, cancellationProtection: true }).cancellationProtectionUsd, 1.5);

// ---- Motorcycle Protection: USD 4.95 x days x quantity ----
check("motorcycle 1 bike 3 days = US$14.85",
  computeAddOns({ ...base, pickupIsAirport: false, returnIsAirport: false, motorcycleProtection: true }).motorcycleProtectionUsd, 14.85);
check("motorcycle 2 bikes 3 days = US$29.70",
  computeAddOns({ ...base, quantity: 2, pickupIsAirport: false, returnIsAirport: false, motorcycleProtection: true }).motorcycleProtectionUsd, 29.7);
check("motorcycle 2 bikes 7 days = US$69.30",
  computeAddOns({ ...base, days: 7, quantity: 2, pickupIsAirport: false, returnIsAirport: false, motorcycleProtection: true }).motorcycleProtectionUsd, 69.3);

// ---- Nothing selected by default ----
check("unselected protections cost zero",
  computeAddOns({ ...base, pickupIsAirport: false, returnIsAirport: false }),
  { airportDeliveryUsd: 0, airportCollectionUsd: 0, cancellationProtectionUsd: 0, motorcycleProtectionUsd: 0, totalUsd: 0 });

// ---- Combined total ----
check("everything: 2 + 1.50 + 14.85 = US$18.35",
  computeAddOns({ days: 3, quantity: 1, pickupIsAirport: true, returnIsAirport: true, cancellationProtection: true, motorcycleProtection: true }).totalUsd, 18.35);

// ---- Formatting + conversion ----
check("two-decimal USD", formatUsdFee(1), "US$1.00");
check("two-decimal USD 14.85", formatUsdFee(14.85), "US$14.85");
check("usdToIdr at 18,035", usdToIdr(2, 18035), 36070);
check("usdToIdr null rate falls back", usdToIdr(2, null), null);

console.log(failures === 0 ? "ADDON TESTS PASS" : `ADDON TESTS FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
