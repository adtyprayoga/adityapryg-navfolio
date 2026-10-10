# Guided-Story About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inline unless the user explicitly requests subagents.

**Goal:** Replace the bilingual résumé-style About article with a friendly guided story centered on the supplied seated 3D avatar.

**Architecture:** Keep biography data in the existing English and Indonesian MDX entries. Render them in a dedicated Astro About route using the site's `BaseLayout`, with a localized hero, current-work bridge, four MDX chapters, and page-level contact close. Enhance an always-visible seated-avatar poster with a lazy-loaded Three.js scene and local controls.

**Tech Stack:** Existing Astro 7, MDX, TypeScript, CSS, Bun, Sharp, Chromium; add `three@^0.179.1` and its TypeScript declarations only for the About viewer.

**Spec:** [About page guided-story design](../specs/2026-10-11-about-guided-story-design.md). Read it and the supplied avatar POC before executing the tasks.

## Global constraints

- Keep `/about/` and `/id/about/`, canonical and alternate-language metadata, existing site navigation, `green-soft` theme, dark mode, and project links.
- Preserve all existing factual biography details, course rows, system/client rows, education, credentials, languages, and social links in their respective locale. Translate new UI labels and copy naturally; do not invent results.
- Only `sitting-avatar.glb` is a runtime asset. The source `avatar.glb` is not needed. The seated model has a held pose and no eyelid morph targets; no blinking or model switch.
- No JavaScript, WebGL, model failure, and reduced-motion states remain readable and usable. Never trap normal touch scrolling inside the avatar scene.
- Load the GLB and Three.js only as the About scene approaches the viewport. Keep the biography server-rendered and Pagefind-indexable.
- Preserve the POC asset-license notice. Public deployment of these assets is held until suitable rights are verified or the asset is replaced; implementation and local preview are within scope.
- Stage only intended files. Run `bun run format:check`, `git diff --check`, and `bun run build`; inspect both locale outputs and browser widths before calling the change complete.

## Files and responsibilities

- `src/pages/about.astro`: localized route, metadata, hero, chapter navigation, and rendered MDX body.
- `src/content/about.mdx` and `src/content-id/about.mdx`: authoritative biography copy, four chapter headings, full tables in native disclosures, and localized hero frontmatter.
- `src/content.config.ts`: About-only frontmatter schema extension; leave the shared article schema unchanged.
- `src/components/about/AboutAvatar.astro`: poster, semantic controls, loading/retry status, and viewer mount point.
- `src/components/about/avatar-viewer.ts`: model load, held pose, scene, interactions, motion policy, and cleanup.
- `src/components/about/about.css`: responsive story layout and scene styling using site theme variables.
- `public/about-avatar/sitting-avatar.glb`, `seated-poster.webp`, and `LICENSE_FROM_SOURCE.txt`: one shared model, matching static image, and its license notice.
- `package.json` and `bun.lock`: Three.js runtime and TypeScript declaration dependencies.

### Task 1: Make the bilingual biography a guided story

**Files:** Modify `src/content.config.ts`, `src/content/about.mdx`, and `src/content-id/about.mdx`.

**Interfaces:** Each About entry adds `hero: { kicker: string; greeting: string; tagline: string; introduction: string; current: string[]; storyCta: string; projectCta: string }`. The route will derive four `{ slug, text }` chapter records from Astro's rendered level-two headings and add a fifth contact target.

- [ ] Extend only the About collection schema using `articleSchema(context).extend({ hero: z.object({ kicker: z.string(), greeting: z.string(), tagline: z.string(), introduction: z.string(), current: z.array(z.string()).length(3), storyCta: z.string(), projectCta: z.string() }) })`. Do not add hero fields to every article type.
- [ ] Move the opening greeting and three current-work bullets into localized hero frontmatter, then reorder the MDX body into exactly four level-two chapters: journey; systems/experience; teaching; toolkit/credentials. Retain the current timeline facts, job descriptions, links, **18 course rows and 14 systems/client rows per locale**, awards, education, languages, and social URLs. Put the course and client tables in separate native `<details>` elements with localized `<summary>` labels. Use level-three headings for subsections.
- [ ] Run `bun run build`. Inspect generated `/about/index.html` and `/id/about/index.html` for all 18 course rows, all 14 systems/client rows, and resolved project links. Commit this independently readable content/schema change.

