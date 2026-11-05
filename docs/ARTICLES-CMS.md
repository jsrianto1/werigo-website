# Werigo Articles

## Untuk tim

1. Login di **werigo.co/admin**, lalu pilih **Growth → Articles**. Ada juga pintasan **Articles** di Content Studio.
2. Klik **Create article**. Pilih bahasa artikel (English, Indonesia, atau Russian), isi judul dan gunakan toolbar untuk menulis isi.
3. Lengkapi introduction, cover image dan alt text. Isi SEO title, meta description, focus keyword, author dan sumber referensi yang relevan.
4. **Content health** memperlihatkan checklist dan skor SEO, AEO serta GEO yang dihitung dari draft. Buka masing-masing skor untuk melihat apa yang kurang. Ini pemeriksaan editorial lokal, bukan skor Google atau pengukuran visibilitas AI, dan tidak memverifikasi kebenaran sumber.
5. **Save draft** menyimpan pekerjaan secara privat. Jika artikel sudah pernah dipublish, draft baru tidak mengganti versi live.
6. Isi **Publish date (Bali time)** bila perlu. Kosong berarti terbit saat dipublish. Tanggal yang lalu dipakai sebagai tanggal publikasi asli; tanggal mendatang menjadwalkan artikel. Menjadwalkan ulang artikel yang sudah live akan menyembunyikan halaman lamanya sampai tanggal tersebut.
7. **Review & publish** membuka preview. Periksa, lalu klik **Publish article** atau **Schedule article**. Artikel terbit di **/guides/URL-slug**.
8. **History → Restore as draft** memulihkan versi lama ke draft. **Unpublish article** menyembunyikan halaman publik dan tetap menyimpan artikel beserta riwayatnya.

Slug terkunci setelah publikasi pertama untuk menjaga tautan. Featured article ditampilkan lebih awal di halaman Bali guides. Noindex meminta mesin pencari tidak mengindeks halaman, tetapi halaman yang dipublish tetap bisa diakses publik.

## Technical release notes

- Existing Werigo admin authentication, origin guard and environment are reused.
- Super-admin activation applies transactional migration 0016 with a verified checksum. Tables are separate from homepage/place CMS, customers, bookings and payments.
- Rich text is persisted as a validated document tree. Only supported nodes/marks are rendered; raw HTML is escaped. Links, nesting, text length, media paths and request size are checked server-side.
- Draft and published JSON snapshots are separate. Row locks, expected versions and revision records prevent silent overwrites.
- Publication dates include a timezone. Scheduled pages are gated in database queries, so they do not require cron credentials or env changes.
- Only visible, indexable published snapshots enter the page/image sitemap. Draft saves never change the public article's modified date.
- Covers share the existing media library/upload service. Uploaded draft photos remain admin-only until published.
- Article preview URLs require admin login and are noindex. Public pages include canonical metadata and BlogPosting JSON-LD using the article's actual title, author, language, sources and publication dates.

Validate with `npm run test:articles`, `npm run test:cms`, TypeScript, lint and the production build. A local UI fixture is not proof that storage was activated in production.
