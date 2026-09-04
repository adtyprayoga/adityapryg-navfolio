#!/bin/sh
# Each pass writes its own sitemap, so the root index lists only the English
# URLs and the 32 Indonesian ones go unreferenced. Rewrite the index to point at
# both. Runs after the localized output has been merged into dist/id.
set -eu

root="${1:-dist}"
target="${2:-dist/id}"
origin="${SITE_URL:-https://adityapryg.dev}"
origin=$(printf '%s' "$origin" | sed 's|/$||')

[ -f "$root/sitemap-index.xml" ] || { echo "no $root/sitemap-index.xml, nothing to merge"; exit 0; }

entries="<sitemap><loc>$origin/sitemap-0.xml</loc></sitemap>"

if [ -f "$target/sitemap-0.xml" ]; then
  entries="$entries<sitemap><loc>$origin/id/sitemap-0.xml</loc></sitemap>"
else
  echo "warning: $target/sitemap-0.xml missing, index will list English only" >&2
fi

cat > "$root/sitemap-index.xml" <<XML
<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">$entries</sitemapindex>
XML

# The localized tree ships its own index pointing only at itself. Drop it so
# crawlers that find it are not handed a partial view of the site.
rm -f "$target/sitemap-index.xml"
