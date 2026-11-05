# Feature the Resume Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Resume Builder the featured story on the Project Library in place of Weekly Journal Bot, refresh the home page's "what I'm doing" list, and give project pages solid search metadata.

**Architecture:** The featured project id moves out of `projects-index.astro` into one exported constant, guarded by a test that checks the entry exists in both languages. Project SEO is fixed in two places: frontmatter (`seoTitle`, a description of 160 characters or fewer, enforced by a test over every project file) and a new pure `projectSchema()` builder that `BaseHead.astro` emits as `CreativeWork` JSON-LD on project pages.

**Tech Stack:** Astro 5 (content collections, MDX), TypeScript, Bun test runner (`bun test`), TOML site config, JSON i18n.

**Spec:** No separate spec. The maker's request (5 November 2026): "highlight the resume, replace the weekly bot in project, update my latest activity, ensure SEO". This plan records the decisions made from it.

## Global Constraints

- Every visible change ships in **English and Indonesian**: `src/content/**` with `src/content-id/**`, `src/config/site.toml` with `src/config/site.id.toml`, `src/i18n/en.json` with `src/i18n/id.json`.
- **Weekly Journal Bot stays published.** It only loses the featured slot; its page, cover design and shelf position are untouched.
- Indonesian copy addresses the reader as **"Anda"**, matching the Resume Builder page.
- Project `description` values must be **160 characters or fewer** (the length search results show).
- `src/config/site.toml` and `src/config/site.id.toml` already hold the maker's **uncommitted avatar change** (`avatar = "/images/avatar.webp"`), together with an uncommitted `public/images/avatar.webp` and a staged deletion of `public/images/f30083fcbf8a673fbe9f2b1a5ab8de84.jpg`. Before Task 4, ask the maker whether to commit that avatar change first. Never stage it silently inside another commit, and always commit with explicit pathspecs.
- No new dependencies.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pushing waits for the maker's yes.

## Review Focus

1. **The featured id is renamed or deleted in one language only.** The featured section would vanish silently from that language's Project Library. Pinned by the existence test in Task 1.
2. **A future project description runs past 160 characters.** It would be cut off mid-sentence in results. Pinned by the length test in Task 2.
3. **The project's live-site link is missing from structured data.** Search engines would not connect the project page to `resume.lab.adityapryg.dev`. Pinned by the `sameAs` assertion in Task 3.
4. **JSON-LD shows up on non-project pages, or BlogPosting shows up on project pages.** That would give contradictory types. Pinned by the built-HTML checks in Task 5.
5. **The Indonesian page's JSON-LD reports `en-US`.** Pinned by the `inLanguage` assertion in Task 3.

---

### Task 1: Feature the Resume Builder on the Project Library

**Files:**

- Create: `src/components/project-library/featured.ts`
- Create: `src/components/project-library/featured.test.ts`
- Modify: `src/modules/routes/projects-index.astro:18-20`
- Modify: `src/components/project-library/cover-design.ts:4-23`
- Modify: `src/i18n/en.json:136-137`, `src/i18n/id.json:136-137`

**Interfaces:**

- Produces: `export const FEATURED_PROJECT_ID = 'resume';` from `featured.ts`

- [ ] **Step 1: Write the failing test** in `featured.test.ts`

```ts
import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { FEATURED_PROJECT_ID } from './featured';

test('featured project is the Resume Builder', () => {
  expect(FEATURED_PROJECT_ID).toBe('resume');
});

test('featured project exists in both languages', () => {
  for (const base of ['src/content/projects', 'src/content-id/projects']) {
    expect(existsSync(`${base}/${FEATURED_PROJECT_ID}.mdx`)).toBe(true);
  }
});
```

