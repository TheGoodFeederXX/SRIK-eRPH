# Status pembetulan audit (27 Okt 2026)

Rujukan: `Audit-Keselamatan-Kefungsian-SRIK-eRPH-2026-10-27.md`.

| ID | Dapatan | Status | Pembetulan |
|---|---|---|---|
| F-01 | Dua `AuthContext` | **Selesai** | Satu konteks: `src/context/AuthContext.tsx`; `src/hooks/useAuth.ts` hanya re-export |
| S-01 | Guru boleh tulis DSKP | **Selesai** | RLS `referensi_rph` baca ahli aktif sahaja; tulis hanya melalui `admin_upsert_dskp` / `admin_delete_dskp` yang menyemak `is_active_admin()` |
| A-01 | Supabase + SQLite bercanggah | **Selesai** | Supabase/SQLite dibuang; Neon Postgres + Neon Auth melalui API `/api/*`. SQL lama di `legacy/supabase/` |
| D-01 | `tahun` tiada dalam skema | **Selesai** | `rph_records.tahun integer not null check (between 1 and 6)` |
| D-02 | `TRUNCATE` dalam seed | **Selesai** | `server/db/seed-dskp.ts` guna `on conflict do nothing`; SQL lama diarkib |
| S-02 | Pendaftaran terbuka | **Selesai** | Akaun baru `status = 'pending'`; semua route data memerlukan status `active`; tab `Pengguna` untuk kelulusan |
| F-02 | Borang DSKP tiada SP/SPI | **Selesai** | Editor `bidang`, `sp[]`, `spi[{tp,desc}]`, validasi sekurang-kurangnya satu SP |
| S-03 | Draf localStorage dikongsi | **Selesai** | Kunci `erph_form_draft:<user id>`; tiada token dalam localStorage |
| O-01 | `tsx` dalam devDependencies | **Selesai** | `pnpm build` = typecheck + bundle; API di Vercel melalui `api/index.ts`; `pnpm start` untuk Node |
| D-03 | Skrip cleanup merosakkan data | **Selesai** | Skrip cleanup dibuang; kunci unik `(subjek, tahun, coalesce(bidang,''), sk)` menghalang pendua |
| F-03 | Ralat senyap | **Selesai** | `useRecords` menyimpan `error`, komponen memaparkan `role="alert"`, delete/update `throw` |
| F-04 | Status draf/diterbitkan palsu | **Selesai** | Lajur `status` + checkbox terbit dalam langkah Semakan |
| S-04 | Profil terlalu luas | **Selesai** | `app_user` hanya boleh `update (name, email, updated_at)` baris sendiri; `role`/`status` tidak boleh disentuh |
| S-05 | Kata laluan semasa tidak disahkan | **Selesai** | `POST /api/auth/change-password` → Neon Auth `change-password`; sesi dibatalkan selepas tukar |
| S-06 | `xlsx@0.18.5` advisori | **Selesai** | Diganti dengan `exceljs` |
| S-07 | `pdfmake` advisori SSRF (server) | **Diminimumkan** | PDF masih dijana dalam pelayar sahaja; tiada laluan server. Naik taraf bila versi tampal keluar |
| F-05 | Carian string mentah | **Selesai** | Carian melalui parameter SQL (`ilike` + escape `% _ \`), had 120 aksara |
| F-06 | Tarikh UTC | **Selesai** | `todayMalaysia()` (`Asia/Kuala_Lumpur`) + ujian |
| F-07 | Pilihan merentas halaman | **Selesai** | Pilihan direset bila `page`/`searchTerm` berubah; nombor halaman 1-based |
| F-08 | Semua DSKP dimuat di klien | **Selesai** | `GET /api/dskp` dengan pagination/carian server + `GET /api/dskp/meta` |
| O-02 | Fail DB tidak di-ignore | **Selesai** | `.gitignore`: `data/`, `*.sqlite*`, `*.db`, `*.dump`, `.vercel` |
| O-03 | Tiada CI/ujian | **Separa** | Ujian `server/routes/api.test.ts`, `server/db/rls.test.ts`, `src/lib/dateUtils.test.ts`. CI/E2E belum |
| O-04 | README template | **Selesai** | README baharu |
| O-05 | Tiada polisi backup | **Dokumen** | `docs/DEPLOY-NEON-VERCEL.md` (rollback, restore, audit) |

## Belum selesai (perlu tindakan pemilik)

1. ~~Trusted origins Neon Auth~~ — **selesai**: `https://srik-erph.vercel.app` disahkan
   dalam `neon_auth.project_config.trusted_origins`; daftar/log masuk produksi diuji (200).
2. **`pdfmake` 0.3.5** — semak versi baharu yang menampal GHSA-wp52-r2fp-4vmr.
3. **CI (GitHub Actions)** dan ujian E2E Playwright untuk aliran login → rekod → PDF.
4. **Migrasi data legasi** — jika ada data Supabase/SQLite sebenar, eksport dan import
   mengikut Bahagian 1A.5 laporan; ID pengguna mesti dipetakan sebelum RPH diimport.

---

# Audit UI/UX (28 Okt 2026)

Rujukan: `Audit-UIUX-SRIK-eRPH-2026-10-28.md`.

| ID | Dapatan | Status | Pembetulan |
|---|---|---|---|
| K-01 | 109 kelas Tailwind tidak ditakrif | **Selesai** | `src/index.css` ditulis semula: komponen (`btn-primary`, `btn-outline`, `input-group`, `modal-panel`, `badge-*`, `toast-*`, `bottom-nav`) + utiliti yang benar-benar digunakan. `@keyframes spin` ditambah |
| K-02 | Fokus & kontras kawalan | **Selesai** | `:focus-visible` global 3 px; `--border-control: #64748b`; `aria-invalid` bergaya; sempadan kad `--border-subtle` |
| K-03 | SP/SPI/Masa tidak boleh guna papan kekunci | **Selesai** | Diganti dengan `<fieldset>`/`<legend>` + `<input type="checkbox">` natif |
| T-01 | Selector `input` merosakkan checkbox | **Selesai** | `input:not([type=checkbox]):not([type=radio])`; checkbox 1.25 rem, `accent-color` |
| T-02 | Modal tanpa semantik/Esc/perangkap fokus | **Selesai** | Satu `<Modal>` berasaskan `<dialog>` (`src/components/Modal.tsx` + `ConfirmDialog`), digunakan oleh DSKP, padam, admin, PDF |
| T-03 | Butang ikon tanpa nama | **Selesai** | `aria-label` berkonteks (“Padam rekod 2026-10-27 3A Sains”), label teks pada butang Edit/Padam/Cetak |
| T-04 | Header/tab/stepper melimpah pada mobil | **Selesai** | Header flex-wrap; tab bar boleh skrol; navigasi bawah (bottom nav) pada <768 px; padding kad 1 rem |
| T-05 | Tiada routing | **Selesai** | Hash router (`#/rekod`, `#/rekod-baru`, `#/edit/:id`, `#/dskp`, `#/tetapan`, `#/pengguna`) + ujian |
| T-06 | Bundle 2.39 MB | **Selesai** | `React.lazy` untuk DSKP/Admin/Settings; `exceljs` & `pdfmake` diimport semasa butang ditekan. Bundle utama **377 kB (118 kB gzip)** |
| T-07 | `alert()`/`confirm()`, tiada maklum balas | **Selesai** | Toast `role="status"` + dialog pengesahan; “Rekod berjaya disimpan.” selepas simpan |
| T-08 | Langkah Semakan tidak lengkap | **Selesai** | SPI, Aktiviti, Refleksi dipaparkan; butang “Ubah …” setiap seksyen |
| T-09 | Validasi generik | **Selesai** | Ralat sebaris per medan, `aria-invalid`/`aria-describedby`, fokus ke medan pertama tidak sah, teks bantu (“Pilih tahun dahulu”) |
| T-10 | `<html lang="en">` | **Selesai** | `lang="ms"` |
| T-11 | framer-motion abaikan reduced-motion | **Selesai** | `<MotionConfig reducedMotion="user">` dalam `main.tsx` |
| S-01 | Label tidak berkait | **Selesai** | `htmlFor`/`id` pada Tetapan, modal DSKP, carian |
| S-02 | Tab bukan navigasi | **Selesai** | `<nav aria-label="Navigasi utama">` + `aria-current="page"` (desktop & bottom nav) |
| S-03 | Skrin menunggu kelulusan pasif | **Selesai** | Butang “Semak status” + “Log Keluar” |
| S-04 | Panel Pengguna tanpa pengesahan | **Selesai** | Dialog pengesahan, akaun sendiri dikunci, `pending` diisih dahulu + lencana kiraan, kad pada mobil |
| S-05 | Log masuk/Daftar | **Selesai** | Togol papar kata laluan, “Lupa kata laluan?” (`/api/auth/forgot-password`), ikon kejayaan `CheckCircle2`, hint 8 aksara awal, `autoComplete="name"` |
| S-06 | Draf senyap | **Selesai** | Sepanduk “Draf dipulihkan” + butang “Mula baru” |
| S-07 | Token tidak konsisten | **Selesai (sebahagian)** | Token semantik (`--danger`, `--success`, `--border-subtle`, `--border-control`, `--text-muted`), kelas menggantikan gaya inline dalam komponen yang ditulis semula |
| S-08 | Fon Google tidak digunakan | **Selesai** | `@fontsource/plus-jakarta-sans` (400/600/700), `.font-jawi` hanya pada teks Jawi, `@import` Google dibuang |
| S-09 | Glassmorphism pada setiap kad | **Selesai** | Permukaan pepejal + bayang ringan; tiada `backdrop-filter` |
| S-10 | Aliran PDF 3 lapis | **Selesai (sebahagian)** | Label butang jelas: “Muat Turun Halaman Ini — N Rekod (Excel)” vs “Muat Turun N Rekod (PDF)”; modal PDF dikekalkan untuk pratonton |
| S-11 | Paginasi merender semua nombor | **Selesai** | Tetingkap nombor + “Halaman X / Y” + `aria-current="page"` + label butang |
| S-12 | Status tiada dalam jadual | **Selesai** | Lajur/lencana Status dalam jadual dan kad |
| S-13 | Edit/Padam ikon 16 px bersebelahan | **Selesai** | Butang teks + ikon, sasaran 44 px |
| S-14 | Teks 12 px | **Selesai** | `text-xs` = 0.8125 rem; label guna `--text-muted` |
| R-01 | Tiada mod gelap | **Ditangguh** | Token semantik sudah sedia untuk mod gelap |
| R-02 | `<title>` statik / tiada h1 pada login | **Selesai** | `document.title` ikut laluan; `h1` pada login |
| R-03 | Skrin loading/ralat tanpa semantik | **Selesai** | `<PageLoading>` (`role="status"`) dan `<PageError>` (`role="alert"`, butang cuba lagi) |
| R-04 | Tiada PWA/manifest | **Ditangguh** | Cadangan produk; draf masih `localStorage` per pengguna |
| R-05 | Placeholder kosong tidak konsisten | **Selesai** | Satu konvensyen `—` dalam susun atur cetak |

**Belum disahkan secara dinamik:** tiada ujian pelayar/Lighthouse/axe/NVDA dijalankan dalam persekitaran ini.
Semak senarai pengesahan dalam laporan UI/UX (360 px, 1280 px, wizard dengan papan kekunci, zum 200 %).
