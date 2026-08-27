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
#   Phase 2 (sabotage): inject a throw into the sandbox's src/main.tsx, boot
#     again, run test:e2e:ci, and REQUIRE a non-zero exit.
# PASS is printed only when phase 1 was green AND phase 2 was red.
#
# Process safety (review r3598393457): this script never sweeps or kills
# arbitrary PIDs on :5173. It terminates only the process tree it spawned
# (DEV_PID). A busy-port preflight refuses to start, and if a foreign listener
# wins the startup race (our Vite dies — strictPort — while wait-on latches
# onto the stranger), the script errors out and leaves that process alone.
#
# Repository safety (#801): the sabotage is NEVER written into the caller's
# checkout. Both phases serve a disposable `mktemp -d` sandbox, and only
# $SANDBOX/src/main.tsx is rewritten — $REPO_ROOT/src/main.tsx is opened for
# reading only. This is structural, not trap-based on purpose: a trap cannot
# run on SIGKILL (nor on the hard kill Vitest/CI use at timeout), and the old
# in-place edit survived such a kill, leaving a throw in the developer's tree
# that made every later run fail with a misleading "healthy baseline is RED".
# Because both phases run the same sandbox, the ONLY difference between them
# is still the injected throw — the causal proof is unchanged.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Read-only source of truth. Nothing in this script ever writes to it (#801).
MAIN="$REPO_ROOT/src/main.tsx"
SANDBOX=""
SANDBOX_MAIN=""
DEV_PID=""

# XF-01 / #671: cypress.config requires CYPRESS_SWA_URL (A4-03 removed the silent
# Cypress baseUrl fallback — that anti-pattern is NOT what this default is).
# This gate spawns `npm run dev`, and product vite.config.ts pins
# server.port: 5173 with strictPort: true, so the only server *this script*
# starts is :5173. Default CYPRESS_SWA_URL to match that spawned target.
# Callers that already set CYPRESS_SWA_URL keep their value. Busy-port
# preflight below still refuses a foreign :5173 listener (non-zero) — the
# default never silently retargets onto someone else's Vite (G-007 note).
export CYPRESS_SWA_URL="${CYPRESS_SWA_URL:-http://localhost:5173}"

# Shared tree-kill (recursive POSIX walk / Windows taskkill //T). W-9 / W-10.
# shellcheck source=lib/kill-pid-tree.sh
source "$SCRIPT_DIR/lib/kill-pid-tree.sh"

# Link a large, read-only directory into the sandbox instead of copying it
# (node_modules and public are hundreds of MB). Windows needs a junction: MSYS
# `ln -s` writes a shim the native node.exe cannot follow. Both forms are
# UNLINKED — never descended into — by the `rm -rf` in remove_sandbox.
link_dir() {
  local target="$1" link="$2"
  if command -v cygpath >/dev/null 2>&1; then
    cmd //c mklink //J "$(cygpath -w "$link")" "$(cygpath -w "$target")" >/dev/null
  else
    ln -s "$target" "$link"
  fi
}

# Disposable copy of what the dev server needs, outside the checkout (#801).
# Vite is rooted here, so vite.config.ts's __dirname-based @ / @shared aliases
# and its `vite.config.ts.timestamp-*.mjs` scratch file all stay in the sandbox.
# A file this misses shows up as a RED phase-1 baseline — loud, never a silent
# pass.
make_sandbox() {
  SANDBOX="$(mktemp -d)"
  SANDBOX_MAIN="$SANDBOX/src/main.tsx"
  cp -R "$REPO_ROOT/src" "$SANDBOX/src"
  cp -R "$REPO_ROOT/shared" "$SANDBOX/shared"
  cp "$REPO_ROOT/index.html" "$SANDBOX/"
  cp "$REPO_ROOT"/*.json "$SANDBOX/"
  cp "$REPO_ROOT"/*.config.* "$SANDBOX/"
  # .env* is optional — its absence is not an error.
  cp "$REPO_ROOT"/.env* "$SANDBOX/" 2>/dev/null || true
  link_dir "$REPO_ROOT/node_modules" "$SANDBOX/node_modules"
  link_dir "$REPO_ROOT/public" "$SANDBOX/public"
}

remove_sandbox() {
  # Guard the path: never let an unset or mis-expanded variable point rm at the
  # checkout. The junctions/symlinks inside are removed as links, not followed.
  if [[ -n "$SANDBOX" && "$SANDBOX" != "$REPO_ROOT" && -d "$SANDBOX" ]]; then
    # `|| true`: this runs from the EXIT trap, where under `set -e` a failed
    # command rewrites a successful `exit 0` into `exit 1`. A transient removal
    # failure (locked file, AV scan, busy junction) must not turn a genuinely
    # passing gate RED in the required build-and-test context. A leftover temp
    # directory is not a gate verdict.
    rm -rf "$SANDBOX" || true
  fi
  SANDBOX=""
  SANDBOX_MAIN=""
}

# True if something accepts TCP on :5173 (any HTTP response counts — do not use
# curl -f, which treats non-2xx as "down" and misses a live foreign Vite).
port_in_use() {
  if command -v curl >/dev/null 2>&1; then
    curl -s --max-time 1 -o /dev/null "http://127.0.0.1:5173" >/dev/null 2>&1
    return $?
  fi
  (echo >/dev/tcp/127.0.0.1/5173) >/dev/null 2>&1
}

kill_our_dev_server() {
  if [[ -n "${DEV_PID}" ]]; then
    kill_pid_tree "$DEV_PID"
    wait "$DEV_PID" 2>/dev/null || true
    DEV_PID=""
  fi
}

# Nothing to restore: the checkout was never modified (#801). Stop our server,
# then drop the sandbox. If a hard kill skips this, the only residue is a temp
# directory the OS reclaims — never a dirty working tree.
cleanup() {
  kill_our_dev_server
  remove_sandbox
  # Explicit success: teardown must never decide the verdict (see remove_sandbox).
  return 0
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
  # Serve the sandbox, never the checkout (#801). kill_pid_tree reaps this
  # subshell's descendants, so the extra level is safe.
  (cd "$SANDBOX" && npm run dev) &
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

# Leftover from a pre-#801 run: that version sabotaged the checkout in place, so
# a hard kill could strand the throw in src/main.tsx — after which phase 1 is
# red forever and reports a misleading "healthy baseline is RED". Name the real
# cause instead.
if grep -q 'SABOTAGE #677' "$MAIN"; then
  echo "ERROR: $MAIN still contains a leftover 'SABOTAGE #677' line." >&2
  echo "A pre-#801 run of this gate was hard-killed and left it behind; it is" >&2
  echo "not a real change. Restore it, then re-run:" >&2
  echo "  git checkout -- src/main.tsx && npm run verify:ci-gate" >&2
  exit 1
fi

cd "$REPO_ROOT"

# Refuse a busy :5173 so wait-on cannot latch onto a healthy foreign server.
if port_in_use; then
  echo "ERROR: http://localhost:5173 is already responding." >&2
  echo "Stop the other Vite/dev server and re-run: npm run verify:ci-gate" >&2
  exit 1
fi

# Both phases serve this disposable tree; only phase 2 rewrites its main.tsx.
make_sandbox

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
# §8.1.2 — read the pristine entrypoint, write the sabotaged one into the
# sandbox. No backup is needed because $MAIN is never modified (#801).
{
  printf '%s\n' 'throw new Error("SABOTAGE #677");'
  cat "$MAIN"
} > "$SANDBOX_MAIN"

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
