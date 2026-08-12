/**
 * Thin Node surface to invoke scripts/lib/kill-pid-tree.sh without editing
 * verify-ci-shell-gate.sh (§9). Used by cleanup-scope live tests (#740 round 3).
 *
 * Tests must allocate their own ephemeral ports — do not rely on ambient
 * CYPRESS_SWA_URL (silent green on CI where .env.local is absent).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KILL_PID_TREE_SH = path.join(__dirname, "kill-pid-tree.sh");

/**
 * Resolve bash the same way other script tests do (BB_BASH on Windows).
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveBash(env = process.env) {
  return env.BB_BASH || "bash";
}

/**
 * Invoke kill_pid_tree with an optional PID. Empty / omitted → no-op (returns 0).
 * @param {string | number | null | undefined} pid
 * @param {{ env?: NodeJS.ProcessEnv, timeoutMs?: number }} [opts]
 * @returns {Promise<{ code: number | null, output: string }>}
 */
export function invokeKillPidTree(pid, opts = {}) {
  const env = opts.env ?? process.env;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const bash = resolveBash(env);
  const pidArg =
    pid === null || pid === undefined || pid === "" ? "" : String(pid);
  const script = `
set -euo pipefail
# shellcheck source=/dev/null
source "$1"
kill_pid_tree "$2"
`;
  return new Promise((resolve) => {
    const child = spawn(bash, ["-c", script, "--", KILL_PID_TREE_SH, pidArg], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ code: 124, output: output + "\ntimeout\n" });
    }, timeoutMs);
    child.stdout?.on("data", (c) => {
      output += String(c);
    });
    child.stderr?.on("data", (c) => {
      output += String(c);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 2, output: output + `\n${err.message}` });
    });
  });
}
