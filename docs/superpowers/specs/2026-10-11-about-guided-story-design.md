# About page guided-story design

## Intent and references

Turn the bilingual About page into a friendly, readable story about Aditya Prayoga's engineering and teaching work. The six storyboard beats are: meet Adit, current work, career milestones, systems, teaching, and tools plus ways to connect. The [desktop and mobile mockup](/home/adity/.codex/visualizations/2026/10/10/01a12787-73aa-79d2-93f6-70132425c8e5/about-guided-story.html) and [storyboard](/home/adity/.codex/visualizations/2026/10/10/01a12787-73aa-79d2-93f6-70132425c8e5/about-storyboard.html) illustrate the composition; this specification governs content and behavior. Their portrait is a reference placeholder, not the final seated view.

## Page structure and visual direction

Keep the site's existing navigation, `green-soft` palette, Maple Mono typography, light/dark modes, metadata, and English/Indonesian routes. The opening has a brief first-person greeting and two ordinary links: jump to the first chapter and view Projects. The seated avatar is the other focal point, on a restrained book stack inspired by the supplied reference image. Follow it with a short current-work bridge, four MDX chapters (journey, building systems, teaching, and toolkit/credentials), then a page-level contact close. Desktop has a compact sticky navigation with five targets, including contact; mobile has a native expandable “On this page” menu. Use whitespace and rules for chapter rhythm; reserve filled surfaces for the avatar and closing section. Avoid scroll-controlled camera movement, autoplay page transitions, and invented achievements.

Keep all existing factual detail and working project links in the appropriate locale. Condense the visible summaries, but retain the full teaching-course table and full systems/client table in separate native `details` blocks. Keep experience, certifications, education, languages, and social links visible in the story. Use heading anchors generated from each locale's MDX rather than hard-coded English slugs. All biography text must remain server-rendered and searchable.

## Avatar scene and controls

Use only `sitting-avatar.glb` from the attached proof of concept. Its embedded `Female Sitting Pose` is a held, roughly 0.033-second pose on a distinct skeleton; evaluate and hold it before normalizing and framing the model. Add the proof of concept's subtle head and chest idle movement. The seated model has no facial morph targets, so there is no blink control or claim of blinking. Render a simple stack of three books below the sitting figure. No standing-model switch, photo export, or zoom control.

The reserved scene starts with a matching seated-model poster. Load the 3D module when the scene approaches the viewport and only after confirming WebGL is available. Show progress, then fade from poster to canvas. If loading or WebGL fails, retain the poster and offer a single Retry button when retry can help. Pointer/touch drag rotates the view; it must not intercept vertical page scrolling. Left/right buttons provide a keyboard and touch alternative. A visible Pause button controls idle movement. A compact Scene settings disclosure contains Daylight, Peach, and Night lighting and Reset view. Do not auto-rotate. Scene controls do not navigate away or alter page history.

Honor live `prefers-reduced-motion` changes. With reduced motion enabled, start paused and avoid animated transitions. Stop rendering when offscreen or when the tab is hidden, resume when visible, and release WebGL, observers, listeners, and animation frames when Astro navigates away. The full page must remain usable without JavaScript and when the model cannot load.

## Assets, limits, and acceptance

The public page needs an optimized static image of the actual seated scene, generated from the model, with meaningful alt text. Load the 8.9 MB GLB only on the About page and only when near the viewport; the original 15.1 MB avatar stays out of the build. Share one asset URL across English and Indonesian routes using an absolute `/about-avatar/...` path compatible with the bilingual build. Include the original asset-license notice with the source file. The attached notice restricts the model to personal use and calls for additional rights for commercial/public use; do not publish the model publicly until its rights for this site are verified or an appropriately licensed replacement is supplied. Local implementation and preview can proceed.

Acceptance: both locales tell the same factual story; chapter links resolve locally; all existing course and systems rows survive; the page fits 320, 390, 768, 1024, and 1440 pixel widths; keyboard, touch, reduced motion, no-JavaScript, WebGL failure, slow loading, and repeat navigation work; no non-About route downloads the model or Three.js; and the bilingual production build, formatting checks, and `git diff --check` pass.
