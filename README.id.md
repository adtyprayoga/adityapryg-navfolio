# adityapryg-navfolio

Situs pribadi **Aditya Prayoga** — catatan, proyek, dan tautan dalam satu tempat.

<p>
  <a href="./README.md">English</a>
  ·
  <a href="./README.id.md">Bahasa Indonesia</a>
</p>

Dibangun dengan [Astro](https://astro.build) di atas tema
[navfolio](https://github.com/dodolalorc/astro-navfolio). Keluaran statis, tanpa
backend, dijalankan sebagai kontainer.

## Teknologi

|           |                                          |
| --------- | ---------------------------------------- |
| Framework | Astro 7, keluaran statis                 |
| Styling   | Tailwind CSS 4                           |
| Konten    | Koleksi konten Markdown / MDX            |
| Pencarian | Pagefind (diindeks dari keluaran statis) |
| Penyajian | nginx dalam image Docker multi-stage     |

## Kebutuhan

- **Node.js 22.12+**
- **[bun](https://bun.sh)** — hanya untuk skrip subset font dan pembuat konten.
  Selebihnya berjalan dengan npm.
- **Python 3 + fontTools** — hanya bila menjalankan langkah subset font.

## Menjalankan secara lokal

```bash
npm install
npx astro dev
```

Situs tersedia di <http://localhost:4321>.

> `npm run build` diawali `bun run fonts:ui` dan gagal tanpa bun. Gunakan
> `npx astro build` untuk build biasa, atau lihat [Build](#build) untuk urutan
> lengkap beserta indeks pencarian.

## Konten

Konten berada di `src/content/`. Setiap koleksi berisi berkas Markdown atau MDX
dengan frontmatter bertipe — skemanya ada di `src/content.config.ts`, dan build
akan gagal bila ada yang tidak sesuai.

| Lokasi                  | Isi                                                               |
| ----------------------- | ----------------------------------------------------------------- |
| `src/content/about.mdx` | Halaman About. **Wajib** — build gagal tanpanya.                  |
| `src/content/blog/`     | Tulisan. Butuh `title`, `description`, `date`.                    |
| `src/content/projects/` | Entri proyek. `index.mdx` adalah pengantar halaman dan **wajib**. |
| `src/content/vibe/`     | Catatan pendek. Hanya `date` yang wajib.                          |
| `src/content/media/`    | Buku, film, musik. Butuh `title`, `creator`, `type`.              |

Contoh tulisan paling sederhana:

```yaml
---
title: 'Judul tulisan'
description: 'Satu baris, dipakai untuk pratinjau dan meta tag.'
date: 2026-09-03
tags: ['astro']
categories: ['Notes']
draft: false
---
```

## Konfigurasi

Semua yang tampil ke pengunjung diatur di **`src/config/site.toml`** — profil,
navigasi, blok beranda, tautan sosial, palet warna, dan teks halaman. Berkas ini
divalidasi terhadap skema, jadi salah ketik akan menggagalkan build, bukan
diam-diam ikut ter-render.

### Bahasa

Situs ini menyediakan bahasa Inggris (bawaan) dan Indonesia:

```toml
[config.theme]
lang = "en" # en (bawaan), id, zh-CN, zh-TW
```

Ini **satu sakelar bahasa** untuk seluruh situs, bukan routing per-locale —
tidak ada URL `/en/` dan `/id/`, dan tidak ada tombol ganti bahasa di halaman.

Teks antarmuka ada di `src/i18n/<locale>.json`. Katalog Indonesia (`id.json`)
ditambahkan di fork ini; `@navfolio/core` hanya mengenali tiga locale bawaannya,
sehingga `src/utils/ui-text.ts` menangani `id` lebih dulu sebelum jatuh ke tabel
alias upstream.

### Tautan sosial

Pada `[[config.home.links]]`, **`tooltip` kosong menyembunyikan entri**.
LinkedIn dan X sudah ada tetapi kosong — isi URL-nya agar muncul.

## Build

```bash
npx astro build
npx pagefind --site dist --output-subdir pagefind --root-selector main --exclude-selectors "[data-pagefind-ignore]"
```

Pagefind adalah langkah terpisah: ia mengindeks HTML yang **sudah dibangun**,
jadi pencarian kosong sampai langkah ini dijalankan.

## Deployment

`Dockerfile` multi-stage membangun situs lalu menyajikannya lewat nginx. Hanya
hasil build yang masuk ke image akhir.

```bash
SITE_URL=https://domain-anda.com docker compose up -d --build
```

Pengembangan di dalam kontainer:

```bash
docker compose --profile dev up dev
```

### Coolify

| Pengaturan        | Nilai      |
| ----------------- | ---------- |
| Build Pack        | Dockerfile |
| Ports Exposes     | `80`       |
| Health Check Path | `/health`  |

Set `SITE_URL` dan `SKIP_FONT_SUBSET` sebagai variabel **build**. `SITE_URL`
ditulis ke canonical tag, sitemap, dan RSS saat build — sebagai variabel runtime
ia datang terlambat dan situs akan memakai URL placeholder dari `site.toml`.

### Argumen build

| Argumen            | Bawaan     | Kegunaan                                         |
| ------------------ | ---------- | ------------------------------------------------ |
| `SITE_URL`         | _(kosong)_ | URL publik. Jatuh ke `config.site.url`.          |
| `SITE_BASE`        | `/`        | Sub-path, bila tidak disajikan dari akar domain. |
| `SKIP_FONT_SUBSET` | `0`        | `1` melewati subset font CJK.                    |

`SKIP_FONT_SUBSET=1` adalah pilihan wajar di sini: langkah tersebut butuh bun
dan Python fontTools, dan hanya relevan untuk konten berbahasa Mandarin.

## Catatan

- **Lockfile mengunci paket `@navfolio/*` ke URL `git+ssh://`**, yang tidak bisa
  diautentikasi di dalam kontainer. Dockerfile menulis ulang ke HTTPS anonim
  lewat `git config insteadOf`; SHA commit-nya tidak berubah.
- **`site.url` tidak boleh kosong** — skema menolaknya. Nilainya tetap
  placeholder sampai ada domain, dan nilai sebenarnya dikirim lewat `SITE_URL`.
- **Hook pre-commit menjalankan `bunx lint-staged`** dan gagal tanpa bun.
  Padanannya: `npx eslint .` dan `npx prettier --check --ignore-unknown .`.

## Kredit

Tema: [astro-navfolio](https://github.com/dodolalorc/astro-navfolio) oleh
dodolalorc, berlisensi MIT. Lihat [LICENSE](./LICENSE) — pemberitahuan hak cipta
upstream tetap dipertahankan.

Konten situs © Aditya Prayoga.
