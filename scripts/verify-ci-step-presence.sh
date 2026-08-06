#!/usr/bin/env bash
# verify-ci-step-presence.sh — Two-phase proof that required CI steps remain
# invoked in ci-cd.yml (W-11 / G-205).
#
# Matches against *active* workflow commands (parsed YAML jobs.*.steps[]),
# not raw file text — a commented-out `run:` line must not count as present.
#
# Phase 1 (healthy): every manifest substring must appear in an active run:/uses:.
# Phase 2 (sabotage): for EACH manifest entry, remove matching steps from the
#   parsed document and require failure (exhaustive — always on in CI; not
#   gated behind --exhaustive).
#
# Exit 0 = both phases OK.
# Exit 1 = property false (missing step / sabotage did not fail).
# Exit 2 = could not run (missing files / bash tools).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# U1-04: injectable paths for unit tests (default = production locations).
MANIFEST="${CI_STEP_PRESENCE_MANIFEST:-$SCRIPT_DIR/ci-required-steps.json}"
WORKFLOW="${CI_STEP_PRESENCE_WORKFLOW:-$REPO_ROOT/.github/workflows/ci-cd.yml}"
CORE="$SCRIPT_DIR/verify-ci-step-presence-core.mjs"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: missing manifest $MANIFEST" >&2
  exit 2
fi
if [[ ! -f "$WORKFLOW" ]]; then
  echo "ERROR: missing workflow $WORKFLOW" >&2
  exit 2
fi
if [[ ! -f "$CORE" ]]; then
  echo "ERROR: missing core module $CORE" >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to parse the workflow YAML" >&2
  exit 2
fi

export CI_STEP_PRESENCE_MANIFEST="$MANIFEST"
export CI_STEP_PRESENCE_WORKFLOW="$WORKFLOW"

echo "[verify-ci-step-presence] Phase 1/2 — healthy workflow (expect PASS)…"
set +e
node "$CORE" check
phase1=$?
set -e
if [[ "$phase1" -ne 0 ]]; then
  echo "FAIL: healthy workflow is missing required step(s) (or could not check)." >&2
  exit "$phase1"
fi
echo "[verify-ci-step-presence] Healthy workflow PASS."

echo "[verify-ci-step-presence] Phase 2/2 — exhaustive sabotage per manifest entry (expect each FAIL)…"
set +e
node "$CORE" sabotage-all
phase2=$?
set -e
if [[ "$phase2" -ne 0 ]]; then
  echo "FAIL: exhaustive sabotage phase did not prove every entry." >&2
  exit "$phase2"
fi

echo "============================================================"
echo "  PASS: CI step-presence guard has teeth."
echo "  Healthy:   all required substrings present in active steps"
echo "  Sabotaged: every manifest entry falsified via YAML parse"
echo "============================================================"
exit 0
