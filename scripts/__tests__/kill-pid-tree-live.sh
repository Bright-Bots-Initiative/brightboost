#!/usr/bin/env bash
# W-10 live harness: spawn shell→mid→listener on :5173, kill_pid_tree the
# root, assert no descendants remain and the port is free.
#
# Exit 0 = pass, 1 = fail, 77 = skip (Windows/taskkill path, busy :5173, or
# missing tools). Invoked by scripts/__tests__/ciWiring.test.ts.
#
# Intentionally does NOT port-sweep: if :5173 is already taken, we skip.
#
# Nest shape matters for G-202: mid must NOT be a job-controlling bash that
# reaps children on TERM (that falsely greens one-level `pkill -P`). Mid is a
# node parent that spawns the listener and ignores signals so the grandchild
# survives a one-level kill — matching npm→shell→Vite.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/kill-pid-tree.sh
source "$SCRIPT_DIR/../lib/kill-pid-tree.sh"

SKIP=77
LISTENER_JS=""
MID_JS=""

port_in_use() {
  if command -v curl >/dev/null 2>&1; then
    curl -s --max-time 1 -o /dev/null "http://127.0.0.1:5173" >/dev/null 2>&1
    return $?
  fi
  (echo >/dev/tcp/127.0.0.1/5173) >/dev/null 2>&1
}

# Git Bash / MSYS / native Windows always take the taskkill branch — this
# harness only proves the POSIX recursive walk.
uname_s="$(uname -s 2>/dev/null || echo unknown)"
case "$uname_s" in
  MINGW*|MSYS*|CYGWIN*)
    echo "W-10 SKIP: Windows shell uses taskkill //T, not the POSIX walk."
    exit "$SKIP"
    ;;
esac

if command -v taskkill >/dev/null 2>&1; then
  echo "W-10 SKIP: taskkill present — POSIX kill_pid_tree path not exercised."
  exit "$SKIP"
fi

if ! command -v pgrep >/dev/null 2>&1; then
  echo "W-10 SKIP: pgrep not available."
  exit "$SKIP"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "W-10 SKIP: node not available for nested listener."
  exit "$SKIP"
fi

if port_in_use; then
  echo "W-10 SKIP: :5173 already in use (refusing to touch a stranger)."
  exit "$SKIP"
fi

LISTENER_JS="$(mktemp "${TMPDIR:-/tmp}/w10-listener.XXXXXX.js")"
MID_JS="$(mktemp "${TMPDIR:-/tmp}/w10-mid.XXXXXX.js")"

cat > "$LISTENER_JS" <<'EOF'
require("http")
  .createServer((_req, res) => {
    res.writeHead(200);
    res.end("ok");
  })
  .listen(5173, "127.0.0.1");
EOF

# Mid: spawn listener as a child, then ignore TERM/INT so a one-level pkill of
# mid (or of root's direct children) leaves the listener holding :5173.
cat > "$MID_JS" <<EOF
const { spawn } = require("child_process");
spawn(process.execPath, ["$LISTENER_JS"], {
  stdio: "ignore",
  detached: false,
});
for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  try { process.on(sig, () => {}); } catch (_) { /* ignore */ }
}
setInterval(() => {}, 1 << 30);
EOF

# Outer bash → mid node → listener node on 5173.
echo "W-10: spawning nested listener via mid=$MID_JS"
bash -c "node \"$MID_JS\" & wait" &
ROOT_PID=$!
echo "W-10: root PID=$ROOT_PID"

cleanup_all() {
  # Best-effort if assertions fail mid-run — still only OUR tree.
  kill_pid_tree "$ROOT_PID" 2>/dev/null || true
  # Listener may have been orphaned by a broken one-level kill; if still ours
  # and holding 5173 we only kill PIDs we can prove descended from ROOT via
  # the snapshot — never port-sweep. Orphan cleanup uses the recursive kill
  # of whatever PIDs we recorded, not lsof.
  rm -f "$LISTENER_JS" "$MID_JS" 2>/dev/null || true
}
trap cleanup_all EXIT

# Wait until the grandchild is listening (or time out).
ready=0
for _ in $(seq 1 40); do
  if port_in_use; then
    ready=1
    break
  fi
  if ! kill -0 "$ROOT_PID" 2>/dev/null; then
    echo "W-10 FAIL: nested root exited before binding :5173." >&2
    exit 1
  fi
  sleep 0.25
done

if [[ "$ready" -ne 1 ]]; then
  echo "W-10 FAIL: nested listener never bound :5173." >&2
  exit 1
fi

# Snapshot the full descendant set before kill (for post-assertions).
collect_descendants() {
  local p="$1"
  local kids kid
  kids="$(pgrep -P "$p" 2>/dev/null || true)"
  for kid in $kids; do
    collect_descendants "$kid"
    printf '%s\n' "$kid"
  done
}
descendants_before="$(collect_descendants "$ROOT_PID")"
children_before="$(pgrep -P "$ROOT_PID" 2>/dev/null || true)"
if [[ -z "$children_before" ]]; then
  echo "W-10 FAIL: expected nested children under root $ROOT_PID." >&2
  exit 1
fi
# Need a grandchild — otherwise we are not testing recursion.
grandchild_count=0
for c in $children_before; do
  g="$(pgrep -P "$c" 2>/dev/null || true)"
  if [[ -n "$g" ]]; then
    grandchild_count=$((grandchild_count + 1))
  fi
done
if [[ "$grandchild_count" -lt 1 ]]; then
  echo "W-10 FAIL: nest has no grandchildren (would not catch one-level pkill)." >&2
  echo "children=$children_before descendants=$descendants_before" >&2
  exit 1
fi

kill_pid_tree "$ROOT_PID"

# Give the kernel a moment to reap.
sleep 0.5

# No descendant of ROOT may remain (root itself may be gone too).
remaining="$(pgrep -P "$ROOT_PID" 2>/dev/null || true)"
if [[ -n "$remaining" ]]; then
  echo "W-10 FAIL: descendants still alive under $ROOT_PID: $remaining" >&2
  exit 1
fi

# Every PID from the pre-kill descendant snapshot must be gone.
surviving=""
for d in $descendants_before; do
  if kill -0 "$d" 2>/dev/null; then
    surviving="$surviving $d"
  fi
done
if [[ -n "$surviving" ]]; then
  echo "W-10 FAIL: former descendant PID(s) still alive after kill_pid_tree:$surviving" >&2
  # Reap every recorded descendant (still no port sweep) so a red run cannot
  # leave an orphan holding :5173 for the next test.
  for d in $descendants_before; do
    kill -KILL "$d" 2>/dev/null || true
  done
  exit 1
fi

if port_in_use; then
  echo "W-10 FAIL: :5173 still in use after tree kill (grandchild likely survived)." >&2
  # Last-resort: kill recorded descendant PIDs only (never lsof the port).
  for d in $descendants_before; do
    kill -KILL "$d" 2>/dev/null || true
  done
  exit 1
fi

# Fresh bind must succeed — proves the port is actually free.
node -e '
  const net = require("net");
  const s = net.createServer();
  s.listen(5173, "127.0.0.1", () => {
    s.close(() => process.exit(0));
  });
  s.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
'

echo "W-10 PASS: nested tree rooted at $ROOT_PID fully cleaned; :5173 free."
exit 0
