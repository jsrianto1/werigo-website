/* Automated pricing tests: tier boundaries, calendar-month logic,
   minimum rental, and estimated totals for the approved IDR rates.
   Runs the real src/lib/pricing.ts module under Node type stripping. */
import {
  MIN_RENTAL_DAYS,
  MIN_RENTAL_MESSAGE,
  rentalDays,
  isValidPeriod,
  resolveTier,
  estimateRental,
  minRiderAge,
  usdDisplay,
  ratesIdrPerDay,
} from "../src/lib/pricing.ts";

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

/** Build a period of exactly n days starting 2026-08-01 09:00. */
function periodOfDays(n, start = "2026-08-01") {
  const s = new Date(`${start}T09:00:00`);
  const e = new Date(s.getTime() + n * 24 * 60 * 60 * 1000);
  const pad = (x) => String(x).padStart(2, "0");
  return {
    startDate: start,
    startTime: "09:00",
    endDate: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`,
    endTime: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
  };
}
/** Calendar period from explicit dates, 09:00 both ends. */
function span(startDate, endDate) {
  return { startDate, startTime: "09:00", endDate, endTime: "09:00" };
}

// ---- Day counting ----
check("7-day span counts 7 days", rentalDays(periodOfDays(7)), 7);
check("25 hours rounds up to 2 days", rentalDays({ startDate: "2026-08-01", startTime: "09:00", endDate: "2026-08-02", endTime: "10:00" }), 2);

// ---- Minimum rental ----
check("1 day is invalid", isValidPeriod(periodOfDays(1)), false);
check("1 day resolves no tier", resolveTier(periodOfDays(1)), null);
check("1 day has no estimate", estimateRental("bees", periodOfDays(1)), null);
check("minimum message text", MIN_RENTAL_MESSAGE, "Minimum rental is 2 days.");
check("MIN_RENTAL_DAYS", MIN_RENTAL_DAYS, 2);
check("2 days is valid", isValidPeriod(periodOfDays(2)), true);

// ---- Tier boundaries (label per duration) ----
const tierAt = (n) => resolveTier(periodOfDays(n))?.label ?? null;
check("2 days -> Daily", tierAt(2), "Daily");
check("6 days -> Daily", tierAt(6), "Daily");
check("7 days -> Weekly", tierAt(7), "Weekly");
check("13 days -> Weekly", tierAt(13), "Weekly");
check("14 days -> 2 Weeks", tierAt(14), "2 Weeks");
check("20 days -> 2 Weeks", tierAt(20), "2 Weeks");
check("21 days -> 3 Weeks", tierAt(21), "3 Weeks");

// ---- Calendar-month boundary (August has 31 days) ----
check("30 days from Aug 1 (Aug 31) is still 3 Weeks", resolveTier(span("2026-08-01", "2026-08-31"))?.label, "3 Weeks");
check("Aug 1 to Sep 1 is Monthly (exactly one calendar month)", resolveTier(span("2026-08-01", "2026-09-01"))?.label, "Monthly");
check("Aug 1 to Sep 15 is Monthly (longer)", resolveTier(span("2026-08-01", "2026-09-15"))?.label, "Monthly");
// February: Feb 1 + 1 month = Mar 1 (28-day month must still need a full calendar month)
check("Feb 1 to Feb 28 is 3 Weeks, not Monthly", resolveTier(span("2027-02-01", "2027-02-28"))?.label, "3 Weeks");
check("Feb 1 to Mar 1 is Monthly", resolveTier(span("2027-02-01", "2027-03-01"))?.label, "Monthly");
// Jan 31 + 1 month clamps to Feb 28
check("Jan 31 to Feb 28 is Monthly (clamped month end)", resolveTier(span("2027-01-31", "2027-02-28"))?.label, "Monthly");

// ---- Estimated totals: rate x actual days ----
check("Bees 2 days total", estimateRental("bees", periodOfDays(2)).totalIdr, 140000);
check("Bees 6 days total", estimateRental("bees", periodOfDays(6)).totalIdr, 420000);
check("Victory 7 days total", estimateRental("victory", periodOfDays(7)).totalIdr, 560000);
check("Athena 14 days total", estimateRental("athena", periodOfDays(14)).totalIdr, 1190000);
check("EdPower 21 days total", estimateRental("edpower", periodOfDays(21)).totalIdr, 1995000);
const monthly = estimateRental("victory", span("2026-08-01", "2026-09-01"));
check("Victory monthly rate", monthly.ratePerDayIdr, 46667);
check("Victory monthly total = rate x 31 days", monthly.totalIdr, 46667 * 31);

// ---- Approved rate table integrity ----
check("Bees daily rate", ratesIdrPerDay.bees.daily, 70000);
check("EdPower monthly rate", ratesIdrPerDay.edpower.monthly, 73333);
check("exactly four models priced", Object.keys(ratesIdrPerDay).sort(), ["athena", "bees", "edpower", "victory"]);

// ---- Age + USD policy ----
check("EdPower minimum age is 25", minRiderAge.edpower, 25);
check("no other model has an age restriction", Object.keys(minRiderAge), ["edpower"]);
check("USD hidden until a documented rate exists", usdDisplay.idrPerUsd, null);

console.log(failures === 0 ? "PRICING TESTS PASS" : `PRICING TESTS FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
