#!/usr/bin/env bash
# verify-ci-step-presence.sh — Two-phase proof that required CI steps remain
# invoked in ci-cd.yml (W-11 / G-205).
#
# Phase 1 (healthy): parse the real workflow; every manifest substring must appear.
# Phase 2 (sabotage): copy the workflow, delete one required invocation, re-run
#   against the copy, require non-zero.
#
# Exit 0 = both phases OK.
# Exit 1 = property false (missing step / sabotage did not fail).
# Exit 2 = could not run (missing files / bash tools).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$SCRIPT_DIR/ci-required-steps.json"
WORKFLOW="$REPO_ROOT/.github/workflows/ci-cd.yml"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: missing manifest $MANIFEST" >&2
  exit 2
fi
if [[ ! -f "$WORKFLOW" ]]; then
  echo "ERROR: missing workflow $WORKFLOW" >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to parse the manifest" >&2
  exit 2
fi

# Read required substrings from JSON via node (no jq dependency).
mapfile -t REQUIRED < <(node -e '
  const m = require(process.argv[1]);
  for (const s of m.requiredSubstrings) process.stdout.write(s + "\n");
' "$MANIFEST")

check_workflow() {
  local file="$1"
  local label="$2"
  local missing=0
  local s
  for s in "${REQUIRED[@]}"; do
    if ! grep -Fq -- "$s" "$file"; then
      echo "[$label] MISSING required step substring: $s" >&2
      missing=1
    fi
  done
  return "$missing"
}

echo "[verify-ci-step-presence] Phase 1/2 — healthy workflow (expect PASS)…"
if ! check_workflow "$WORKFLOW" "healthy"; then
  echo "FAIL: healthy workflow is missing required step(s)." >&2
  exit 1
fi
echo "[verify-ci-step-presence] Healthy workflow PASS."

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
cp "$WORKFLOW" "$TMP"

# Sabotage: remove the prisma-drift invocation line (G-205 exemplar).
# Use a portable sed-free approach via node.
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  let t = fs.readFileSync(p, "utf8");
  const next = t.split(/\r?\n/).filter((line) => !line.includes("check-prisma-drift.sh")).join("\n");
  if (next === t) {
    console.error("sabotage failed: check-prisma-drift.sh line not found");
    process.exit(2);
  }
  fs.writeFileSync(p, next);
' "$TMP"

echo "[verify-ci-step-presence] Phase 2/2 — sabotaged copy missing drift invocation (expect FAIL)…"
if check_workflow "$TMP" "sabotage"; then
  echo "FAIL: sabotaged workflow still passed — guard has no teeth." >&2
  exit 1
fi

echo "============================================================"
echo "  PASS: CI step-presence guard has teeth."
echo "  Healthy:   all required substrings present"
echo "  Sabotaged: missing check-prisma-drift.sh detected"
echo "============================================================"
exit 0
