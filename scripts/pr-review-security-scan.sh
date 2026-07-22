#!/usr/bin/env bash

# Minimal changed-file scan used by the PR Review Bot. NUL-delimited paths and
# quoted arrays keep filenames containing spaces, newlines, or leading dashes
# from changing grep's arguments.

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: pr-review-security-scan.sh <base-sha> <head-sha>" >&2
  exit 2
fi

base_sha="$1"
head_sha="$2"

mapfile -d '' changed_files < <(
  git diff --name-only -z --diff-filter=AM "$base_sha" "$head_sha" -- \
    '*.ts' '*.tsx' '*.js' '*.jsx'
)

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "No relevant files changed; security scan not needed."
  exit 0
fi

printf "Scanning %d changed JavaScript/TypeScript file(s) for dangerouslySetInnerHTML.\n" \
  "${#changed_files[@]}"

set +e
grep -nH -- 'dangerouslySetInnerHTML' "${changed_files[@]}"
grep_exit=$?
set -e

case "$grep_exit" in
  0)
    echo "Potential security issue found: dangerouslySetInnerHTML is present." >&2
    exit 1
    ;;
  1)
    echo "No dangerouslySetInnerHTML usage found in changed files."
    exit 0
    ;;
  *)
    echo "Security scan could not read one or more changed files." >&2
    exit "$grep_exit"
    ;;
esac