### Task 2: Build the guided-story layout with a static avatar scene

**Files:** Modify `src/pages/about.astro`; create `src/components/about/AboutAvatar.astro` and `src/components/about/about.css`; temporarily add `public/about-avatar/avatar-preview.jpg` from the ZIP until Task 3 supplies the seated poster.

**Interfaces:** `AboutAvatar.astro` accepts `locale: 'en' | 'id'` and emits a scene root marked `data-about-avatar`. The route derives `chapters = headings.filter(({ depth }) => depth === 2)`, throws unless there are four, and appends a localized `{ slug: 'contact', text: ... }` navigation target. `BaseLayout` supplies the existing head, navigation, theme, and scroll-to-top behavior.

- [ ] Replace the `BlogArticle` wrapper in `about.astro` with `BaseLayout title={about.data.title} description={about.data.description}`. Build one `<main data-pagefind-body>` containing: hero; current-work bridge from `about.data.hero.current`; desktop chapter `<nav>`; mobile `<details>` navigation; rendered `<Content />`; closing `<section id="contact">`. Use `const chapters = headings.filter(({ depth }) => depth === 2); if (chapters.length !== 4) throw new Error('About requires four MDX chapters');`, then append the localized contact target for the two navigation menus. The first CTA links to `#${chapters[0].slug}`.
- [ ] Copy `avatar-preview.jpg` from the ZIP to `public/about-avatar/avatar-preview.jpg` for this static layout milestone. Put it in `AboutAvatar.astro` as a normal `<img>` with explicit width/height, localized alt text, and a reserved aspect ratio. Keep scene controls hidden until their JavaScript is ready. Task 3 replaces and removes this portrait with the actual seated-model poster; the final no-JavaScript presentation must show the seated scene.
- [ ] Add About-scoped CSS for the split desktop hero, 55/45 text/avatar balance, readable chapter column, sticky desktop chapter nav, responsive mobile order, native disclosure styling, 44px touch targets, visible focus, and `prefers-reduced-motion`. Use the theme's existing colors; do not overwrite global palette tokens. On mobile, put intro before avatar and remove sticky navigation in favor of the disclosure.
- [ ] Build both locales and inspect static pages at 320, 390, 768, 1024, and 1440px. Confirm no horizontal overflow, all chapter links land on the right heading, disclosures work without JavaScript, and theme colors remain legible. Commit the static layout separately from the WebGL enhancement.

### Task 3: Add the exact seated model and a matching poster

**Files:** Add the three `public/about-avatar/` assets and dependencies; create the model-rendering part of `src/components/about/avatar-viewer.ts`.

**Interfaces:** `mountAboutAvatar(root: HTMLElement): () => void` creates the renderer inside `root` and returns an idempotent cleanup function. Asset URLs are absolute `/about-avatar/...` paths so the Indonesian build uses the shared root assets.

