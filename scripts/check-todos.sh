#!/bin/bash
BASE_SHA="$1"
HEAD_SHA="$2"
GH_OUTPUT_FILE="$GITHUB_OUTPUT"

if [ -z "$BASE_SHA" ] || [ -z "$HEAD_SHA" ]; then
  echo "Error: Base SHA or Head SHA not provided." >&2
  echo "todos_output=Error: Base or Head SHA not provided for check-todos.sh." >> "$GH_OUTPUT_FILE"
  echo "todos_status=failure" >> "$GH_OUTPUT_FILE"
  exit 1
fi

echo "Searching for new TODO/FIXME comments between $BASE_SHA and $HEAD_SHA..." >&2
MERGE_BASE=$(git merge-base "$BASE_SHA" "$HEAD_SHA" || echo "$BASE_SHA")
echo "Using merge base: $MERGE_BASE" >&2

TEMP_TODOS_FILE=$(mktemp)

git diff --name-only --diff-filter=AM "$MERGE_BASE" "$HEAD_SHA" -- '*.ts' '*.tsx' '*.js' '*.jsx' | while IFS= read -r file; do
  git diff -U0 --no-color "$MERGE_BASE" "$HEAD_SHA" -- "$file" | \
  grep -E '^\+' | \
  grep -iE 'TODO:|FIXME:' | \
  sed -e "s/^\+//" -e "s/^/[NEW] $file: /" >> "$TEMP_TODOS_FILE"
done

if [ -s "$TEMP_TODOS_FILE" ]; then
  echo "Found new or modified TODO/FIXME comments." >&2
  FOUND_TODOS=$(cat "$TEMP_TODOS_FILE" | sed 's/%/%25/g; s/\n/%0A/g; s/\r/%0D/g')
  echo "todos_status=failure" >> "$GH_OUTPUT_FILE"
  echo "todos_output=$(echo "$FOUND_TODOS" | tr -d '\n' | xargs -0 printf "%s")" >> "$GH_OUTPUT_FILE"
  echo "$FOUND_TODOS" | sed 's/%0A/\n/g; s/%0D/\r/g' >&2
else
  echo "No new or modified TODO/FIXME comments found." >&2
  echo "todos_status=success" >> "$GH_OUTPUT_FILE"
  echo "todos_output=No new or modified TODO/FIXME comments found." >> "$GH_OUTPUT_FILE"
fi

rm -f "$TEMP_TODOS_FILE"
exit 0
