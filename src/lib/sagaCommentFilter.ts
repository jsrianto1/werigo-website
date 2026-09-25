/**
 * Plain-text clean-up and content checks for WERIGO SAGA comments.
 * Comments are always rendered as plain React text (never as HTML), so
 * this is about keeping them tidy and on-topic, not about escaping.
 */

/** Strips tags and control characters, trims, and caps blank lines. */
export function cleanText(input: string, singleLine: boolean): string {
  let s = input.normalize("NFC");
  s = s.replace(/<[^>]*>/g, " "); // no HTML, ever
  s = s.replace(/[<>]/g, ""); // stray angle brackets
  s = s.replace(/\r\n?/g, "\n");
  // Tabs become spaces; other control and invisible formatting characters
  // are dropped, except newlines and the joiner inside emoji sequences.
  s = s.replace(/[\p{Cc}\p{Cf}]/gu, (c) => {
    const code = c.codePointAt(0);
    if (code === 10 || code === 0x200d) return c;
    return code === 9 ? " " : "";
  });
  if (singleLine) s = s.replace(/\s+/g, " ");
  else {
    s = s.replace(/[^\S\n]+/g, " ");
    s = s.replace(/ *\n */g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
  }
  return s.trim();
}

const TLDS =
  "com|net|org|io|co|id|ly|xyz|info|biz|app|dev|site|online|shop|store|link|click|gg|tv|ru|cn|top|live|club|vip|asia|uk|au";

const LINK_PATTERNS: RegExp[] = [
  /\bhttps?\s*:\s*\/\//i,
  /\bwww\s*\./i,
  // No spaces around the dot, so "the end. In the morning" is fine.
  new RegExp(`\\b[a-z0-9-]{2,}\\.(?:${TLDS})\\b`, "i"),
  /\b[a-z0-9-]+\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*com\b/i,
  /\b(?:bit\.ly|t\.me|wa\.me|linktr\.ee)\b/i,
];

export function hasLink(s: string): boolean {
  return LINK_PATTERNS.some((re) => re.test(s));
}

// Folds common tricks (l33t digits, repeated letters) before matching.
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/(.)\1+/g, "$1");
}

/*
 * Kept deliberately small. ROOTS match anywhere inside a word ("fucking"),
 * WORDS only as a whole word. Everyday words that are also swears in
 * some contexts are left out on purpose: "anjing" (dog, and riders do
 * get chased by them), "babi" (babi guling), "tai" (tai chi).
 */
const ROOTS = [
  "fuck", "shit", "bitch", "cunt", "motherfuck", "asshole", "nigger", "nigga", "faggot", "whore",
  "kontol", "ngentot", "memek", "jancok", "jancuk", "bangsat", "bajingan", "pepek", "keparat", "kampret",
].map(fold);

const WORDS = [
  "dick", "dickhead", "slut", "bastard", "wanker", "retard", "porn", "fck", "fuk", "stfu",
  "anjg", "njing", "goblok", "tolol", "lonte", "pelacur", "perek", "brengsek", "bego", "asu", "jembut", "titit",
].map(fold);

export function hasProfanity(s: string): boolean {
  const tokens = fold(s).split(/[^a-z]+/).filter(Boolean);
  if (tokens.some((t) => WORDS.includes(t) || ROOTS.some((r) => t.includes(r)))) return true;
  // Spelled-out letters such as "f u c k" or "k.o.n.t.o.l".
  let run = "";
  for (const t of [...tokens, "  "]) {
    if (t.length === 1) {
      run += t;
      continue;
    }
    if (run.length >= 3 && (WORDS.includes(run) || ROOTS.some((r) => run.includes(r)))) return true;
    run = "";
  }
  return false;
}
