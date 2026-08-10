#!/usr/bin/env bash

# Run one PR Review Bot check without letting GitHub Actions' implicit
# `bash -e` discard the command's exit code and diagnostics. The command's
# result is written as small, single-line step outputs; this helper itself
# returns zero so every check can run and the workflow can post one complete
# review before its final enforcement step fails the job.

set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "run-pr-review-check: GITHUB_OUTPUT is required" >&2
  exit 2
fi

if [[ "$#" -eq 0 ]]; then
  echo "run-pr-review-check: a command is required" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
raw_output="$tmp_dir/raw.txt"
report_output="$tmp_dir/report.txt"
trap 'rm -rf "$tmp_dir"' EXIT

set +e
"$@" >"$raw_output" 2>&1
exit_code=$?
set -e

# Keep the normal Actions log complete while bounding the data passed between
# jobs and ultimately placed in a PR comment.
cat "$raw_output"

status="failure"
if [[ "$exit_code" -eq 0 ]]; then
  status="success"
fi

max_report_bytes=8000
raw_bytes="$(wc -c <"$raw_output")"
if (( raw_bytes > max_report_bytes )); then
  {
    printf '[output truncated; showing final %d of %d bytes]\n' \
      "$max_report_bytes" "$raw_bytes"
    tail -c "$max_report_bytes" "$raw_output"
  } >"$report_output"
else
  cp "$raw_output" "$report_output"
fi

# Base64 keeps multiline/untrusted tool output out of both GITHUB_OUTPUT's
# delimiter syntax and the github-script source. The comment job decodes and
# HTML-escapes it before rendering.
output_b64="$(base64 <"$report_output" | tr -d '\n')"

{
  printf 'status=%s\n' "$status"
  printf 'exit_code=%s\n' "$exit_code"
  printf 'output_b64=%s\n' "$output_b64"
} >>"$GITHUB_OUTPUT"

echo "run-pr-review-check: captured exit=$exit_code status=$status"

# The final workflow step enforces all captured statuses together.
exit 0
