# Project Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when delegation is authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the project archive into a warm editorial library with category shelves, an illustrated hand that takes and opens a book, and a chapter reader containing project stories.

**Architecture:** Preserve Astro's static project pages and bilingual MDX content as the source of truth. Enhance ordinary project links with a native dialog reader; fetch chapter markup from the existing detail pages. Use CSS book surfaces, an SVG hand, and the Web Animations API for the opening and page turns.

**Tech Stack:** Existing Astro, TypeScript, MDX, CSS, SVG, and Bun. No new runtime dependencies, canvas renderer, or 3D framework.

**Spec:** This document's [Design specification](#design-specification) and [Flagship manuscript](#flagship-manuscript) are the accompanying specification. Read both before executing tasks.

**Status:** Implemented locally on `codex/project-library`. See the implementation record below. Deployment remains outside this plan.

## Global constraints

- Preserve `/projects/`, all project detail URLs, locale prefixes, and existing SEO metadata.
- Support English and Indonesian with matching project membership and chapter meaning.
- Keep all 18 published projects; exclude draft entries and the index entry from books.
- Preserve the rest of the site's design and current light/dark themes.
- Keep technologies as project metadata; use type of work for shelves.
- Preserve normal links, keyboard operation, reduced motion, and readable content without JavaScript.
- Include no sound effects, employee data, invented outcomes, or implementation of the proposed rewards system.
- Do not install an animation framework or generate realistic hand imagery.
- Scope this work to implementation and local verification; deployment is outside this plan.
- Read applicable repository instructions before execution; do not overwrite unrelated changes.
- The user requested `docs/plan`; this overrides Superpowers' default plan directory.

## Design specification

### Shelves and covers

Rename visible Projects labels to **Project Library** / **Perpustakaan Proyek**, including the archive header, top navigation, and home navigation card. Keep route identifiers unchanged. Introduce the library with “Projects from work, personal practice, and experiments. Pick a book to read its story.” / “Proyek dari pekerjaan, karya pribadi, dan eksperimen. Pilih buku untuk membaca ceritanya.”

Use front-facing covers with cloth-like CSS texture, subtle spines, page edges, restrained shadows, and shallow shelf ledges. Covers have a title and year; put a short description beneath each cover. Keep the current site fonts and paper color tokens. Use a fixed sequence of muted green, blue, rust, and plum accents selected by project ID so covers remain stable across builds and languages. Ensure text contrast in both themes.

Render these shelves in order, omitting empty shelves:

| Stable key     | English                | Indonesian                | Initial membership                                               |
| -------------- | ---------------------- | ------------------------- | ---------------------------------------------------------------- |
| `professional` | Professional Work      | Proyek Profesional        | All 15 currently `work`-tagged projects, plus Weekly Journal Bot |
| `personal`     | Personal Projects      | Proyek Pribadi            | `navfolio-site`                                                  |
| `learning`     | Learning & Experiments | Pembelajaran & Eksperimen | `bukubook`                                                       |

Membership becomes explicit project frontmatter, not runtime tag inference. Sort each shelf with existing `sortBlogPostsForArchive` semantics: sticky priority, descending date, then ID. Reuse that function rather than introducing a competing date order.

Use CSS grid with a ledge per book cell; adjacent cells visually form a rack, including wrapped rows. Use three columns at wide widths, two below 900px, and one below 380px. Avoid horizontal scrolling. Reserve cover dimensions to prevent layout jumps. Hover and focus lift a book slightly, but all information and activation remain available on touch.

### Opening sequence

An ordinary primary click on a book opens an overlay. Modified clicks and new-tab actions keep their native behavior. A decorative SVG hand and sleeve reaches from the lower edge toward the selected book, grips its outer edge, lifts it off the rack, carries it to the reader, and opens the front cover. The hand withdraws as prose appears.

Sequence budget: reach 300ms, grip/lift 250ms, carry 450ms, cover opening/withdrawal 400ms, totaling approximately 1.4 seconds. Use foreground finger and rear palm layers around the book, with a sleeve in neutral ink and paper tones. Animate the selected book, not a generic book unrelated to the clicked position. Hide the original cover visually while its inert clone moves, preserving its layout space.

Keep the animation overlay in the dialog's top layer. Measure the book before opening the dialog, then position a fixed clone at that rectangle. Scale and translate toward a measured reader-cover target. Use perspective and `rotateY` for the hinged cover; no animation of layout width/height. Skip opening motion for reduced-motion users and shared links.

