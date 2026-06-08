#!/usr/bin/env bash
# check-prisma-drift.sh — Compare model definitions between root and backend
# Prisma schemas.  Exits non-zero if they have diverged.
#
# How it works:
#   1. Strip comment lines, generator blocks, datasource blocks, and blank lines
#   2. diff the remaining model/enum content
#
# This intentionally ignores generator and datasource differences (they SHOULD
# differ between root and backend copies).

set -euo pipefail

ROOT_SCHEMA="prisma/schema.prisma"
BACKEND_SCHEMA="backend/prisma/schema.prisma"

if [ ! -f "$ROOT_SCHEMA" ]; then
  echo "ERROR: Root schema not found at $ROOT_SCHEMA"
  exit 1
fi

if [ ! -f "$BACKEND_SCHEMA" ]; then
  echo "ERROR: Backend schema not found at $BACKEND_SCHEMA"
  exit 1
fi

# Strip comments, generator/datasource blocks, and blank lines to isolate
# model + enum content.
#
# The previous version only stripped full-line // comments anchored at
# column 0. Inline comments (`field String  // "a" | "b"`) and indented
# comment lines inside model bodies still flowed through and reported as
# drift, which is what bit the schema sync after the gamification + CTF
# work added a lot of `// enum-string` documentation to the root schema.
# The expected behavior — and what the docblock has always claimed — is
# that comments are not load-bearing for sync.
strip_non_model() {
  awk '
    /^generator /  { skip=1 }
    /^datasource / { skip=1 }
    skip && /^}/   { skip=0; next }
    skip           { next }
                   { print }
  ' "$1" \
    | sed -E 's|[[:space:]]*//.*$||' \
    | sed '/^[[:space:]]*$/d'
}

ROOT_MODELS=$(strip_non_model "$ROOT_SCHEMA")
BACKEND_MODELS=$(strip_non_model "$BACKEND_SCHEMA")

DIFF_OUTPUT=$(diff <(echo "$ROOT_MODELS") <(echo "$BACKEND_MODELS") || true)

if [ -z "$DIFF_OUTPUT" ]; then
  echo "✓ Prisma schemas are in sync (models match)."
  exit 0
else
  echo "✗ Prisma schema drift detected!"
  echo ""
  echo "Differences (root vs backend):"
  echo "$DIFF_OUTPUT"
  echo ""
  echo "Fix: edit prisma/schema.prisma (root), then sync backend/prisma/schema.prisma."
  exit 1
fi