- [ ] **Step 2: Run it.** `bun test src/components/project-library/featured.test.ts` should FAIL because it cannot resolve `./featured`.
- [ ] **Step 3: Create `featured.ts`** exporting `FEATURED_PROJECT_ID = 'resume'`, with a one-line comment saying the id must match a project file in both content trees.
- [ ] **Step 4: Run it.** The same command should PASS with 2 tests.
- [ ] **Step 5: Use the constant in `projects-index.astro`.** Replace `.find((project) => project.id === 'weekly-journal-bot')` with `.find((project) => project.id === FEATURED_PROJECT_ID)` and import the constant.
- [ ] **Step 6: Give the Resume Builder its own cover.** Add `resume: { motif: 'pages', palette: 'teal' }` to `designs` in `cover-design.ts`. No other project uses this combination. Leave the `weekly-journal-bot` entry in place.
- [ ] **Step 7: Rewrite the feature copy** (exact text):
  - `en.json` `library.featureTitle`: `"A resume builder that tells your story back."`
  - `en.json` `library.featureDescription`: `"How a browser-only resume builder was made with Claude Code and Codex, one checked step at a time."`
  - `id.json` `library.featureTitle`: `"Pembuat resume yang menceritakan kembali kisah Anda."`
  - `id.json` `library.featureDescription`: `"Cara pembuat resume yang berjalan di browser dibangun bersama Claude Code dan Codex, satu langkah terverifikasi demi satu langkah."`
- [ ] **Step 8: Run all tests.** `bun test` should report all tests passing and 0 failing.
- [ ] **Step 9: Commit**

```bash
git add src/components/project-library/featured.ts src/components/project-library/featured.test.ts src/components/project-library/cover-design.ts src/modules/routes/projects-index.astro src/i18n/en.json src/i18n/id.json
git commit -m "feat(projects): feature the Resume Builder instead of Weekly Journal Bot" -- src/components/project-library/featured.ts src/components/project-library/featured.test.ts src/components/project-library/cover-design.ts src/modules/routes/projects-index.astro src/i18n/en.json src/i18n/id.json
```

### Task 2: Resume Builder frontmatter SEO and the description-length guard

**Files:**

- Create: `src/content.seo.test.ts`
- Modify: `src/content/projects/resume.mdx:1-5`, `src/content-id/projects/resume.mdx:1-5`

- [ ] **Step 1: Write the failing test** in `src/content.seo.test.ts`. Use `readdirSync` and a regex over the frontmatter, with no YAML dependency.

```ts
test('every project description is at most 160 characters', () => {
  // for each .mdx in src/content/projects and src/content-id/projects:
  // capture the text between the quotes on the line matching /^description: '(.*)'$/m
  expect(length).toBeLessThanOrEqual(160); // message names the file
});

test('the Resume Builder has an seoTitle in both languages', () => {
  // the frontmatter of both resume.mdx files matches /^seoTitle: '.+'$/m
});
```

- [ ] **Step 2: Run it.** `bun test src/content.seo.test.ts` should FAIL. The descriptions are currently 178 characters (EN) and 191 (ID), and there is no `seoTitle`.
- [ ] **Step 3: Edit the frontmatter** (exact values):
  - EN `seoTitle: 'Resume Builder, bilingual ATS resume maker in the browser'`
  - EN `description: 'A bilingual resume builder that runs in your browser, with Classic and ATS layouts, CV import, undo, and PDF export. Built with Claude Code and Codex.'`
  - ID `seoTitle: 'Resume Builder, pembuat CV ATS dwibahasa di browser'`
  - ID `description: 'Pembuat resume dwibahasa yang berjalan di browser, dengan tata letak Classic dan ATS, impor CV, undo, dan ekspor PDF. Dibuat bersama Claude Code dan Codex.'`
- [ ] **Step 4: Run it.** `bun test src/content.seo.test.ts` should PASS.
- [ ] **Step 5: Commit** both `resume.mdx` files and the test, with the message `feat(seo): add Resume Builder seoTitle and cap project descriptions at 160 chars`.

### Task 3: `projectSchema()` structured-data builder

**Files:**

- Create: `src/utils/structured-data.ts`
- Create: `src/utils/structured-data.test.ts`

**Interfaces:**

- Produces:

```ts
export interface ProjectSchemaInput {
  url: string; // canonical page URL
  name: string; // project title
  description: string;
  dateCreated: Date;
  language: 'en' | 'id';
  links: { href: string }[];
  keywords: string[]; // project tags
  authorId: string; // `${origin}/#person`
}
export function projectSchema(input: ProjectSchemaInput): Record<string, unknown>;
```

- [ ] **Step 1: Write the failing tests** in `structured-data.test.ts`, using an input with the resume's values (`links` = live site plus repository):
  - `@type` is `'CreativeWork'` and `@id` is `` `${url}#project` ``
  - `name`, `description`, `url` are passed through unchanged
  - `dateCreated` equals `'2026-11-02T00:00:00.000Z'` for `new Date('2026-11-02')`
  - `inLanguage` is `'id-ID'` for `language: 'id'` and `'en-US'` for `'en'`
  - `sameAs` equals `['https://resume.lab.adityapryg.dev', 'https://github.com/adtyprayoga/resume']`, in input order
  - `author` equals `{ '@id': authorId }`
  - `keywords` equals the tags joined by `', '`
  - with `links: []` the result has no `sameAs` key at all
