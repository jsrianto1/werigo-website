# Area Media Sources

Provenance for every delivery-area photograph. All images stored
locally (`public/media/areas/<slug>/hero.webp`), never hotlinked.
Only Unsplash-License and free Wikimedia Commons images are used.
Downloaded 2026-07-26. Optimized WebP, downscale-only (max 2000px
wide; Ubud additionally wide-cropped for hero composition with the
terraces preserved).

| Area | Local file | Source page | Photographer | Verified location | Licence |
|---|---|---|---|---|---|
| Canggu | `areas/canggu/hero.webp` | https://unsplash.com/photos/man-holding-surfing-board-during-sunset-fOc_9zcDaP0 | Hc Digital | Page location: "Canggu Beach, Canggu, Badung Regency, Bali, Indonesia" | Unsplash License |
| Seminyak | `areas/seminyak/hero.webp` | https://unsplash.com/photos/sea-waves-crashing-on-shore-during-sunset-P4faKaUdlRs | Stefano Magini | Management-designated source (page tagged "Bali indonesia"; no explicit geo-tag on page) | Unsplash License |
| Kuta | `areas/kuta/hero.webp` | https://commons.wikimedia.org/wiki/File:Kuta_Beach,_Bali,_20220825_1706_0864.jpg | Jakub Hałun | File title + category "Kuta Beach" (Bali) | CC BY-SA 4.0 |
| Ubud | `areas/ubud/hero.webp` | https://unsplash.com/photos/green-rice-field-in-a-hill-during-daytime-a10GIv3UBq4 | Alana Harris | Page location: "Kedisan, Tegallalang, Kabupaten Gianyar, Bali" (Tegallalang terraces) | Unsplash License |
| Uluwatu | `areas/uluwatu/hero.webp` | https://unsplash.com/photos/a-view-of-the-ocean-from-the-top-of-a-cliff-LWrh00hDyX0 | Ferdy Tjiptoraharjo | Page location: "Uluwatu Beach, Pecatu, Badung Regency, Bali" | Unsplash License |
| Jimbaran | `areas/jimbaran/hero.webp` | https://commons.wikimedia.org/wiki/File:Jimbaran_Bay_sunset_(7188342461).jpg | Simon_sees (Australia) | File description: "Jimbaran Bay sunset" | CC BY 2.0 |
| Sanur | `areas/sanur/hero.webp` | https://commons.wikimedia.org/wiki/File:Morning_in_Sanur_Beach,_Bali.jpg | Danangtrihartanto | File title/description: "Morning in Sanur Beach, Bali" | CC BY-SA 4.0 |
| Denpasar | `areas/denpasar/hero.webp` | https://commons.wikimedia.org/wiki/File:Siluet_Monumen_Bajra_Sandhi,_Denpasar,_Bali,_2018.jpg | Wikimedia Commons contributor (see source page) | File title: Bajra Sandhi Monument, Denpasar | CC BY-SA 4.0 |

Notes:
- Nusa Dua was listed in the creative direction but has no route in
  the project — no image sourced.
- CC BY / CC BY-SA images carry an on-image credit chip in the hero
  component; ShareAlike applies to derivatives of those photos.
- Attribution is also rendered via the `credit` field in
  `src/data/areaMedia.ts`.

## Coverage section imagery (added 2026-07-29)

Used by the homepage delivery-coverage section
(`src/data/coverage.ts`, files in `public/media/coverage/`).

| Card | Local file | Source page | Photographer | Verified location | Licence | Downloaded |
|---|---|---|---|---|---|---|
| Ngurah Rai Airport | `coverage/ngurah-rai-airport.webp` | https://unsplash.com/photos/a-couple-of-gates-that-are-next-to-a-runway-NooiiPQWlWA | Harfian Ananta Daffa | Page location: "I Gusti Ngurah Rai Bali International Airport, Badung, Indonesia"; candi bentar gateway framing the tarmac and aircraft | Unsplash License | 2026-08-19 |
| Hotel delivery | `coverage/bali-hotel.webp` | https://unsplash.com/photos/coconut-palms-and-swimming-pool-facing-ocean-bUvmhwQ-gsw | Ern Gan | Page location: "Seminyak Beach, Bali, Indonesia" (Potato Head Beach Club, per photographer description) | Unsplash License | 2026-07-29 |
| Villa delivery | `coverage/bali-villa.webp` | https://unsplash.com/photos/a-large-pool-with-a-lounge-chair-next-to-it-qawgWgMATzQ | Nerissa J | Page location: "Ubud, Gianyar Regency, Bali, Indonesia"; description "Balinese private villa and pool" | Unsplash License | 2026-07-29 |

All three were downloaded locally, converted to WebP, and are served
with `next/image`. No hotlinking. A Lombok villa candidate
(FRMKzS3t4u8) was rejected during sourcing because its verified
location is not Bali.

The Ngurah Rai Airport photo was replaced on 2026-08-19 (management
feedback: the original Pinterpandai gate photo was cluttered by a
dead tree branch and construction netting in the foreground). The
new Unsplash photo is a cleaner, verified shot of the same candi
bentar gateway.
