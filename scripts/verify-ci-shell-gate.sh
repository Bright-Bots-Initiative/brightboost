#!/usr/bin/env bash
# verify-ci-shell-gate.sh — Sabotage proof for the per-PR Cypress shell gate (#677).
#
# Breaks src/main.tsx on purpose, runs npm run test:e2e:ci, and exits 0 ONLY if
# Cypress fails (gate has teeth). Always restores main.tsx via trap … EXIT (G-005).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MAIN="$REPO_ROOT/src/main.tsx"
BACKUP=""
DEV_PID=""
# Set after wait-on succeeds — only then may cleanup sweep :5173 (G-204).
OWNED_PORT=0

# True if something accepts TCP on :5173 (any HTTP response counts — do not use
# curl -f, which treats non-2xx as "down" and misses a live foreign Vite).
port_in_use() {
  if command -v curl >/dev/null 2>&1; then
    curl -s --max-time 1 -o /dev/null "http://127.0.0.1:5173" >/dev/null 2>&1
    return $?
  fi
  (echo >/dev/tcp/127.0.0.1/5173) >/dev/null 2>&1
}

kill_pid_tree() {
  local pid="${1:-}"
  [[ -z "$pid" ]] && return 0
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
  fi
  kill "$pid" 2>/dev/null || true
}

sweep_port_5173() {
  if command -v lsof >/dev/null 2>&1; then
    local port_pids
    port_pids="$(lsof -ti:5173 2>/dev/null || true)"
    if [[ -n "$port_pids" ]]; then
      # shellcheck disable=SC2086
      kill $port_pids 2>/dev/null || true
    fi
  fi
  if command -v taskkill >/dev/null 2>&1 && command -v netstat >/dev/null 2>&1; then
    local pid
    while read -r pid; do
      [[ -z "$pid" || "$pid" == "0" ]] && continue
      taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
    done < <(netstat -ano 2>/dev/null | awk '/:5173/ && /LISTENING/ {print $NF}' | sort -u)
  fi
}

# §8.1.6 — kill only the dev server this script started.
# Sweep :5173 only if we successfully bound it (OWNED_PORT=1); never kill a
# foreign Vite after a busy-port / bind-failure early exit.
kill_our_dev_server() {
  if [[ -n "${DEV_PID}" ]]; then
    kill_pid_tree "$DEV_PID"
    wait "$DEV_PID" 2>/dev/null || true
    DEV_PID=""
  fi
  if [[ "$OWNED_PORT" -eq 1 ]]; then
    sweep_port_5173
    OWNED_PORT=0
  fi
}

cleanup() {
  local restore_ok=0
  # Only restore when we have a real backup of main.tsx (never an empty mktemp).
  if [[ -n "$BACKUP" && -f "$BACKUP" ]]; then
    if ! cp "$BACKUP" "$MAIN" 2>/dev/null; then
      echo "REPO MAY BE DIRTY — run \`git checkout src/main.tsx\`" >&2
      restore_ok=1
    fi
    rm -f "$BACKUP" || true
    BACKUP=""
  fi

  kill_our_dev_server

  return "$restore_ok"
}

on_signal() {
  cleanup || true
  trap - EXIT
  exit 130
}

trap cleanup EXIT
trap on_signal INT TERM

if [[ ! -f "$MAIN" ]]; then
  echo "ERROR: $MAIN not found" >&2
  exit 1
fi

cd "$REPO_ROOT"

# Refuse a busy :5173 so wait-on cannot latch onto a healthy foreign server.
if port_in_use; then
  echo "ERROR: http://localhost:5173 is already responding." >&2
  echo "Stop the other Vite/dev server and re-run: npm run verify:ci-gate" >&2
  exit 1
fi

# §8.1.1 — backup outside the repo (after preflight so early EXIT cannot
# restore an empty mktemp over main.tsx).
BACKUP="$(mktemp)"
cp "$MAIN" "$BACKUP"

# §8.1.2
{
  printf '%s\n' 'throw new Error("SABOTAGE #677");'
  cat "$BACKUP"
} > "$MAIN"

# §8.1.3 / D1-04 — boot, wait-on, run test:e2e:ci, capture exit with set +e.
echo "[verify-ci-gate] Starting sabotaged dev server…"
npm run dev &
DEV_PID=$!

sleep 2
if ! kill -0 "$DEV_PID" 2>/dev/null; then
  echo "ERROR: sabotaged dev server exited immediately (see output above)." >&2
  exit 1
fi

npx wait-on http://localhost:5173 --timeout 60000
OWNED_PORT=1

if ! kill -0 "$DEV_PID" 2>/dev/null; then
  echo "ERROR: sabotaged dev server died before Cypress ran." >&2
  exit 1
fi

echo "[verify-ci-gate] Running npm run test:e2e:ci (expect RED)…"
# D1-04: capture exit with set +e around the Cypress run.
set +e
npm run test:e2e:ci
CYPRESS_EC=$?
set -e

# §8.1.5
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
