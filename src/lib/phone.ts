/**
 * Forgiving WhatsApp phone-number handling for the booking form.
 *
 * Customers paste numbers in every imaginable shape: full
 * international numbers in either field, local Indonesian numbers
 * starting with 0, numbers with spaces, dots, parentheses or
 * hyphens. This module normalizes all of that into a clean
 * { countryCode, national } pair and never duplicates the country
 * code. Pure module (no imports) so tests run it directly.
 */

/** ITU two-digit country calling codes (all others are 1 or 3 digits). */
const TWO_DIGIT_CODES = new Set([
  "20", "27", "30", "31", "32", "33", "34", "36", "39",
  "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58",
  "60", "61", "62", "63", "64", "65", "66",
  "81", "82", "84", "86",
  "90", "91", "92", "93", "94", "95", "98",
]);

/** Digits only: separators, plus signs and stray characters removed. */
function digitsOf(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Split "+628121311712" style digits into code + national number. */
function splitInternational(digits: string): { code: string; national: string } {
  if (digits.startsWith("1") || digits.startsWith("7")) {
    return { code: digits.slice(0, 1), national: digits.slice(1) };
  }
  if (TWO_DIGIT_CODES.has(digits.slice(0, 2))) {
    return { code: digits.slice(0, 2), national: digits.slice(2) };
  }
  return { code: digits.slice(0, 3), national: digits.slice(3) };
}

export interface NormalizedPhone {
  /** "+62" style dialling code. */
  countryCode: string;
  /** National number, digits only, no leading zero. */
  national: string;
}

/**
 * Normalize whatever landed in the two fields. Handles:
 * - a full international number pasted into either field
 * - "00" international prefix
 * - Indonesian local numbers starting with 0 (assumes +62 when the
 *   country-code field does not already say otherwise)
 * - separators while typing
 * Returns null when there aren't enough digits to work with.
 */
export function normalizePhone(
  countryCodeRaw: string,
  numberRaw: string
): NormalizedPhone | null {
  let cc = digitsOf(countryCodeRaw);
  if (cc.startsWith("00")) cc = cc.slice(2);

  let national = digitsOf(numberRaw);
  let numberIsInternational = numberRaw.trim().startsWith("+");
  if (national.startsWith("00")) {
    national = national.slice(2);
    numberIsInternational = true;
  }

  // Full international number pasted into the NUMBER field.
  if (numberIsInternational) {
    if (cc && cc.length <= 4 && national.startsWith(cc)) {
      // Repeats the code from the other field: never duplicate it.
      national = national.slice(cc.length);
    } else {
      const split = splitInternational(national);
      cc = split.code;
      national = split.national;
    }
  }

  // A full number (with or without +) pasted into the COUNTRY-CODE
  // field: anything longer than 4 digits cannot be a dialling code.
  if (cc.length > 4) {
    const split = splitInternational(cc);
    cc = split.code;
    // Keep a separately typed number if there is one; otherwise the
    // national part of the pasted number moves into the number field.
    if (!national) national = split.national;
  }

  // Indonesian-style local number: drop the trunk 0.
  if (national.startsWith("0")) {
    national = national.replace(/^0+/, "");
    if (!cc) cc = "62";
  }

  if (!cc) cc = "62";
  if (!/^\d{1,4}$/.test(cc)) return null;
  if (!/^\d{6,14}$/.test(national)) return null;
  return { countryCode: `+${cc}`, national };
}

/** Full wa.me-ready digits: country code + national, no plus. */
export function toWhatsAppDigits(p: NormalizedPhone): string {
  return `${p.countryCode.slice(1)}${p.national}`;
}
