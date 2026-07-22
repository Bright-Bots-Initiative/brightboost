#!/usr/bin/env bash

# Regression proof for issue behind the PR Review Bot's empty false reports:
# both green and red commands must produce explicit status, exit-code, and
# decodable diagnostic outputs while the capture helper itself remains green.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
helper="$script_dir/run-pr-review-check.sh"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

read_output() {
  local key="$1"
  local file="$2"
  sed -n "s/^${key}=//p" "$file"
}

success_outputs="$tmp_dir/success.outputs"
GITHUB_OUTPUT="$success_outputs" \
  bash "$helper" bash -c 'printf "healthy output\n"; exit 0'

[[ "$(read_output status "$success_outputs")" == "success" ]]
[[ "$(read_output exit_code "$success_outputs")" == "0" ]]
success_b64="$(read_output output_b64 "$success_outputs")"
[[ "$(printf '%s' "$success_b64" | base64 --decode)" == "healthy output" ]]

failure_outputs="$tmp_dir/failure.outputs"
GITHUB_OUTPUT="$failure_outputs" \
  bash "$helper" bash -c 'printf "actionable failure\n"; exit 7'

[[ "$(read_output status "$failure_outputs")" == "failure" ]]
[[ "$(read_output exit_code "$failure_outputs")" == "7" ]]
failure_b64="$(read_output output_b64 "$failure_outputs")"
[[ "$(printf '%s' "$failure_b64" | base64 --decode)" == "actionable failure" ]]

echo "PR Review Bot capture regression proof passed (green=0, red=7 with diagnostics)."
