/* @vitest-environment node */
/**
 * Cleanup scope: static forbidden patterns + live negative twins (#740 round 3).
 *
 * Order-sensitive: binding the configured FE port can collide with a local
 * `npm run dev`. Tests resolve the port from env (no hardcoded 5173).
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

const killTreePath = path.join(repoRoot, "scripts/lib/kill-pid-tree.sh");
const gatePath = path.join(repoRoot, "scripts/verify-ci-shell-gate.sh");

/** Broad kill patterns that must not appear in cleanup implementations. */
const FORBIDDEN_KILL_PATTERNS = [
  /\bpkill\b/,
  /\bkillall\b/,
  /\bfuser\b/,
  /\blsof\b/,
  /taskkill[^\n]*\/IM/i, // Windows kill-by-image-name
  // Intentionally not matching `taskkill //F //T //PID` (accepted PID-scoped path).
  /kill\s+-9\s+\$\(/, // kill $(something that finds a pid)
  /netstat[^\n]*\|\s*(grep|findstr)/i,
];

const children: Array<{ kill: () => void; pid?: number }> = [];

afterEach(() => {
  while (children.length > 0) {
    const c = children.pop();
    try {
      c?.kill();
    } catch {
      /* ignore */
    }
  }
});

function pathToFileUrl(p: string): string {
  return pathToFileURL(p).href;
}

/**
 * Configured FE/dev port from env only (G-007). Returns null if unset/unparseable.
 */
function resolveConfiguredDevPort(
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const raw = env.CYPRESS_SWA_URL || env.VITE_DEV_SERVER_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.port) return Number(u.port);
    } catch {
      /* fall through */
    }
  }
  if (env.PORT && /^\d+$/.test(env.PORT)) return Number(env.PORT);
  return null;
}

function spawnDetachedListener(
  port: number,
): Promise<{ pid: number; kill: () => void }> {
  const code = `
const net = require("net");
const s = net.createServer();
s.listen(${port}, "127.0.0.1", () => {
  process.stdout.write("ready\\n");
});
setInterval(() => {}, 1 << 30);
`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      windowsHide: true,
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        reject(new Error(`listener on port ${port} did not become ready`));
      }
    }, 10_000);
    child.stdout?.on("data", (buf) => {
      if (String(buf).includes("ready") && !settled) {
        settled = true;
        clearTimeout(timer);
        if (!child.pid) {
          reject(new Error("listener spawned without pid"));
          return;
        }
        resolve({
          pid: child.pid,
          kill: () => {
            try {
              process.kill(child.pid!, "SIGTERM");
            } catch {
              /* ignore */
            }
            try {
              child.kill();
            } catch {
              /* ignore */
            }
          },
        });
      }
    });
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`listener exited early code=${code}`));
      }
    });
  });
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stripShellComments(src: string): string {
  return src
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("#")) return "";
      const hash = line.indexOf("#");
      return hash >= 0 ? line.slice(0, hash) : line;
    })
    .join("\n");
}

describe("cleanup scope static guards (#740 round 3)", () => {
  it("forbids broad kill patterns; tracks a PID", () => {
    const killSrc = readFileSync(killTreePath, "utf8");
    const gateSrc = readFileSync(gatePath, "utf8");
    // Comments may name anti-patterns (e.g. "pkill -P is one level"); check code only.
    const combined = `${stripShellComments(killSrc)}\n${stripShellComments(gateSrc)}`;

    for (const re of FORBIDDEN_KILL_PATTERNS) {
      expect(combined, `forbidden pattern ${re}`).not.toMatch(re);
    }

    // Positive: cleanup references a tracked PID / kill_pid_tree handle.
    expect(gateSrc).toMatch(/DEV_PID/);
    expect(gateSrc).toMatch(/kill_pid_tree/);
    expect(killSrc).toMatch(/kill_pid_tree/);
    // PID-scoped Windows path is allowed and expected.
    expect(killSrc).toMatch(/taskkill[^\n]*\/\/PID/);
  });
});

describe("cleanup scope live controls (#740 round 3)", () => {
  it("Test A: untracked listener on configured port survives no-op cleanup", async () => {
    const port = resolveConfiguredDevPort();
    if (port === null) {
      // No configured port in env — cannot bind "the" dev port without a literal.
      return;
    }

    const invoke = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/invoke-kill-pid-tree.mjs"))
    );

    let listener: { pid: number; kill: () => void } | null = null;
    try {
      listener = await spawnDetachedListener(port);
      children.push(listener);

      // Runner has started no tracked PID — correct cleanup is a no-op.
      const { code, output } = await invoke.invokeKillPidTree("", {
        env: process.env,
      });
      expect(code, output).toBe(0);
      expect(pidAlive(listener.pid), "untracked listener must survive").toBe(
        true,
      );
    } finally {
      listener?.kill();
    }
  });

  it("Test C: unrelated node on another port survives a real tracked cleanup", async () => {
    const invoke = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/invoke-kill-pid-tree.mjs"))
    );

    // Ephemeral port for the control process (not the configured FE port).
    const controlServer = createServer();
    await new Promise<void>((resolve, reject) => {
      controlServer.once("error", reject);
      controlServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = controlServer.address();
    if (!addr || typeof addr === "string") {
      controlServer.close();
      throw new Error("failed to bind control port");
    }
    const controlPort = addr.port;
    controlServer.close();

    const control = await spawnDetachedListener(controlPort);
    children.push(control);

    // Tracked tree: a short-lived node child we will kill via kill_pid_tree.
    const trackedCode = `
const http = require("http");
const s = http.createServer((_q, r) => { r.end("ok"); });
s.listen(0, "127.0.0.1", () => process.stdout.write("ready\\n"));
setInterval(() => {}, 1 << 30);
`;
    const tracked = spawn(process.execPath, ["-e", trackedCode], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("tracked not ready")),
        10_000,
      );
      tracked.stdout?.on("data", (b) => {
        if (String(b).includes("ready")) {
          clearTimeout(t);
          resolve();
        }
      });
      tracked.on("error", reject);
    });
    if (!tracked.pid) throw new Error("tracked missing pid");

    const { code, output } = await invoke.invokeKillPidTree(tracked.pid, {
      env: process.env,
    });
    expect(code, output).toBe(0);

    // Give the OS a beat to reap.
    await new Promise((r) => setTimeout(r, 500));
    expect(pidAlive(tracked.pid), "tracked process should be dead").toBe(false);
    expect(pidAlive(control.pid), "unrelated control must survive").toBe(true);

    control.kill();
  });
});