Show a localized Skip animation control throughout the sequence. Skipping finishes the visual sequence; it does not pretend that pending content has loaded. If loading takes longer, show a localized loading state in the reader. Escape or close cancels loading and animations. On resize during opening, finish at the responsive reader position rather than continuing with stale coordinates. Closing from reading uses a 300ms cover-close/return transition; use immediate close for reduced motion or invalid source geometry.

### Reader and chapter contract

Desktop shows an open two-page spread: project context and current chapter title on the left, chapter prose on the right. Below 760px, use a single page combining context, chapter heading, and prose. This is chapter pagination, not automatic physical-page pagination. Long prose scrolls within the reading area; keep controls reachable and never truncate text.

Show project title, date, existing tags/authors/links, chapter selector, Previous, Next, Close, and “Chapter 1 of 6” status. A short 280ms page turn runs when chapters change. Disable previous/next at the ends and while a turn is in progress. Change chapters through buttons and the selector; optional Left/Right keyboard shortcuts apply only when focus is on the reader surface, never while editing/selecting or using links. Do not require dragging or swiping.

Each explicit chapter is semantic server-rendered markup:

```astro
---
interface Props {
  id: string;
  title: string;
}
const { id, title } = Astro.props;
---

<section data-book-chapter data-chapter-id={id} data-chapter-title={title}>
  <h2 id={id}>{title}</h2>
  <div data-chapter-body><slot /></div>
</section>
```

In project-detail, wrap rendered MDX in `[data-book-content]` with `data-project-id` and `data-project-title`. Place metadata in `[data-book-meta]` outside that content wrapper. Projects with `bookChapters: false` wrap their existing body in a single localized Overview chapter. Explicit chapter projects render directly without the Overview wrapper. All chapters remain visible on standalone pages, including with JavaScript disabled.

The controller fetches only the same-origin detail URL already present on the matching book link. Parse the response with `DOMParser`, verify matching project ID and at least one chapter, and import the marked prose/metadata into the reader. Never inject the fetched page's scripts or full layout. Existing v1 project content is static prose and links; interactive MDX hydration is outside this reader contract. Keep ordinary detail pages functional for future richer content. Prefix imported element IDs and matching local fragment references to avoid duplicate IDs with the library document. Mount only the active chapter.

### URLs, state, failure, and access

An open reader uses `/projects/?book=<project-id>` with the current locale base. Derive paths from the configured projects route and `BASE_URL`, not hardcoded English paths. Allow only book IDs present in the current rendered library; do not turn query strings into arbitrary fetch paths. Preserve unrelated query parameters and hashes.

On a shelf click, push one history entry. Close that entry with Back, and let Forward reopen it. A directly loaded reader URL has no locally pushed entry: closing removes `book` with `replaceState`, without navigating the visitor away. `popstate` updates the dialog without pushing again. Unknown book IDs leave the library usable, show “This book is unavailable” / “Buku ini tidak tersedia,” and remove the invalid `book` parameter. Share URLs open chapter one; chapter selections do not create history entries.

Use a native modal dialog for focus containment and background inertness. Lock background scrolling while open, restore its previous style/position when closing, and restore focus to the selected book. For direct links, use the matching book as the return focus target. Restore animation-hidden cover visibility in every cancellation path. Announce loading, failure, and chapter changes with a polite live region. The decorative hand and motion clone are `aria-hidden` and contain no active links. Use at least 44px touch controls and visible focus styling.

Runtime phases: `closed`, `loading`, `opening`, `reading`, `turning`, `closing`, `error`. Keep load readiness and animation readiness separate: enter `reading` only when both are ready. Associate every open with a generation counter and `AbortController`; late responses from a canceled open cannot replace current content. Cache successful parsed content per localized detail URL. Errors offer Retry and Open project page. Retry uses the existing dialog/history entry and skips the hand sequence. Initialization must be idempotent, with teardown on Astro navigation if applicable.

## Repository grounding and file map

Inspected on 2026-10-05: the archive is `src/modules/routes/projects-index.astro`; detail pages use `src/modules/routes/project-detail.astro` and `BlogArticle`. Project frontmatter extends the shared article schema in `src/content.config.ts`. The two content trees contain matching project IDs. Bun tests exist under `src/utils`; the local Bun declaration currently exposes `toEqual`. There is no existing browser-test suite in the inspected file list.

Create these focused files:

| Path                                               | Responsibility                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/project-library/model.ts`          | Shelf grouping and validated reader URL helpers                  |
| `src/components/project-library/model.test.ts`     | Membership, sorting, drafts, and URL cases                       |
| `src/components/project-library/BookCover.astro`   | Accessible ordinary link and stable CSS cover                    |
| `src/components/project-library/BookChapter.astro` | Semantic MDX chapter wrapper                                     |
| `src/components/project-library/BookReader.astro`  | Native dialog, status and controls, animation staging area       |
| `src/components/project-library/BookHand.astro`    | Decorative layered SVG palm, fingers, sleeve                     |
| `src/components/project-library/reader.ts`         | Loading, DOM extraction, history, focus and reader orchestration |
| `src/components/project-library/motion.ts`         | Cancelable take/open/turn/return animations                      |
| `src/components/project-library/session.ts`        | Pure request-generation and readiness state                      |
| `src/components/project-library/session.test.ts`   | Cancellation, stale response, and readiness tests                |
| `src/components/project-library/library.css`       | Scoped shelf, cover, reader, responsive and motion styles        |

Modify the two existing routes, project-only schema, `src/i18n/en.json`, `src/i18n/id.json`, both site TOML files, both project index MDX files, and project frontmatter in both trees. Expand only the two Weekly Journal Bot bodies. Add an overlay slot to `BlogArticle` so the reader does not inherit article typography.

## Task 1: Metadata and deterministic shelves

**Files:** `src/content.config.ts`, `src/components/project-library/model.ts`, `model.test.ts`, both `src/content/projects/*.mdx` and `src/content-id/projects/*.mdx`.

**Interfaces:** Export `Shelf = 'professional' | 'personal' | 'learning'`, `shelfOrder`, and `groupBooks<T extends BookEntry>(entries: T[]): { id: Shelf; books: T[] }[]`. `BookEntry` contains `id` and `data: { date: Date; shelf?: Shelf; draft?: boolean; sticky?: boolean | number }`.

- [ ] Add behavioral tests before implementation:

```ts
import { expect, test } from 'bun:test';
import { groupBooks } from './model';

test('excludes draft/index entries and preserves shelf and archive order', () => {
  const entry = (id: string, date: string, data: Record<string, unknown> = {}) => ({
    id,
    data: { date: new Date(date), ...data },
  });
  const groups = groupBooks([
    entry('index', '2026-10-01'),
    entry('hidden', '2026-10-01', { draft: true }),
    entry('older', '2025-01-01'),
    entry('newer', '2026-01-01'),
    entry('pinned', '2024-01-01', { sticky: true }),
  ]);
  expect(groups.map((g) => [g.id, g.books.map((b) => b.id)])).toEqual([
    ['personal', ['pinned', 'newer', 'older']],
  ]);
});
```

- [ ] Run `bun test src/components/project-library/model.test.ts`; expect missing-module/export failure initially.
- [ ] Add project-only schema fields `shelf: z.enum(['professional', 'personal', 'learning']).default('personal')` and `bookChapters: z.boolean().default(false)`. Do not add these to other article collections.
- [ ] Implement grouping by filtering `index` and drafts, sorting once with `sortBlogPostsForArchive`, then filtering into ordered shelves and dropping empty ones.
- [ ] Populate explicit shelf frontmatter in both languages using the membership table. Set `bookChapters: true` only for Weekly Journal Bot.
- [ ] Extend tests to include all three shelf keys, equal-date ID ordering, and input immutability; run the test file and verify pass.
- [ ] Review and checkpoint this task's intended files with commit message `feat: define project library shelves` when commits are authorized for execution.

## Task 2: Chapters and the flagship story

**Files:** `BookChapter.astro`, project-detail route, both Weekly Journal Bot MDX files, `library.css`.

**Interfaces:** `BookChapter` accepts `{ id: string; title: string }` and a prose slot. Detail markup exposes `[data-book-content]`, `[data-book-meta]`, and the chapter attributes defined above. Existing `Content` remains Astro's rendered MDX.

- [ ] Create the semantic chapter component from the specification. Add the content/metadata wrappers to project-detail and a localized Overview wrapper for unchaptered projects.
- [ ] Import `BookChapter` in both flagship MDX files from `../../components/project-library/BookChapter.astro`. Render six components with the exact shared IDs below; put Markdown prose inside their slots with blank lines around Markdown blocks.
- [ ] Use the bilingual manuscript below, preserving existing frontmatter date, title, tags, description, and icon. Do not add a repository or demo URL that is not already supplied.
- [ ] Style standalone chapter pages using scoped paper surfaces and readable prose widths. Keep all chapter headings in the generated page and avoid hiding content for animation before JavaScript loads.
- [ ] Run `bun run build`. Verify six matching chapter IDs in each built flagship detail page, one Overview in an ordinary project, and that full prose remains present in built HTML.
- [ ] Read both manuscript versions against the interview: rewards remain hypothetical, duplicate reporting remains unresolved, and improvements remain observations.
- [ ] Checkpoint with `feat: add bilingual project book chapters` when authorized.

## Task 3: Shelf presentation and localization

**Files:** projects-index route, `BookCover.astro`, `library.css`, both i18n JSON files, both site TOML files, both project index MDX files.

**Interfaces:** `BookCover` accepts `{ id: string; title: string; description: string; year: number; href: string; shelf: Shelf }`. Render a root anchor marked `data-book-link`, `data-book-id={id}`, and a child `[data-book-cover]` for motion measurement. The archive consumes `groupBooks(projectEntries)`.

- [ ] Replace the grid with labeled shelf sections and covers. Preserve the existing configured-route/base-path construction. Use a real `<a href={href}>` for each book and no nested interactive elements.
- [ ] Implement the responsive rules and stable covers from the design. Use selectors under `.project-library` and `.book-reader`; do not restyle generic `section`, `h2`, or `a` site-wide.
- [ ] Add the `library` translation namespace through the existing `getI18n(siteConfig).t(...)` path. Provide these labels:

| Key            | English                        | Indonesian                   |
| -------------- | ------------------------------ | ---------------------------- |
| `professional` | Professional Work              | Proyek Profesional           |
| `personal`     | Personal Projects              | Proyek Pribadi               |
| `learning`     | Learning & Experiments         | Pembelajaran & Eksperimen    |
| `overview`     | Overview                       | Ringkasan                    |
| `close`        | Close book                     | Tutup buku                   |
| `skip`         | Skip animation                 | Lewati animasi               |
| `previous`     | Previous chapter               | Bab sebelumnya               |
| `next`         | Next chapter                   | Bab berikutnya               |
| `chapters`     | Chapters                       | Daftar bab                   |
| `loading`      | Opening book…                  | Membuka buku…                |
| `error`        | This book could not be opened. | Buku ini tidak dapat dibuka. |
| `unavailable`  | This book is unavailable.      | Buku ini tidak tersedia.     |
| `retry`        | Try again                      | Coba lagi                    |
| `openPage`     | Open project page              | Buka halaman proyek          |
| `progress`     | Chapter {current} of {total}   | Bab {current} dari {total}   |

- [ ] Update visible navigation and page copy in both TOML files and index entries. Leave module keys, route paths, home Recently entries, and unrelated metadata unchanged.
- [ ] Build and inspect `/projects/` and `/id/projects/` with JavaScript disabled: 16 professional, one personal, one learning book, all clickable, no hidden books.
- [ ] Inspect 360px, 768px, and 1440px widths in both themes. Check long project titles and focus rings; cover shadows must not obscure titles or controls.
- [ ] Checkpoint with `feat: render project library shelves` when authorized.

## Task 4: Reader loading, navigation, and accessibility

**Files:** `BookReader.astro`, `reader.ts`, `session.ts`, `session.test.ts`, `model.ts`, `model.test.ts`, archive route, `library.css`.

**Interfaces:** Export `readBookId(url: URL, allowedIds: ReadonlySet<string>): string | null` and `withBookId(url: URL, id: string | null): URL` from model. Export `createSession()` from session, returning `begin(): number`, `accept(token: number): boolean`, `markLoaded(token: number): void`, `markOpened(token: number): void`, `canRead(token: number): boolean`, and `cancel(): void`. Readiness resets on each begin/cancel.

- [ ] Add failing tests for URL preservation and request races:

```ts
import { expect, test } from 'bun:test';
import { readBookId, withBookId } from './model';

test('reader URLs preserve locale and unrelated URL parts', () => {
  const source = new URL('https://example.test/id/projects/?ref=home#shelves');
  const opened = withBookId(source, 'weekly-journal-bot');
  expect(opened.pathname).toEqual('/id/projects/');
  expect(opened.searchParams.get('ref')).toEqual('home');
  expect(opened.hash).toEqual('#shelves');
  expect(withBookId(opened, null).href).toEqual(source.href);
  expect(readBookId(opened, new Set(['bukubook']))).toEqual(null);
});
```

```ts
import { expect, test } from 'bun:test';
import { createSession } from './session';

test('stale content and unfinished opening cannot enter reading', () => {
  const session = createSession();
  const first = session.begin();
  session.cancel();
  const second = session.begin();
  session.markLoaded(first);
  session.markOpened(first);
  expect(session.accept(first)).toEqual(false);
  expect(session.canRead(second)).toEqual(false);
  session.markLoaded(second);
  expect(session.canRead(second)).toEqual(false);
  session.markOpened(second);
  expect(session.canRead(second)).toEqual(true);
});
```

- [ ] Run both test files and confirm initial missing-export failures. Implement the URL helpers using `new URL(url.href)` and `searchParams.set/delete`; validate IDs by allowlist. Implement session using a monotonic token plus two readiness booleans. Run tests again.
- [ ] Add the dialog shell with localized controls and a polite status region. Open with `showModal()`, focus Close initially, and focus the active chapter heading after loading. Keep Skip keyboard accessible during opening.
- [ ] Implement fetch, DOM parsing, chapter extraction and successful-result caching exactly as specified. Use `AbortController`; verify `response.ok` and expected content markers. Render localized error state with Retry and the ordinary detail link for network/parse failures.
- [ ] Implement ordinary-click interception only for unmodified primary clicks on rendered book links. Track current source link, previous scroll/body styles, current chapter, and whether this dialog pushed its own history entry. Wire initial query, `popstate`, Escape, close, and focus restoration.
- [ ] Initially mark the opening complete immediately so the reader works without motion. Mount only the active chapter, update chapter status and disabled controls, and reset inner scroll when changing chapter.
- [ ] Verify manual cases: initial shared URL, close without leaving the site, shelf-click then Back then Forward, invalid query ID, retry without extra history, close during slow fetch, and modified-click new tab.
- [ ] Checkpoint with `feat: add accessible project book reader` when authorized.

## Task 5: Hand choreography and page turns

**Files:** `BookHand.astro`, `motion.ts`, `BookReader.astro`, `reader.ts`, `library.css`.

**Interfaces:** Motion exports `MotionHandle = { finished: Promise<void>; finish(): void; cancel(): void }`. Export `openBook(stage: HTMLElement, source: DOMRect, target: DOMRect): MotionHandle`, `turnPage(page: HTMLElement, direction: 1 | -1): MotionHandle`, and `closeBook(stage: HTMLElement, target: DOMRect): MotionHandle`. Reader owns stage construction and the cover clone. Handles resolve after finish or cancellation; internal `Animation.finished` rejections are caught.

- [ ] Create an original inline SVG hand with separate palm/sleeve and foreground finger groups. Use paths with rounded fingers and consistent line weight; position the foreground group over the book's outer edge so the grip is visible. No external image request is needed.
- [ ] Build an inert, accessibility-hidden clone of `[data-book-cover]` with duplicate IDs removed. Measure the source before `showModal()` and target after layout. Stage geometry is viewport-relative.
- [ ] Implement each motion with `element.animate` and the four timing segments from the specification. Use this cancellation pattern for every group of native animations:

```ts
const finished = Promise.all(
  animations.map((animation) => animation.finished.catch(() => undefined)),
).then(() => undefined);
return {
  finished,
  finish: () => animations.forEach((animation) => animation.finish()),
  cancel: () => animations.forEach((animation) => animation.cancel()),
};
```

- [ ] Integrate readiness with `session.markOpened(token)` after opening or skip. Keep content loading independent. Use immediate readiness for reduced motion and direct URLs. On close/cancel, restore source visibility, cancel animation handles, abort pending requests, and invalidate the session.
- [ ] Animate chapter turns for 280ms with a hinged decorative page surface; keep readable content upright at rest. Finish the old page turn before replacing current chapter and announcing it. Prevent overlapping turn requests.
- [ ] Implement the 300ms closing motion toward the current source rectangle. If source is unavailable or resize invalidates the path, close immediately and restore focus/scroll. Cancel retained animations on teardown.
- [ ] Browser acceptance: the hand clearly grips the chosen book, the book originates at its shelf, prose is readable after opening, Skip works in each segment, and resize/Escape/rapid clicks never leave a hidden cover or stuck dialog. Check reduced motion produces no hand, cover spin, or page-turn movement.
- [ ] Checkpoint with `feat: animate taking and opening project books` when authorized.

## Task 6: Integrated verification and handoff

**Files:** Implementation files above; update this document's checkboxes and record actual verification results at execution time.

- [ ] Run `bun test src/components/project-library/model.test.ts src/components/project-library/session.test.ts` and existing tests with `bun test src/utils src/plugins`.
- [ ] Run `bun run format:check`, `git diff --check`, and `bun run build`. The normal build includes both languages and Pagefind. Do not substitute the docs-content build, which uses a different content source.
- [ ] Inspect built pages for 18 books per locale, identical membership and chapter IDs, correct localized links, and all six flagship chapters present in searchable detail HTML. Mark the empty runtime reader container `data-pagefind-ignore` to prevent duplicate UI/search content.
- [ ] Test keyboard-only operation, screen-reader dialog labeling/status, 200% text zoom, 360/768/1440px layouts, both themes, reduced motion, and no-JavaScript navigation. Verify scroll works inside long chapters and controls remain reachable.
- [ ] Test slow and failed fetches, repeated open/close, switching books, Back/Forward, direct URLs, locale switching, and resize mid-animation. Confirm aborted content never appears in a later book.
- [ ] Review the diff for unnecessary abstractions, global CSS leakage, added dependencies, and fabricated manuscript claims. Keep the state helper small; do not build a general animation engine.
- [ ] Report checks actually run, any remaining visual/accessibility limitations, and final changed files. Do not claim deployment or production verification.

## Flagship manuscript

Source: the user's first-person interview in this chat on 2026-10-05, plus the existing project description for the bot's functions and technology. These are qualitative observations; no measured adoption percentage or saved-hours claim was supplied.

### `when-the-team-grew`

**EN — When the team grew**

When the team had 20, 30, or 40 employees, recapping weekly reports was still manageable. As more people joined and the team reached about a hundred employees, that same process became overwhelming.

Reports came at the end of the week, and HR administrators repeatedly had to work overtime to finish the recap. I built Weekly Journal Bot to automate the reminders, report validation, and recaps that had become too much to handle manually.

**ID — Ketika tim bertambah besar**

Saat jumlah karyawan masih 20, 30, atau 40 orang, rekap laporan mingguan masih bisa ditangani. Seiring bertambahnya karyawan hingga mencapai sekitar seratus orang, proses yang sama mulai terasa kewalahan.

Laporan masuk pada akhir pekan, dan admin HR berulang kali harus lembur untuk menyelesaikan rekap. Saya membangun Weekly Journal Bot untuk mengotomatiskan pengingat, validasi laporan, dan rekap yang sudah terlalu berat dikerjakan secara manual.

### `building-relief-for-hr`

**EN — Building relief for HR**

HR administrators were the people I wanted to help. I handled the entire development myself, while HR supplied the data I needed, including employee information.

The bot works with reports submitted through Telegram. It checks the report format and submission period, records structured reports in Google Sheets, sends a Friday reminder, and prepares a Saturday recap. I built it with Python and FastAPI, connecting the reporting workflow to the spreadsheet HR uses.

**ID — Membantu pekerjaan HR**

Admin HR adalah pengguna yang ingin saya bantu. Saya mengerjakan seluruh pengembangannya sendiri, sementara HR menyediakan data yang dibutuhkan, termasuk data karyawan.

Bot memproses laporan yang dikirim melalui Telegram. Bot memeriksa format dan periode pengiriman, mencatat laporan terstruktur ke Google Sheets, serta mengirim pengingat pada hari Jumat dan menyiapkan rekap pada hari Sabtu. Saya membangunnya dengan Python dan FastAPI, menghubungkan alur pelaporan dengan spreadsheet yang digunakan HR.

### `two-places-to-report`

**EN — Two places to report**

There is still a problem this bot has not solved. Employees fill out a timesheet in another application and also submit their weekly report in Telegram. They still have two reporting activities to complete.

Automating the Telegram workflow helps with administration, but the duplicated effort remains. Bringing those activities together is an improvement I would still like to explore.

**ID — Melapor di dua tempat**

Masih ada masalah yang belum diselesaikan oleh bot ini. Karyawan mengisi timesheet di aplikasi lain dan juga mengirim laporan mingguan di Telegram. Mereka tetap harus melakukan dua aktivitas pelaporan.

Otomatisasi alur Telegram membantu pekerjaan administrasi, tetapi pekerjaan ganda itu masih ada. Menghubungkan kedua aktivitas tersebut masih menjadi perbaikan yang ingin saya pelajari.

### `rules-and-empathy`

**EN — Rules and empathy**

Reporting also affects penalties, which made this more than a technical problem for me. I had to think about how a reporting process could encourage a good habit while still making room for empathy.

That tension was one of the hardest parts of the project. Building the checks meant learning about the HR process and the rules behind it, as well as learning how to make the bot work.

**ID — Aturan dan empati**

Pelaporan juga berkaitan dengan sanksi, sehingga masalahnya melampaui urusan teknis. Saya perlu memikirkan bagaimana proses pelaporan dapat membangun kebiasaan yang baik sambil tetap memberi ruang bagi empati.

Pertimbangan itu menjadi salah satu bagian tersulit dalam proyek ini. Membangun validasinya membuat saya belajar tentang proses HR dan aturan yang mendasarinya, sekaligus mempelajari cara kerja bot.

### `a-more-consistent-habit`

**EN — A more consistent habit**

After people started using the bot, I noticed more employees submitting their reports each week. People who previously missed reports began reporting more regularly, and the number of employees not reporting went down.

The reports also became cleaner. Using one shared template helped reduce mistakes in the reporting period. These are changes I observed in the workflow; I do not have measured figures to attach to them.

**ID — Kebiasaan yang lebih teratur**

Setelah bot mulai digunakan, saya melihat lebih banyak karyawan mengirim laporan setiap pekan. Karyawan yang sebelumnya sering tidak melapor mulai lebih rutin, dan jumlah karyawan yang belum melapor berkurang.

Laporannya juga menjadi lebih rapi. Penggunaan satu template bersama membantu mengurangi kesalahan penulisan periode. Perubahan ini merupakan pengamatan saya terhadap prosesnya; saya belum memiliki angka pengukuran untuk menjelaskannya.

### `what-i-would-change`

**EN — What I learned—and would change**

This project taught me Python, how to build a Telegram bot, how to format bot messages with HTML, and how to integrate Google Sheets. I also learned more about HR processes and regulations.

If I had the chance to approach the incentive differently, I would introduce points for reporting and rewards based on those points. I would like the habit to grow through appreciation. That points-and-rewards system is an idea for the future; it is not part of the current bot.

**ID — Yang saya pelajari dan ingin ubah**

Melalui proyek ini, saya belajar Python, pembuatan bot Telegram, pemformatan pesan bot dengan HTML, dan integrasi Google Sheets. Saya juga belajar lebih banyak tentang proses HR dan regulasi.

Jika punya kesempatan untuk mengubah pendekatan insentifnya, saya ingin memberikan poin untuk pelaporan dan penghargaan berdasarkan poin tersebut. Saya ingin kebiasaan itu tumbuh melalui apresiasi. Sistem poin dan penghargaan ini masih berupa gagasan untuk pengembangan berikutnya, belum menjadi bagian dari bot saat ini.

## Plan self-review

- Shelf grouping, book covers, hand choreography, overlay reader, page turns, phone layout, bilingual content, and the flagship narrative each have an implementation task.
- Existing URLs, no-JavaScript access, reduced motion, failure recovery, cancellation, focus restoration, and browser history are specified and included in acceptance checks.
- Model, chapter, session, and motion contracts use matching names across tasks.
- The manuscript separates observed improvements from unimplemented rewards and unresolved duplicate reporting.
- This planning checklist records the intended work; the implementation record below records what was verified.

## Implementation record

- Branch: `codex/project-library`.
- Built shelves and 18 book covers in each language; preserved the existing project routes and standalone readable pages.
- Added the illustrated hand, book opening, page turns, native dialog reader, URL history, reduced-motion handling, and localized controls.
- Added six bilingual Weekly Journal Bot chapters based on the user's account; other projects open as one Overview chapter.
- Browser checks covered desktop and 375px mobile layout, opening and skipping motion, chapter turns, direct links, invalid links, Back/Forward, reduced motion, closing/focus restoration, and enlarged text at a 720px viewport.
- Verification: `bun test` (21 passed), `bun run format:check`, `bun run build` (English and Indonesian), and `git diff --check` passed. Built pages contain 18 books and three shelves per locale, six flagship chapters, and one Overview chapter for an ordinary project.
