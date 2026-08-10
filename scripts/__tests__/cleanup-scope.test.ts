/* @vitest-environment node */
/**
 * Cleanup scope: static forbidden patterns + live negative twins (#740 round 3).
 *
 * Production path (G-205): verify-parity.mjs CI-23 → `npm run verify:ci-gate`
 * → verify-ci-shell-gate.sh → scripts/lib/kill-pid-tree.sh. Tests invoke
 * kill_pid_tree via invoke-kill-pid-tree.mjs; static asserts keep the production
 * wiring from drifting.
 *
 * Order-sensitive if run in parallel with a local `npm run dev` on the same
 * ephemeral port (unlikely). No ambient .env port dependency.
 *
 * Rule: no test may conditional-early-return into a pass. Missing preconditions
 * must fail or be an explicit runner-counted skip — never a silent green.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
// BB_BASH / PATH only — Test A must not depend on CYPRESS_SWA_URL for its port.
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

const killTreePath = path.join(repoRoot, "scripts/lib/kill-pid-tree.sh");
const invokePath = path.join(repoRoot, "scripts/lib/invoke-kill-pid-tree.mjs");
const parityPath = path.join(repoRoot, "scripts/verify-parity.mjs");
const gatePath = path.join(repoRoot, "scripts/verify-ci-shell-gate.sh");
const packageJsonPath = path.join(repoRoot, "package.json");

/**
 * Broad kill patterns that must not appear in cleanup implementations.
 * Accepted Windows form: `taskkill //F //T //PID <pid>` (/F = force, not scope).
 * `\/IM\b` also matches the MSYS `//IM` spelling.
 */
const FORBIDDEN_KILL_PATTERNS = [
  /\bpkill\b/,
  /\bkillall\b/,
  /\bfuser\b/,
  /\blsof\b/,
  /taskkill[^\n]*\/IM\b/i, // kill by image name (every node.exe)
  /taskkill[^\n]*\/FI\b/i, // kill by filter (e.g. IMAGENAME eq node.exe)
  /\bwmic\b[^\n]*process[^\n]*\bdelete\b/i,
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

/** Allocate an ephemeral free port (hermetic — no .env / CYPRESS_SWA_URL). */
async function allocateEphemeralPort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = probe.address();
  if (!addr || typeof addr === "string") {
    probe.close();
    throw new Error("failed to allocate ephemeral port");
  }
  const port = addr.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

describe("cleanup scope static guards (#740 round 3)", () => {
  it("production path still reaches kill-pid-tree; no broad kill patterns", () => {
    const killSrc = readFileSync(killTreePath, "utf8");
    const invokeSrc = readFileSync(invokePath, "utf8");
    const paritySrc = readFileSync(parityPath, "utf8");
    const gateSrc = readFileSync(gatePath, "utf8");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    // G-205: parity must still invoke the CI shell gate, which sources kill-pid-tree.
    // (Cleanup is not inline in verify-parity.mjs — §9 keeps the gate untouched.)
    expect(paritySrc).toMatch(/verify:ci-gate/);
    expect(pkg.scripts?.["verify:ci-gate"] ?? "").toMatch(
      /verify-ci-shell-gate\.sh/,
    );
    expect(gateSrc).toMatch(/kill-pid-tree\.sh/);
    expect(gateSrc).toMatch(/kill_pid_tree/);
    expect(gateSrc).toMatch(/DEV_PID/);
    expect(invokeSrc).toMatch(/kill-pid-tree\.sh/);
    expect(killSrc).toMatch(/kill_pid_tree/);
    // Accepted Windows form: taskkill //F //T //PID <pid> (/F = force, scoped by PID).
    expect(killSrc).toMatch(/taskkill[^\n]*\/\/PID/);

    // Forbidden patterns over all three cleanup-related files (plus the gate).
    // Comments may name anti-patterns; check code only.
    const scanned: Array<[string, string]> = [
      ["kill-pid-tree.sh", stripShellComments(killSrc)],
      ["verify-parity.mjs", paritySrc],
      ["invoke-kill-pid-tree.mjs", invokeSrc],
      ["verify-ci-shell-gate.sh", stripShellComments(gateSrc)],
    ];
    for (const [label, src] of scanned) {
      for (const re of FORBIDDEN_KILL_PATTERNS) {
        expect(src, `${label} forbidden ${re}`).not.toMatch(re);
      }
    }
  });
});

describe("cleanup scope live controls (#740 round 3)", () => {
  it("Test A: untracked listener survives no-op cleanup (hermetic port)", async () => {
    const port = await allocateEphemeralPort();
    const invoke = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/invoke-kill-pid-tree.mjs"))
    );

    let listener: { pid: number; kill: () => void } | null = null;
    try {
      listener = await spawnDetachedListener(port);
      children.push(listener);

      // No tracked child — correct cleanup is a no-op. Port env set so any
      // future port-sweep keyed off the runner's FE URL would hit *this* listener.
      const { code, output } = await invoke.invokeKillPidTree("", {
        env: {
          ...process.env,
          CYPRESS_SWA_URL: `http://127.0.0.1:${port}`,
        },
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

    const controlPort = await allocateEphemeralPort();
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
