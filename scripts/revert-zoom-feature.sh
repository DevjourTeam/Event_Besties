#!/usr/bin/env bash
# Revert the zoom feature introduced in feature/canvas-zoom.
#
# Deletes the new files and strips every block fenced with
# // ZOOM_FEATURE_START ... // ZOOM_FEATURE_END (plus single-line
# // ZOOM_FEATURE_START / END markers left over from JSX comments).
# After this runs the project compiles with zero references to
# ZoomControls, useCanvasZoom, or canvas-scale.
#
# Usage (from repo root):
#   bash scripts/revert-zoom-feature.sh

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# --- 1) Delete new files ------------------------------------------------
rm -f lib/canvas-scale.ts
rm -f hooks/useCanvasZoom.ts
rm -f components/editor/ZoomControls.tsx
# Remove the empty hooks/ directory if nothing else is in it.
rmdir hooks 2>/dev/null || true

# --- 2) Strip marker blocks from edited files ---------------------------
strip_markers() {
  local file="$1"
  [ -f "$file" ] || return 0
  # Delete every line from ZOOM_FEATURE_START up to and including the
  # matching ZOOM_FEATURE_END. Handles both // and /* */ (JSX) comments.
  awk '
    BEGIN { inblock = 0 }
    /ZOOM_FEATURE_START/ { inblock = 1; next }
    /ZOOM_FEATURE_END/   { inblock = 0; next }
    inblock == 0 { print }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

strip_markers components/editor/FreeEditor.tsx
strip_markers components/editor/TemplateEditor.tsx

# --- 3) Remove this script itself ---------------------------------------
rm -f scripts/revert-zoom-feature.sh

echo "zoom feature reverted. run 'npx next build' to confirm clean compile."
