#!/usr/bin/env bash
# verify-ci-shell-gate.sh — Sabotage proof for the per-PR Cypress shell gate (#677).
#
# Breaks src/main.tsx on purpose, runs npm run test:e2e:ci, and exits 0 ONLY if
# Cypress fails (gate has teeth). Always restores main.tsx via trap … EXIT (G-005).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MAIN="$REPO_ROOT/src/main.tsx"
BACKUP="$(mktemp)"
DEV_PID=""

port_in_use() {
  curl -sf --max-time 1 "http://localhost:5173" >/dev/null 2>&1
}

kill_port_5173() {
  if command -v lsof >/dev/null 2>&1; then
    local port_pids
    port_pids="$(lsof -ti:5173 2>/dev/null || true)"
    if [[ -n "$port_pids" ]]; then
      # shellcheck disable=SC2086
      kill $port_pids 2>/dev/null || true
    fi
  fi
  # Windows / Git Bash: npm's child Vite often survives a plain kill of DEV_PID.
  if command -v taskkill >/dev/null 2>&1 && command -v netstat >/dev/null 2>&1; then
    local pid
    while read -r pid; do
      [[ -z "$pid" || "$pid" == "0" ]] && continue
      taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
    done < <(netstat -ano 2>/dev/null | awk '/:5173/ && /LISTENING/ {print $NF}' | sort -u)
  fi
}

cleanup() {
  local restore_ok=0
  if [[ -f "$BACKUP" ]]; then
    if ! cp "$BACKUP" "$MAIN" 2>/dev/null; then
      echo "REPO MAY BE DIRTY — run \`git checkout src/main.tsx\`" >&2
      restore_ok=1
    fi
    rm -f "$BACKUP" || true
  fi

  if [[ -n "${DEV_PID}" ]]; then
    # Kill the npm/vite tree started by this script (G-005).
    if command -v taskkill >/dev/null 2>&1; then
      taskkill //F //T //PID "$DEV_PID" >/dev/null 2>&1 || true
    fi
    kill "$DEV_PID" 2>/dev/null || true
    # Best-effort: clear anything still bound to :5173 that we orphaned.
    kill_port_5173
    wait "$DEV_PID" 2>/dev/null || true
    DEV_PID=""
  fi

  return "$restore_ok"
}

# EXIT covers normal verdict exits; INT/TERM cover Ctrl-C / kill (G-005).
# cleanup is idempotent so a signal that still ends the shell is safe if both fire.
trap cleanup EXIT INT TERM

if [[ ! -f "$MAIN" ]]; then
  echo "ERROR: $MAIN not found" >&2
  exit 1
fi

cd "$REPO_ROOT"

# Refuse to proceed if something else already owns :5173 — otherwise wait-on
# can succeed against a healthy foreign server and invalidate the sabotage proof.
if port_in_use; then
  echo "ERROR: http://localhost:5173 is already responding." >&2
  echo "Stop the other Vite/dev server and re-run: npm run verify:ci-gate" >&2
  exit 1
fi

cp "$MAIN" "$BACKUP"

# Inject a shell-breaking throw at the top of main.tsx (overview.md §8.1).
{
  printf '%s\n' 'throw new Error("SABOTAGE #677");'
  cat "$BACKUP"
} > "$MAIN"

echo "[verify-ci-gate] Starting sabotaged dev server…"
npm run dev &
DEV_PID=$!

# Backgrounded npm can exit immediately on bind failure; surface that early.
sleep 2
if ! kill -0 "$DEV_PID" 2>/dev/null; then
  echo "ERROR: sabotaged dev server exited immediately (see output above)." >&2
  exit 1
fi

npx wait-on http://localhost:5173 --timeout 60000

if ! kill -0 "$DEV_PID" 2>/dev/null; then
  echo "ERROR: sabotaged dev server died before Cypress ran." >&2
  exit 1
fi

echo "[verify-ci-gate] Running npm run test:e2e:ci (expect RED)…"
set +e
npm run test:e2e:ci
CYPRESS_EC=$?
set -e

if [[ "$CYPRESS_EC" -ne 0 ]]; then
  echo ""
  echo "============================================================"
  echo "  PASS: CI shell gate has teeth (Cypress exit=$CYPRESS_EC)"
  echo "  Sabotaged shell was correctly rejected. See issue #677."
  echo "============================================================"
  exit 0
fi

echo ""
echo "============================================================"
echo "  FAIL: CI shell gate is toothless (Cypress exit=$CYPRESS_EC)"
echo "  Sabotaged src/main.tsx still produced a green Cypress run."
echo "  See issue #677 — a gate that cannot fail is not a gate."
echo "============================================================"
exit 1
