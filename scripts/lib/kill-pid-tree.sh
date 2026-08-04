# kill-pid-tree.sh — Kill ONLY the process tree rooted at the given PID.
# No port sweeps: a PID we did not create is never touched (#677 W-9).
#
# Sourced by verify-ci-shell-gate.sh and the W-10 live harness.
# Do not execute this file directly.

# Windows subtlety: under Git Bash / MSYS, $! is the MSYS pid, while taskkill
# needs the WINDOWS pid — killing the MSYS pid strands the native node/vite
# child. MSYS exposes the translation at /proc/<pid>/winpid.
#
# POSIX: pkill -P is one level deep; npm → shell → Vite leaves Vite as a
# grandchild. Collect the full descendant set via pgrep -P before signalling,
# TERM first, then KILL anything still alive after a short grace.
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
    return 0
  fi

  # Depth-first collect (deepest first) so we still have PIDs after parents die.
  _kill_pid_tree_collect() {
    local p="$1"
    local kids kid
    kids="$(pgrep -P "$p" 2>/dev/null || true)"
    for kid in $kids; do
      _kill_pid_tree_collect "$kid"
      printf '%s\n' "$kid"
    done
  }

  local descendants d
  descendants="$(_kill_pid_tree_collect "$pid")"

  for d in $descendants; do
    kill -TERM "$d" 2>/dev/null || true
  done
  kill -TERM "$pid" 2>/dev/null || true

  sleep 0.5

  for d in $descendants; do
    if kill -0 "$d" 2>/dev/null; then
      kill -KILL "$d" 2>/dev/null || true
    fi
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -KILL "$pid" 2>/dev/null || true
  fi
}
