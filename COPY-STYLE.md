# Werigo Copy Style Guide

Permanent writing rules for all customer-facing copy on werigo.co. "Customer-facing"
means anything a visitor can see or hear: page body text, headings, buttons, form
labels, hints and validation messages, page titles and meta descriptions, Open Graph
text, image alt text, aria-labels, structured data names, and WhatsApp message
templates. Code comments, internal admin screens, and technical identifiers are not
customer-facing.

These rules are enforced automatically by `scripts/copy-style-check.mjs`, which
renders every public route and fails the build if rule 1 is violated in visible text.

## The rules

1. **No em dashes or en dashes, ever.** Customer-facing copy must never contain
   U+2014 (—) or U+2013 (–). This includes titles, metadata, alt text, aria-labels,
   error messages, and button labels. Normal hyphens in ordinary compound words are
   fine (pick-up, in-house, real-world).

2. **Rewrite the sentence, don't swap punctuation.** When a dash has to go, restructure
   the sentence so it reads naturally: split it into two sentences, use a comma, a
   colon, or the word that was implied. Never leave a sentence that reads like a dash
   was mechanically deleted.

3. **Numerical ranges use "to".** Write "30% to 90%", "08:00 to 20:00 WITA",
   "1 to 3 days". Never a dash between numbers.

4. **Write like a person on the team.** The Werigo voice is a human, warm, clear,
   professional local Bali rental team. Direct, natural, specific sentences. Say what
   we actually do ("We deliver it to your hotel or villa, fully charged") rather than
   abstractions.

5. **Avoid generic AI-marketing patterns.** Do not use: "Whether you're X or Y",
   "From X to Y, we've got you covered", "seamless", "effortless", "hassle-free",
   "unlock", "elevate", "game-changer", "look no further", rhetorical triples
   ("No X, no Y, no Z"), or chains of dash-separated clauses. If a sentence could
   appear on any rental website in the world, rewrite it until it could only be ours.

6. **Facts are sacred.** Never alter verified specifications, approved SuperCharge
   claims and disclaimers, the brand relationship ("Werigo, Powered by Wedison"),
   the four customer-facing rental models, or legal meaning in Terms and Privacy.
   Copy edits change wording and rhythm, never claims. When a fact is not confirmed,
   say so plainly ("Confirmed at booking", "Rental rate available upon request").

7. **Never invent.** No fake reviews, ratings, statistics, guarantees, locations, or
   operational promises. If we cannot verify it, it does not go on the site.
