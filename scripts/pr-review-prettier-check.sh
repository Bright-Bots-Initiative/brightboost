#!/usr/bin/env bash

# Check only files introduced or modified by this pull request. The repository
# has a pre-existing formatting backlog, so a whole-tree Prettier check makes
# every unrelated PR red and cannot identify whether the PR added a regression.

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: pr-review-prettier-check.sh <base-sha> <head-sha>" >&2
  exit 2
fi

base_sha="$1"
head_sha="$2"

mapfile -d '' changed_files < <(
  git diff --name-only -z --diff-filter=AM "$base_sha" "$head_sha"
)

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "No added or modified files; Prettier check not needed."
  exit 0
fi

printf "Checking Prettier on %d added or modified file(s).\n" \
  "${#changed_files[@]}"
npx prettier --check --ignore-unknown -- "${changed_files[@]}"
