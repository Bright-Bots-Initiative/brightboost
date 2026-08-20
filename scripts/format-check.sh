#!/usr/bin/env bash
# Check Prettier on files changed vs a merge base (default: origin/main...HEAD).
# Whole-tree prettier --check . fails on a large pre-existing backlog; see
# scripts/pr-review-prettier-check.sh. This is the local/CI format:check contract.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

base_sha="${1:-}"
head_sha="${2:-HEAD}"

if [[ -z "$base_sha" ]]; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    base_sha="$(git merge-base HEAD origin/main)"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    base_sha="$(git merge-base HEAD main)"
  else
    echo "format-check: could not resolve origin/main or main for merge-base" >&2
    exit 2
  fi
fi

mapfile -d '' changed_files < <(
  git diff --name-only -z --diff-filter=AM "$base_sha" "$head_sha"
)

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "No added or modified files vs ${base_sha}; Prettier check not needed."
  exit 0
fi

printf "Checking Prettier on %d added or modified file(s) since %s.\n" \
  "${#changed_files[@]}" "$base_sha"
npx prettier --check --ignore-unknown -- "${changed_files[@]}"
