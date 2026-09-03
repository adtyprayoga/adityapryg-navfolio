# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — toolchain and dependencies (shared by the build and dev targets)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps

# git          : several @navfolio/* dependencies install straight from GitHub
# python3/venv : scripts/fonts/subset-ui-font.ts shells out to fontTools
# ca-certificates: HTTPS for both of the above
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

# package.json drives the font step through bun; astro and pagefind run on node.
RUN npm install -g bun@1

# package-lock.json pins the @navfolio/* dependencies to git+ssh:// URLs, which
# cannot authenticate inside the image. Rewrite them to anonymous HTTPS; the
# resolved commit SHAs are unchanged. --add because insteadOf is multi-valued.
RUN git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/" \
  && git config --global --add url."https://github.com/".insteadOf "git@github.com:"

# Dependencies first, so edits to src/ do not invalidate the install layer.
COPY package.json package-lock.json ./
# HUSKY=0 keeps the "prepare" hook from failing without a .git directory.
ENV HUSKY=0
RUN npm ci

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
RUN set -eux; \
    if [ "$SKIP_FONT_SUBSET" != "1" ]; then bun run fonts:ui; fi; \
    npx astro build; \
    npx pagefind \
      --site dist \
      --output-subdir pagefind \
      --root-selector main \
      --exclude-selectors "[data-pagefind-ignore]"

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
