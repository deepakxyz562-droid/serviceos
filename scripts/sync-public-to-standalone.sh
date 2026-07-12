#!/bin/bash
# ============================================================
# ServiceOS — Sync public/ → standalone/public/
# ============================================================
# The production deployment runs `node standalone/server.js`, which serves
# static files from `standalone/public/`. Next.js's standalone build output
# does NOT automatically copy `public/` into `standalone/public/`, so every
# time a new icon / manifest / static asset is added to `public/`, it MUST
# also land in `standalone/public/` or the deployed site (serviceos.cc)
# will 404 on that asset — which is exactly what caused Lighthouse's
# "Your PWA's web manifest refers to an image that doesn't exist:
#  https://serviceos.cc/icon.svg" error.
#
# This script mirrors every file from `public/` into `standalone/public/`
# so the two directories never drift. Run it:
#   - After adding/changing any file in public/
#   - After `bun run build` (wired into the build script)
#   - Before deploying
#
# Usage:  bash scripts/sync-public-to-standalone.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public"
DST="$ROOT/standalone/public"

if [ ! -d "$SRC" ]; then
  echo "✗ Source directory not found: $SRC" >&2
  exit 1
fi

if [ ! -d "$DST" ]; then
  echo "  creating $DST"
  mkdir -p "$DST"
fi

echo "Syncing public/ → standalone/public/ ..."

# rsync preserves mtimes and deletes stale files; fall back to cp -r.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SRC/" "$DST/"
else
  cp -r "$SRC/." "$DST/"
fi

echo "✓ standalone/public/ is now in sync with public/"

# Sanity check: every icon referenced by manifest.json must exist on disk.
MANIFEST="$DST/manifest.json"
if [ -f "$MANIFEST" ]; then
  echo ""
  echo "Verifying manifest icon references..."
  MISSING=0
  # Extract "src": "/path" values from the JSON (robust enough for our flat manifest).
  for src in $(grep -o '"src"[[:space:]]*:[[:space:]]*"[^"]*"' "$MANIFEST" | sed 's/.*"src"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'); do
    case "$src" in
      /*)
        rel="${src#/}"
        if [ ! -f "$DST/$rel" ]; then
          echo "  ✗ MISSING: $src  (file not found in standalone/public/)"
          MISSING=$((MISSING + 1))
        else
          echo "  ✓ $src"
        fi
        ;;
    esac
  done
  if [ "$MISSING" -gt 0 ]; then
    echo ""
    echo "✗ $MISSING manifest-referenced asset(s) missing from standalone/public/!" >&2
    exit 1
  fi
  echo "✓ All manifest-referenced assets present."
fi
