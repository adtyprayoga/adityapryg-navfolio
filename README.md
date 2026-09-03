# adityapryg-navfolio

Personal site of **Aditya Prayoga** — notes, projects, and links, in one place.

<p>
  <a href="./README.md">English</a>
  ·
  <a href="./README.id.md">Bahasa Indonesia</a>
</p>

Built with [Astro](https://astro.build) on the
[navfolio](https://github.com/dodolalorc/astro-navfolio) theme. Static output,
no runtime backend, deployed as a container.

## Stack

|           |                                         |
| --------- | --------------------------------------- |
| Framework | Astro 7, static output                  |
| Styling   | Tailwind CSS 4                          |
| Content   | Markdown / MDX content collections      |
| Search    | Pagefind (built from the static output) |
| Serving   | nginx in a multi-stage Docker image     |

## Requirements

- **Node.js 22.12+**
- **[bun](https://bun.sh)** — the package manager for this project. `bun.lock`
  is the lockfile of record and the one Dependabot maintains.
- **Python 3 + fontTools** — only if you run the font subsetting step.

## Getting started

```bash
bun install
bun run dev
```

The site is then on <http://localhost:4321>.

## Content

Content lives in `src/content/`. Each collection is a directory of Markdown or
MDX files with typed frontmatter — the schemas are in `src/content.config.ts`,
and the build fails on anything that does not match.

| Path                    | What it holds                                                       |
| ----------------------- | ------------------------------------------------------------------- |
| `src/content/about.mdx` | The About page. **Required** — the build fails without it.          |
| `src/content/blog/`     | Posts. Needs `title`, `description`, `date`.                        |
| `src/content/projects/` | Project entries. `index.mdx` is the page intro and is **required**. |
| `src/content/vibe/`     | Short fragments. Only `date` is required.                           |
| `src/content/media/`    | Books, films, music. Needs `title`, `creator`, `type`.              |

A minimal post:

```yaml
---
title: 'Post title'
description: 'One line, used for previews and meta tags.'
date: 2026-09-03
tags: ['astro']
categories: ['Notes']
draft: false
---
```

## Configuration

Everything user-facing is in **`src/config/site.toml`** — profile, navigation,
homepage blocks, social links, theme palette, and page copy. It is validated
against a schema, so a typo fails the build rather than silently rendering.

### Language

The site ships English (default) and Indonesian:

```toml
[config.theme]
lang = "en" # en (default), id, zh-CN, zh-TW
```

This is a **single-language switch**, not per-locale routing — there are no
`/en/` and `/id/` URLs and no on-page language toggle. It sets the interface
language for the whole site.

UI strings live in `src/i18n/<locale>.json`. The Indonesian catalog (`id.json`)
was added to this fork; `@navfolio/core` only knows the three locales it ships
with, so `src/utils/ui-text.ts` resolves `id` locally before falling back to the
upstream alias table.

### Social links

In `[[config.home.links]]`, an **empty `tooltip` hides the entry**. LinkedIn and
X are present but blank — fill in the URLs to make them appear.

## Building

```bash
npx astro build
npx pagefind --site dist --output-subdir pagefind --root-selector main --exclude-selectors "[data-pagefind-ignore]"
```

Pagefind is a separate step: it indexes the _built_ HTML, so search is empty
until it runs. `npm run build` chains both plus the font step.

## Deployment

A multi-stage `Dockerfile` builds the site and serves it from nginx. Only the
built output reaches the final image.

```bash
SITE_URL=https://your-domain.com docker compose up -d --build
```

Local development in a container:

```bash
docker compose --profile dev up dev
```

### Coolify

| Setting           | Value      |
| ----------------- | ---------- |
| Build Pack        | Dockerfile |
| Ports Exposes     | `80`       |
| Health Check Path | `/health`  |

Set `SITE_URL` and `SKIP_FONT_SUBSET` as **build** variables. `SITE_URL` is
written into canonical tags, the sitemap, and RSS during the build — as a
runtime variable it arrives too late and the site ships with the placeholder
URL from `site.toml`.

### Build arguments

| Argument           | Default   | Purpose                                         |
| ------------------ | --------- | ----------------------------------------------- |
| `SITE_URL`         | _(empty)_ | Public URL. Falls back to `config.site.url`.    |
| `SITE_BASE`        | `/`       | Sub-path, when not served from the domain root. |
| `SKIP_FONT_SUBSET` | `0`       | `1` skips CJK font subsetting.                  |

`SKIP_FONT_SUBSET=1` is the sensible default here: the step needs bun and Python
fontTools and only matters for Chinese content.

## Notes

- **Use one lockfile.** `bun.lock` is it. An npm lockfile alongside it goes
  stale the moment Dependabot opens a PR, and `npm ci` then fails the build on
  a package.json/lockfile mismatch.
- **`site.url` cannot be empty** — the schema rejects it. It stays an explicit
  placeholder until a domain is set, with the real value passed via `SITE_URL`.
- **typescript is held on 6.x** even though 7 is out: typescript-eslint does
  not support TS 7. `@typescript/native` aliases the 7.x compiler separately,
  so a Dependabot PR moving the `typescript` entry to 7 will break `bun lint`.

## Credits

Theme: [astro-navfolio](https://github.com/dodolalorc/astro-navfolio) by
dodolalorc, MIT licensed. See [LICENSE](./LICENSE) — the upstream copyright
notice is retained.

Site content © Aditya Prayoga.
