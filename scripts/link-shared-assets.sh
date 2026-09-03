#!/bin/sh
# The localized pass copies all of public/ into dist/id, which duplicates the
# fonts and images already sitting at the root (~38MB). Those files are
# identical, so replace each copy with a relative symlink back to the root one.
# nginx follows symlinks by default, and Docker's COPY preserves them.
set -eu

root="${1:-dist}"
target="${2:-dist/id}"

[ -d "$target" ] || { echo "no $target, nothing to link"; exit 0; }

for path in public/*; do
  name=$(basename "$path")
  # _astro is generated per build and differs between passes, so it stays.
  [ "$name" = "_astro" ] && continue
  if [ -e "$target/$name" ] && [ -e "$root/$name" ]; then
    rm -rf "$target/$name"
    ln -s "../$name" "$target/$name"
  fi
done

# pagefind indexes the whole of dist in one pass and writes a single bundle at
# the root, but the localized build resolves its loader against base=/id. Point
# /id/pagefind at that bundle so the Indonesian pages can load it. This runs
# again after pagefind, once dist/pagefind exists.
if [ -d "$root/pagefind" ] && [ ! -L "$target/pagefind" ]; then
  rm -rf "$target/pagefind"
  ln -s "../pagefind" "$target/pagefind"
fi