- [ ] **Step 2: Run them.** `bun test src/utils/structured-data.test.ts` should FAIL with a module-not-found error.
- [ ] **Step 3: Implement `projectSchema`** to the interface above as a pure function with no Astro imports.
- [ ] **Step 4: Run them.** The same command should PASS.
- [ ] **Step 5: Commit** both files with the message `feat(seo): add CreativeWork schema builder for project pages`.

### Task 4: Emit project JSON-LD and refresh the "doing" list

> Ask the maker about the avatar change first (see Global Constraints).

**Files:**

- Modify: `src/components/BaseHead.astro` (Props, and the schema assembly near line 85)
- Modify: `src/layouts/BlogArticle.astro:146-152`
- Modify: `src/config/site.toml:253-255`, `src/config/site.id.toml:253-255`

**Interfaces:**

- Consumes: `projectSchema`, `ProjectSchemaInput` from Task 3
- Produces: a new optional `BaseHead` prop, `project?: { dateCreated: Date; links: { href: string }[]; keywords: string[] }`

- [ ] **Step 1: Wire the schema into `BaseHead.astro`.** Add the `project` prop. When it is set, push `projectSchema({ url: String(Astro.url), name: title, description, dateCreated, language, links, keywords, authorId: \`${origin}/#person\` })`followed by`person`onto`schema`. Mirror the `publishedTime` branch.
- [ ] **Step 2: Pass the prop from `BlogArticle.astro`** when the post is a project (not `isBlogPost`): `project={isProject ? { dateCreated: date, links: post.data.links, keywords: post.data.tags } : undefined}`. Decide `isProject` the same way `isBlogPost` is decided in that file, by the collection name `'projects'`.
- [ ] **Step 3: Replace "doing" item `mark = "02"`** (the Telegram bot line, which is finished work):
  - EN `text = "Building a bilingual resume builder with Claude Code and Codex"`
  - ID `text = "Membangun pembuat resume dwibahasa bersama Claude Code dan Codex"`

  Leave items 01 and 03 to 05 as they are. Mee-Rha-Sol stays out because its post is still `draft: true`.

- [ ] **Step 4: Run the type and format checks.** `bun run format:check` should exit 0.
- [ ] **Step 5: Commit** with explicit pathspecs: `BaseHead.astro`, `BlogArticle.astro`, and both TOML files. The TOML files go in only if the maker has already committed the avatar change or approved including it. Use the message `feat(seo): emit project JSON-LD; update current activity`.

### Task 5: Verify in the built site

- [ ] **Step 1: Build.** `bun run build` should exit 0 and list `/projects/resume/index.html` in both language passes.
- [ ] **Step 2: Check the English project page.** Run `grep -o '<title>[^<]*' dist/projects/resume/index.html`. It should print `Resume Builder, bilingual ATS resume maker in the browser | <site title>`. Then check that the same file contains `"@type":"CreativeWork"`, `resume.lab.adityapryg.dev` inside the JSON-LD, `hreflang="id"`, and no `BlogPosting`.
- [ ] **Step 3: Check the Indonesian project page.** `dist/id/projects/resume/index.html` should show the ID `seoTitle` and `"inLanguage":"id-ID"`.
- [ ] **Step 4: Check the featured slot.** `dist/projects/index.html` should contain `data-book-placement="featured"` with `data-book-id="resume"` and the new feature title. `weekly-journal-bot` should appear only as a shelf book. Repeat for `dist/id/projects/index.html`.
- [ ] **Step 5: Check the "doing" list and blog pages.** `dist/index.html` should contain the new item 02 text. A blog page such as `dist/blog/testing-quadrants/index.html` should still contain `BlogPosting` and no `CreativeWork`.
- [ ] **Step 6: Look at the result.** Run `bun run dev` and screenshot `/projects/` and `/id/projects/` at desktop and mobile width, so a person can see the featured jacket and copy.
- [ ] **Step 7: Report.** List what passed, what wasn't checked, and leave the push for the maker's decision.
