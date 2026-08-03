/* Phone normalization tests for the booking form: pasted full
   numbers, local Indonesian 0-numbers, separators, and wa.me digits.
   Runs the real src/lib/phone.ts module under Node type stripping. */
import { normalizePhone, toWhatsAppDigits } from "../src/lib/phone.ts";

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

// Management verification case 1: +62 with local 0-number
check("cc +62 with local 0812131712",
  normalizePhone("+62", "0812131712"),
  { countryCode: "+62", national: "812131712" });

// Case 2: full number pasted into the phone field
check("full +628121311712 in number field",
  normalizePhone("+62", "+628121311712"),
  { countryCode: "+62", national: "8121311712" });
check("full number in number field with empty cc",
  normalizePhone("", "+628121311712"),
  { countryCode: "+62", national: "8121311712" });
check("full number in number field with DIFFERENT cc typed",
  normalizePhone("+61", "+628121311712"),
  { countryCode: "+62", national: "8121311712" });

// Case 3: full number pasted into the country-code field
check("full +628121311712 in country-code field",
  normalizePhone("+628121311712", ""),
  { countryCode: "+62", national: "8121311712" });
check("full number in cc field keeps separately typed number",
  normalizePhone("+618121311712", "0400 000 000"),
  { countryCode: "+61", national: "400000000" });

// Separators and 00 prefix
check("spaces dots hyphens parens tolerated",
  normalizePhone("+61", "(0400) 000-00.0"),
  { countryCode: "+61", national: "400000000" });
check("00 international prefix",
  normalizePhone("+62", "00628121311712"),
  { countryCode: "+62", national: "8121311712" });

// Country-code inference for 1- and 3-digit codes
check("US number split (1-digit code)",
  normalizePhone("", "+12125550123"),
  { countryCode: "+1", national: "2125550123" });
check("UAE number split (3-digit code)",
  normalizePhone("", "+971501234567"),
  { countryCode: "+971", national: "501234567" });

// Defaults and failures
check("bare local number defaults to +62",
  normalizePhone("", "08123456789"),
  { countryCode: "+62", national: "8123456789" });
check("too-short number rejected", normalizePhone("+62", "123"), null);
check("garbage rejected", normalizePhone("abc", "def"), null);

// Never duplicate the country code in wa.me digits
check("wa.me digits", toWhatsAppDigits({ countryCode: "+62", national: "8121311712" }), "628121311712");

console.log(failures === 0 ? "PHONE TESTS PASS" : `PHONE TESTS FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
