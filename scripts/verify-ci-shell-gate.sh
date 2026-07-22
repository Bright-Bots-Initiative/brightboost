#!/usr/bin/env bash
# verify-ci-shell-gate.sh — Causal sabotage proof for the per-PR Cypress shell
# gate (#677).
#
# Two-phase proof so PASS can only mean "the gate turned red BECAUSE the shell
# broke" (review r3598393451):
#   Phase 1 (healthy baseline): boot the untouched app, run test:e2e:ci, and
#     REQUIRE exit 0. A missing Cypress binary, config failure, or already-red
#     baseline stops the script here with FAIL — it can never masquerade as a
#     successful sabotage.
#   Phase 2 (sabotage): inject a throw into src/main.tsx, boot again, run
#     test:e2e:ci, and REQUIRE a non-zero exit.
# PASS is printed only when phase 1 was green AND phase 2 was red.
#
# Process safety (review r3598393457): this script never sweeps or kills
# arbitrary PIDs on :5173. It terminates only the process tree it spawned
# (DEV_PID). A busy-port preflight refuses to start, and if a foreign listener
# wins the startup race (our Vite dies — strictPort — while wait-on latches
# onto the stranger), the script errors out and leaves that process alone.
#
# src/main.tsx is always restored via trap … EXIT (G-005), on normal, error,
# and signal exits alike.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MAIN="$REPO_ROOT/src/main.tsx"
BACKUP=""
DEV_PID=""

# True if something accepts TCP on :5173 (any HTTP response counts — do not use
# curl -f, which treats non-2xx as "down" and misses a live foreign Vite).
port_in_use() {
  if command -v curl >/dev/null 2>&1; then
    curl -s --max-time 1 -o /dev/null "http://127.0.0.1:5173" >/dev/null 2>&1
    return $?
  fi
  (echo >/dev/tcp/127.0.0.1/5173) >/dev/null 2>&1
}

# Kill ONLY the process tree rooted at the PID this script spawned. No port
# sweeps: a PID we did not create is never touched, whatever it is bound to.
#
# Windows subtlety: under Git Bash / MSYS, $! is the MSYS pid, while taskkill
# needs the WINDOWS pid — killing the MSYS pid strands the native node/vite
# child (the failure mode that motivated the old port sweep). MSYS exposes
# the translation at /proc/<pid>/winpid; using it keeps the kill precise and
# still strictly scoped to the child we spawned.
kill_pid_tree() {
  local pid="${1:-}"
  [[ -z "$pid" ]] && return 0
  if command -v taskkill >/dev/null 2>&1; then
    local winpid="$pid"
    if [[ -r "/proc/$pid/winpid" ]]; then
      winpid="$(cat "/proc/$pid/winpid" 2>/dev/null || echo "$pid")"
    fi
    # Windows: //T kills the whole child tree under OUR pid.
    taskkill //F //T //PID "$winpid" >/dev/null 2>&1 || true
  elif command -v pkill >/dev/null 2>&1; then
    # POSIX: descendants first, then the root.
    pkill -TERM -P "$pid" 2>/dev/null || true
  fi
  kill "$pid" 2>/dev/null || true
}

kill_our_dev_server() {
  if [[ -n "${DEV_PID}" ]]; then
    kill_pid_tree "$DEV_PID"
    wait "$DEV_PID" 2>/dev/null || true
    DEV_PID=""
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

# Boot `npm run dev` and wait for :5173; verify OUR server is the listener.
# $1 is a label for log lines ("healthy" / "sabotaged").
start_dev_server() {
  local label="$1"
  echo "[verify-ci-gate] Starting $label dev server…"
  npm run dev &
  DEV_PID=$!

  sleep 2
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: $label dev server exited immediately (see output above)." >&2
    exit 1
  fi

  npx wait-on http://localhost:5173 --timeout 60000

  # Startup-race guard: vite runs strictPort, so if a foreign process claimed
  # :5173 between our preflight and bind, OUR server is dead and wait-on
  # latched onto the stranger. Never kill it — report and stop.
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: $label dev server died and something else is on :5173." >&2
    echo "Refusing to touch the foreign listener. Free the port and re-run." >&2
    DEV_PID=""
    exit 1
  fi
}

# Stop our server and wait for :5173 to actually free up (bounded), so the
# next phase's strictPort bind cannot trip over our own teardown. If the port
# stays busy while our tree is gone, that's a foreign listener — stop.
stop_dev_server_and_wait_port_free() {
  kill_our_dev_server
  local i
  for i in $(seq 1 20); do
    if ! port_in_use; then
      return 0
    fi
    sleep 0.5
  done
  echo "ERROR: :5173 is still busy after our dev server was stopped —" >&2
  echo "a foreign process holds it. Refusing to touch it. Re-run when free." >&2
  exit 1
}

# Run the gate spec; sets CYPRESS_EC (set +e capture, D1-04).
run_gate() {
  set +e
  npm run test:e2e:ci
  CYPRESS_EC=$?
  set -e
}

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

# ── Phase 1: HEALTHY baseline must be green ─────────────────────────────────
start_dev_server "healthy"
echo "[verify-ci-gate] Phase 1/2 — running npm run test:e2e:ci on the HEALTHY shell (expect GREEN)…"
run_gate
HEALTHY_EC=$CYPRESS_EC
stop_dev_server_and_wait_port_free

if [[ "$HEALTHY_EC" -ne 0 ]]; then
  echo ""
  echo "============================================================"
  echo "  FAIL: healthy baseline is RED (Cypress exit=$HEALTHY_EC)."
  echo "  Cannot prove sabotage causality — the gate is failing for"
  echo "  some other reason (missing Cypress binary, broken config,"
  echo "  or an already-broken shell). Fix the baseline first. #677"
  echo "============================================================"
  exit 1
fi
echo "[verify-ci-gate] Healthy baseline GREEN (exit 0)."

# ── Phase 2: SABOTAGED shell must be red ────────────────────────────────────
# §8.1.1 — backup outside the repo (after preflight so early EXIT cannot
# restore an empty mktemp over main.tsx).
BACKUP="$(mktemp)"
cp "$MAIN" "$BACKUP"

# §8.1.2
{
  printf '%s\n' 'throw new Error("SABOTAGE #677");'
  cat "$BACKUP"
} > "$MAIN"

start_dev_server "sabotaged"
echo "[verify-ci-gate] Phase 2/2 — running npm run test:e2e:ci on the SABOTAGED shell (expect RED)…"
run_gate
SABOTAGED_EC=$CYPRESS_EC

# §8.1.5 — causal verdict: green healthy AND red sabotaged.
if [[ "$SABOTAGED_EC" -ne 0 ]]; then
  echo ""
  echo "============================================================"
  echo "  PASS: CI shell gate has teeth."
  echo "  Healthy shell:   Cypress exit=0 (green)"
  echo "  Sabotaged shell: Cypress exit=$SABOTAGED_EC (red)"
  echo "  The gate turned red BECAUSE the shell broke. See #677."
  echo "============================================================"
  exit 0
fi

echo ""
echo "============================================================"
echo "  FAIL: CI shell gate is toothless (sabotaged exit=$SABOTAGED_EC)"
echo "  Healthy and sabotaged runs were BOTH green — the gate does"
echo "  not react to a broken shell. See issue #677."
echo "============================================================"
exit 1
