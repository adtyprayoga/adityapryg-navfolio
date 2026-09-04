# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — toolchain and dependencies (shared by the build and dev targets)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps

# python3/venv : scripts/fonts/subset-ui-font.ts shells out to fontTools
# ca-certificates: HTTPS for package downloads
# git          : not needed to install (bun fetches the @navfolio/* packages as
#                HTTPS tarballs) but kept as a fallback for any git-resolved dep
RUN apt-get update \
  && apt-get install --no-install-recommends -y \
       ca-certificates \
       git \
       python3 \
       python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The font script probes ./.venv first, so this is the interpreter it will find.
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --no-cache-dir fonttools brotli zopfli

# bun is the package manager here: bun.lock is the lockfile of record and the
# one Dependabot maintains. It also runs the font subset script; astro and
# pagefind still run on node, via the bin stubs bun installs.
RUN npm install -g bun@1

# Dependencies first, so edits to src/ do not invalidate the install layer.
COPY package.json bun.lock ./
# HUSKY=0 keeps the "prepare" hook quiet without a .git directory.
ENV HUSKY=0
# --frozen-lockfile fails on a lockfile that disagrees with package.json rather
# than silently resolving something else, which is what a deploy wants.
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2 — build the static site
# ---------------------------------------------------------------------------
FROM deps AS builder

COPY . .

# Baked into the static output (canonical URLs, sitemap, RSS), so it has to be
# known at build time rather than at container start.
ARG SITE_URL=""
ARG SITE_BASE=""
# Set to 1 to skip the CJK font subset step. The subset only matters if you
# publish Chinese content; this site defaults to English with Indonesian second.
ARG SKIP_FONT_SUBSET="0"

ENV SITE_URL=$SITE_URL \
    SITE_BASE=$SITE_BASE

# Mirrors the "build" script in package.json, with the font step made optional.
# Two passes: English at the root, Indonesian under /id, then one search index
# over the merged output so search covers both.
RUN set -eux; \
    if [ "$SKIP_FONT_SUBSET" != "1" ]; then bun run fonts:ui; fi; \
    npx astro build; \
    NAVFOLIO_LANG=id \
      NAVFOLIO_SITE_CONFIG=./src/config/site.id.toml \
      NAVFOLIO_CONTENT_BASE=./src/content-id \
      SITE_BASE=/id \
      npx astro build --outDir dist-id; \
    rm -rf dist/id; mkdir -p dist/id; cp -r dist-id/. dist/id/; rm -rf dist-id; \
    sh scripts/link-shared-assets.sh dist dist/id; \
    sh scripts/merge-sitemaps.sh dist dist/id; \
    npx pagefind \
      --site dist \
      --output-subdir pagefind \
      --root-selector main \
      --exclude-selectors "[data-pagefind-ignore]"; \
    sh scripts/link-shared-assets.sh dist dist/id

# ---------------------------------------------------------------------------
# Stage 3 — serve it
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Coolify reads container health status; /health is served by nginx without
# touching the filesystem. Point Coolify's own health check at the same path.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