- [ ] Copy `sitting-avatar.glb` and `LICENSE_FROM_SOURCE.txt` from the provided ZIP. Check the copied model's SHA-256 and size against the ZIP entry. Do not copy `avatar.glb`, the POC's executable, or its separate site CSS/HTML.
- [ ] Add `three@^0.179.1` and matching `@types/three` using Bun. In `avatar-viewer.ts`, dynamically import Three.js from the browser entry, create an alpha WebGL renderer, and load the sitting GLB via `GLTFLoader` with progress and failure callbacks. Evaluate the `Female Sitting Pose` clip once, hold its last frame, then compute skinned bounds and normalize the model to the scene height before positioning it. Use the POC's initial front-facing camera direction and a simple three-book stand.
- [ ] Make a static `seated-poster.webp` from the loaded seated scene at the intended camera and daylight lighting. Use local Chromium to capture the scene, crop to the avatar viewport, optimize with Sharp, and inspect the result. It must show the actual seated model and books. Replace the component's poster URL and remove the temporary `avatar-preview.jpg` from the tree.
- [ ] Build both locales and inspect the generated asset requests. Confirm both routes reference the same `/about-avatar/sitting-avatar.glb`, the model loads and faces the camera, the books sit beneath it, and no other route includes a model request or eager Three.js import. Commit the asset and first render.

### Task 4: Add controls, motion policy, and recovery

**Files:** Finish `src/components/about/avatar-viewer.ts` and `AboutAvatar.astro`; adjust About-scoped CSS.

**Interfaces:** The component owns `data-action` controls for `turn-left`, `turn-right`, `pause`, `reset`, and `data-lighting` values `daylight | peach | night`. The module returns cleanup, updates `aria-pressed` for pause/lighting, and writes concise loading/error text into a polite live region. Retry calls a fresh load attempt after failure.

- [ ] Initialize the viewer only when an `IntersectionObserver` reports the reserved scene near the viewport. Keep the poster in place during loading, reveal controls only after a successful setup, and leave the poster visible after a WebGL failure. A load failure shows Retry; a WebGL-unavailable state explains that the still image remains available.
- [ ] Use horizontal pointer dragging on the scene with `touch-action: pan-y`; treat vertical movement as page scroll. Rotate the model root within ±0.9 radians. The turn buttons change the same angle by ±0.25 radians, so keyboard and touch users have equal access. Disable wheel zoom and panning.
- [ ] Add a visible Pause button and a native Scene settings disclosure with three lighting buttons and Reset. Reset restores the initial camera/model orientation and daylight preset. Keep all controls localized and accessible by name.
- [ ] Gate idle head/chest motion on `!paused && !reducedMotion && inViewport && !document.hidden`. Listen for changes to `prefers-reduced-motion`, `visibilitychange`, and scene intersection. Stop the animation frame loop when the gate is false; render a single frame after drag or control changes. Disconnect observers and listeners, dispose renderer/geometries/materials, and ignore late GLB callbacks during `astro:before-swap` or component teardown.
- [ ] In local Chromium, exercise mouse drag, touch drag plus vertical scrolling, keyboard buttons, lighting, reset, pause, OS reduced-motion toggling, tab hiding, model failure/retry, and repeated navigation away/back. Verify there is one canvas and one animation loop after each return. Commit the working interaction.

### Task 5: Verify content, performance, and release boundary

**Files:** Fix only issues found in the About implementation; update the plan checklist with actual results during execution.

- [ ] Run the existing `bun test` suite. Run `bun run format:check`, `git diff --check`, and `bun run build` once after fixes.
- [ ] Inspect English and Indonesian HTML for one H1, four MDX chapter anchors plus `#contact`, correct `lang`/alternate links, all preserved tables and links, Pagefind-readable biography text, and no duplicate introductory paragraphs.
- [ ] Inspect network requests on Home, Projects, `/about/`, and `/id/about/`: only the About routes should download Three.js or the GLB, and they should do so when the scene approaches view. Check the poster appears before the GLB completes and remains after a forced WebGL or network failure.
- [ ] Check light/dark themes and 320, 390, 768, 1024, and 1440px widths. Verify no horizontal overflow, no clipped avatar, visible focus, working chapter navigation, and readable disclosure tables. Review exact asset-license terms before any public publishing action; if rights are unresolved, deliver the local implementation with that boundary stated plainly.
- [ ] Review the final diff for accidental source-asset copies, unrelated formatting, and biography omissions; commit only intended files if committing is part of the implementation request. Do not claim deployment or public release from a local build.
