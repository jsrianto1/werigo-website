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
