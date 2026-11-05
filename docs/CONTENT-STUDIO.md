# Werigo Content Studio

First release: editorial website content and PWA recommendations.

## Untuk tim marketing

1. Login dengan akun admin Werigo, lalu buka **Growth → Content Studio**.
2. Pilih **Website content** atau **Recommended places**.
3. Website: edit Hero, Sections, Booking guide, FAQ, atau SEO. English wajib; Indonesia/Russian yang kosong memakai English.
4. Tempat: pilih kategori, tambah/edit tempat, isi deskripsi, alamat pencarian Google Maps, website resmi, foto, alt text, serta kredit foto bila diperlukan.
5. **Include when published** mengatur apakah tempat dimasukkan dalam versi publik berikutnya. Earlier/Later mengubah urutan dalam kategori.
6. Tekan **Save draft**. Konten publik belum berubah. Draft tersimpan dapat dilihat melalui **Review & publish → Open full-page draft preview**.
7. Periksa tampilan dan informasi, lalu **Publish changes**. Ini menerbitkan seluruh dokumen: seluruh konten website, atau seluruh koleksi rekomendasi, sesuai tab yang dipilih.
8. **History → Restore as draft** mengembalikan versi lama ke draft saja. Review dan publish terpisah untuk menerbitkannya.

Gunakan foto milik sendiri atau yang diizinkan pemiliknya. Unggahan JPG/PNG/WebP/AVIF maksimal 5 MB dan 20 megapiksel; sistem mengubahnya ke WebP maksimal 2000 px dan membuang metadata.

Jika muncul konflik versi, simpan teks yang belum tersimpan di tempat lain, lalu muat versi terbaru. CMS menjaga perubahan admin lain agar tidak tertimpa.

## Activation and release

- Existing Werigo admin sessions are required; temporary-password accounts must set their own password first.
- Deploy the reviewed code first. A super admin then selects **Activate CMS** once, creating migration 0015 in the existing PostgreSQL database.
- Activation is transactional and recorded in the migration ledger and audit log. Alternatively, the existing migration CLI can apply the identical checked-in migration.
- No environment changes, additional credentials or new storage service are required. Uploads are stored in the existing database and survive code deployments.
- Until storage is activated and a document is published, the existing approved seed content remains live.
- Authenticated draft previews are dynamic and noindex. They are never included in the public sitemap. Draft uploads return 404 to anonymous visitors.
- Publishing invalidates the content cache and affected pages. The homepage sitemap lastmod uses the most recent actual CMS publication, never a draft-save date.
- Published media URLs remain public and immutable after first publication, including after a later recommendation is hidden. Hiding content is not a media privacy-revocation action.
- Back up the CMS tables along with the existing database. Keep revision history when upgrading.

The CMS does not edit rental prices, availability, delivery calculations, booking/payment transactions, customer records, hero video, SAGA or existing environment variables.

## Validation

`npm run test:cms` runs actual CMS rules, route guards, upload decoding and SQL against an isolated PGlite database. It never loads production environment files.

Local UI fixtures and screenshots under the workspace output folder are development evidence, not production activation evidence.
