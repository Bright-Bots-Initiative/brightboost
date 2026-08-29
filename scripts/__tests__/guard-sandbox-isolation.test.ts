/* @vitest-environment node */
/**
 * #815 — the two remaining sabotage guards must never write the caller's
 * checkout.
 *
 * CI-25 (`verify-type-program-membership.mjs`) created
 * `src/test/__type_guard_sabotage__.ts` in the real tree; CI-27
 * (`verify-storybook-empty-suite.mjs`) rewrote the TRACKED file
 * `.storybook/main.ts`. Both undid it afterwards, which is exactly the failure
 * mode #801/#814 already fixed for the shell gate: a `finally` (or a signal
 * handler) does not run on SIGKILL, and both are reachable from `npm run verify`
 * / `.husky/pre-push`, so a hard kill stranded damage in the developer's tree.
 *
 * "Clean afterwards" is therefore not the property under test. These tests prove
 * the checkout is untouched WHILE the sabotage is live, and that killing the
 * guard at that exact moment leaves damage only inside the disposable sandbox.
 *
 * The mid-run observation point is a barrier, never a sleep: in-process tests
 * inject the probe the guard calls with the sabotage already written (the guard
 * is blocked inside the callback), and the out-of-process tests use
 * fixtures/guard-barrier-runner.mjs, which announces on stdout and then blocks
 * on a socket until this test releases or kills it.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  rmSync,
  watch,
  type FSWatcher,
} from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const runnerPath = path.join(__dirname, "fixtures", "guard-barrier-runner.mjs");

/** The exact production targets #815 observed being mutated. */
const TYPE_TARGET_REL = "src/test/__type_guard_sabotage__.ts";
const SB_TARGET_REL = ".storybook/main.ts";
const typeTargetAbs = path.join(repoRoot, TYPE_TARGET_REL);
const sbTargetAbs = path.join(repoRoot, SB_TARGET_REL);

const typeGuardSrc = path.join(
  repoRoot,
  "scripts/verify-type-program-membership.mjs",
);
const storybookGuardSrc = path.join(
  repoRoot,
  "scripts/verify-storybook-empty-suite.mjs",
);

const scratch: string[] = [];
const sessions: BarrierSession[] = [];

afterEach(() => {
  while (sessions.length > 0) sessions.pop()?.dispose();
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// ── checkout state ──────────────────────────────────────────────────────────

function git(args: string[]): string {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return (result.stdout ?? "").trim();
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(abs: string): string | null {
  return existsSync(abs) ? digest(readFileSync(abs, "utf8")) : null;
}

interface RepoState {
  head: string;
  ref: string;
  status: string;
  /** Whole index (mode + blob + stage for every tracked path). */
  index: string;
  typeProbeOnDisk: string | null;
  typeProbeIndexed: string;
  storybookMainOnDisk: string | null;
  storybookMainIndexed: string;
}

function repoState(): RepoState {
  return {
    head: git(["rev-parse", "HEAD"]),
    ref: git(["symbolic-ref", "HEAD"]),
    status: git(["status", "--porcelain"]),
    index: digest(git(["ls-files", "-s"])),
    typeProbeOnDisk: hashFile(typeTargetAbs),
    typeProbeIndexed: git(["ls-files", "-s", "--", TYPE_TARGET_REL]),
    storybookMainOnDisk: hashFile(sbTargetAbs),
    storybookMainIndexed: git(["ls-files", "-s", "--", SB_TARGET_REL]),
  };
}

/**
 * Event-driven tripwire (no polling): fails the surrounding test if either
 * production target is created or its content changes at any point during a run.
 * This is the detector that is red against the pre-#815 scripts even when they
 * expose no injection point at all.
 */
function armTripwire(): { events: string[]; close: () => void } {
  const events: string[] = [];
  const watchers: FSWatcher[] = [];
  const sbPristine = hashFile(sbTargetAbs);

  const watchDir = (dir: string, onEvent: (name: string) => void) => {
    if (!existsSync(dir)) return;
    const watcher = watch(dir, (_type, filename) => {
      if (filename) onEvent(String(filename));
    });
    watcher.on("error", () => {
      /* watcher loss must not crash the test */
    });
    watchers.push(watcher);
  };

  watchDir(path.dirname(typeTargetAbs), (name) => {
    if (name === path.basename(typeTargetAbs) && existsSync(typeTargetAbs)) {
      events.push(`created ${TYPE_TARGET_REL}`);
    }
  });
  watchDir(path.dirname(sbTargetAbs), (name) => {
    if (
      name === path.basename(sbTargetAbs) &&
      hashFile(sbTargetAbs) !== sbPristine
    ) {
      events.push(`modified ${SB_TARGET_REL}`);
    }
  });

  return {
    events,
    close: () => {
      for (const watcher of watchers) watcher.close();
    },
  };
}

// ── guard modules and synthetic probes ──────────────────────────────────────

async function loadTypeGuard() {
  return import(pathToFileURL(typeGuardSrc).href);
}

async function loadStorybookGuard() {
  return import(pathToFileURL(storybookGuardSrc).href);
}

async function loadSandboxLib() {
  return import(
    pathToFileURL(path.join(repoRoot, "scripts/lib/guard-sandbox.mjs")).href
  );
}

/** `tsc --listFiles` output in which every manifest guard file is present. */
function healthyListing(): string {
  const manifest = JSON.parse(
    readFileSync(
      path.join(repoRoot, "scripts/type-guard-manifest.json"),
      "utf8",
    ),
  ) as { guardFiles: string[] };
  return manifest.guardFiles
    .map((rel) => `${repoRoot.replace(/\\/g, "/")}/${rel}`)
    .join("\n");
}

function listingWithProbe(): string {
  return `${healthyListing()}\n${repoRoot.replace(/\\/g, "/")}/${TYPE_TARGET_REL}`;
}

function syntheticProbe(count: number) {
  return {
    projectNotFound: false,
    warningPresent: false,
    count,
    parseError: false,
    browserMissing: false,
    stderr: "",
    stdout: "",
    outputFile: "",
    tmpDir: "",
  };
}

/** Wrap a real sandbox so cleanup fails, without changing anything else. */
function withFailingDispose<T extends { dispose: () => void; root: string }>(
  sandbox: T,
): T {
  scratch.push(sandbox.root);
  return {
    ...sandbox,
    dispose: () => {
      throw new Error("simulated sandbox cleanup failure");
    },
  };
}

// ── out-of-process barrier ──────────────────────────────────────────────────

interface BarrierSession {
  child: ChildProcess;
  active: { sandboxRoot: string; sandboxTarget: string };
  release: () => void;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  dispose: () => void;
}

function startBarrier(
  guard: "type" | "storybook",
  timeoutMs = 60_000,
): Promise<BarrierSession> {
  return new Promise((resolve, reject) => {
    const sockets: Socket[] = [];
    let released = false;
    // The runner announces on stdout and only then connects, so a release can
    // arrive before the socket does: remember it and release on connect.
    const server: Server = createServer((socket) => {
      socket.on("error", () => {
        /* the peer may be SIGKILLed under us */
      });
      sockets.push(socket);
      if (released) socket.write("go");
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("failed to allocate a release port"));
        return;
      }
      const child = spawn(
        process.execPath,
        [runnerPath, guard, String(address.port)],
        { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
      );

      let stdout = "";
      let settled = false;
      const exited = new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>((resolveExit) => {
        child.on("exit", (code, signal) => resolveExit({ code, signal }));
      });

      const dispose = () => {
        for (const socket of sockets) socket.destroy();
        server.close();
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        dispose();
        reject(
          new Error(
            `${guard} guard never reached its sabotage barrier within ${timeoutMs}ms. ` +
              `stdout so far:\n${stdout}`,
          ),
        );
      }, timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += String(chunk);
        for (const line of stdout.split("\n")) {
          if (!line.trim() || settled) continue;
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(line);
          } catch {
            continue;
          }
          if (parsed.event === "sabotage-active") {
            settled = true;
            clearTimeout(timer);
            scratch.push(String(parsed.sandboxRoot));
            resolve({
              child,
              active: {
                sandboxRoot: String(parsed.sandboxRoot),
                sandboxTarget: String(parsed.sandboxTarget),
              },
              release: () => {
                released = true;
                for (const socket of sockets) socket.write("go");
              },
              exited,
              dispose,
            });
          }
        }
      });

      child.on("exit", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        dispose();
        reject(
          new Error(
            `${guard} guard exited before announcing its sabotage barrier. stdout:\n${stdout}`,
          ),
        );
      });
    });
  });
}

/**
 * Run a guard CLI exactly as CI and `.husky/pre-push` do — no seams, no
 * injection. Async spawn on purpose: the guards block on `spawnSync` internally,
 * and blocking the Vitest worker trips birpc on long runs (see ciWiring W-8).
 */
function runGuardCli(
  scriptRel: string,
  timeoutMs: number,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptRel], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      output += `\nspawn timeout after ${timeoutMs}ms\n`;
      resolve({ status: 124, output });
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => (output += String(chunk)));
    child.stderr?.on("data", (chunk: Buffer) => (output += String(chunk)));
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: 2, output: `${output}\n${err.message}` });
    });
  });
}

// ── sandbox library ─────────────────────────────────────────────────────────

describe("#815 guard sandbox — targets resolve inside it or are refused", () => {
  it("refuses escapes, absolute paths and linked-directory traversal", async () => {
    const { createGuardSandbox, SandboxEscapeError } = await loadSandboxLib();
    const sandbox = createGuardSandbox({
      repoRoot,
      prefix: "bb815-unit-",
      copyDirs: [".storybook"],
      linkDirs: ["node_modules"],
      copyRootFiles: false,
    });
    scratch.push(sandbox.root);
    try {
      expect(sandbox.resolve(SB_TARGET_REL)).toBe(
        path.join(sandbox.root, SB_TARGET_REL),
      );
      for (const escape of [
        "../outside.ts",
        "../../outside.ts",
        `../${path.basename(repoRoot)}/${SB_TARGET_REL}`,
        path.join(repoRoot, SB_TARGET_REL),
        "node_modules/typescript/package.json",
        "",
      ]) {
        expect(
          () => sandbox.resolve(escape),
          `resolve(${JSON.stringify(escape)}) must refuse`,
        ).toThrow(SandboxEscapeError);
      }
    } finally {
      sandbox.dispose();
    }
  });

  it("refuses a sandbox root that is not disjoint from the repository", async () => {
    const { createGuardSandbox, GuardSandboxError } = await loadSandboxLib();
    expect(() =>
      createGuardSandbox({
        repoRoot,
        prefix: "bb815-nested-",
        copyDirs: [],
        linkDirs: [],
        copyRootFiles: false,
        env: { BB_GUARD_SANDBOX_BASE: repoRoot },
      }),
    ).toThrow(GuardSandboxError);
    expect(git(["status", "--porcelain"])).not.toMatch(/bb815-nested-/);
  });

  it("keeps the sandbox path space-ness aligned with the checkout", async () => {
    const { resolveSandboxBase } = await loadSandboxLib();
    const spaced = resolveSandboxBase({
      repoRoot: "/home/some user/brightboost",
      matchPathSpace: true,
      env: {},
    });
    const plain = resolveSandboxBase({
      repoRoot: "/home/dev/brightboost",
      matchPathSpace: true,
      env: {},
    });
    // A spaced checkout must not silently become a space-free probe path: the
    // Storybook project is registered per path space-ness (#707).
    expect(spaced.spacedSegment || spaced.base.includes(" ")).toBe(true);
    expect(plain.spacedSegment).toBe(false);
  });
});

// ── CI-25 ───────────────────────────────────────────────────────────────────

describe("#815 CI-25 verify-type-program-membership", () => {
  it("writes the probe into the sandbox and not the checkout, mid-run", async () => {
    const mod = await loadTypeGuard();
    const before = repoState();
    const tripwire = armTripwire();
    const seen: Array<{
      sandboxRoot: string;
      probeInSandbox: boolean;
      probeInCheckout: boolean;
      checkoutState: RepoState;
    }> = [];

    let code: number;
    try {
      code = mod.runTypeProgramMembership({
        listFiles: (root: string) => {
          if (path.resolve(root) === repoRoot) return healthyListing();
          // The guard is blocked here with the sabotage already written.
          seen.push({
            sandboxRoot: root,
            probeInSandbox: existsSync(path.join(root, TYPE_TARGET_REL)),
            probeInCheckout: existsSync(typeTargetAbs),
            checkoutState: repoState(),
          });
          return healthyListing();
        },
      });
    } finally {
      tripwire.close();
    }

    expect(code).toBe(0);
    expect(seen, "phase 2 must run against a sandbox root").toHaveLength(1);
    expect(path.resolve(seen[0].sandboxRoot)).not.toBe(repoRoot);
    expect(seen[0].probeInSandbox, "sabotage must really happen").toBe(true);
    expect(
      seen[0].probeInCheckout,
      `${TYPE_TARGET_REL} existed in the checkout while sabotage was live`,
    ).toBe(false);
    expect(seen[0].checkoutState).toEqual(before);
    expect(tripwire.events).toEqual([]);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("exits 1 when the excluded probe is inside the program (toothless)", async () => {
    const mod = await loadTypeGuard();
    const before = repoState();
    const code = mod.runTypeProgramMembership({
      listFiles: (root: string) =>
        path.resolve(root) === repoRoot ? healthyListing() : listingWithProbe(),
    });
    expect(code).toBe(1);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("still exits 1 when a toothless run also fails to clean up", async () => {
    const mod = await loadTypeGuard();
    const { createGuardSandbox } = await loadSandboxLib();
    const before = repoState();
    const code = mod.runTypeProgramMembership({
      listFiles: (root: string) =>
        path.resolve(root) === repoRoot ? healthyListing() : listingWithProbe(),
      createSandbox: (opts: { repoRoot: string }) =>
        withFailingDispose(
          createGuardSandbox({
            repoRoot: opts.repoRoot,
            prefix: "bb815-type-",
            copyDirs: ["src", "shared"],
            linkDirs: ["node_modules"],
          }),
        ),
    });
    expect(code, "cleanup must never soften a red verdict").toBe(1);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("keeps exit 0 when only cleanup fails", async () => {
    const mod = await loadTypeGuard();
    const { createGuardSandbox } = await loadSandboxLib();
    const before = repoState();
    const code = mod.runTypeProgramMembership({
      listFiles: () => healthyListing(),
      createSandbox: (opts: { repoRoot: string }) =>
        withFailingDispose(
          createGuardSandbox({
            repoRoot: opts.repoRoot,
            prefix: "bb815-type-",
            copyDirs: ["src", "shared"],
            linkDirs: ["node_modules"],
          }),
        ),
    });
    expect(code, "teardown must not decide the verdict").toBe(0);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("refuses to run (exit 2) when the target resolves outside the sandbox", async () => {
    const mod = await loadTypeGuard();
    const { SandboxEscapeError } = await loadSandboxLib();
    const before = repoState();
    let disposed = false;
    const code = mod.runTypeProgramMembership({
      listFiles: () => healthyListing(),
      createSandbox: () => ({
        root: path.join(repoRoot, "..", "not-a-sandbox"),
        base: "",
        linkDirs: [],
        resolve: (rel: string) => {
          throw new SandboxEscapeError(
            `sabotage target ${rel} resolves outside the sandbox`,
          );
        },
        dispose: () => {
          disposed = true;
        },
      }),
    });
    expect(code, "a refusal is could-not-run, never a pass").toBe(2);
    expect(disposed).toBe(true);
    expect(existsSync(typeTargetAbs)).toBe(false);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("leaves the checkout pristine when SIGKILLed mid-sabotage", async () => {
    const before = repoState();
    const tripwire = armTripwire();
    const session = await startBarrier("type");
    sessions.push(session);
    try {
      // Sabotage is live and the guard is blocked at the barrier.
      expect(existsSync(session.active.sandboxTarget)).toBe(true);
      expect(existsSync(typeTargetAbs)).toBe(false);
      expect(repoState()).toEqual(before);

      session.child.kill("SIGKILL");
      const result = await session.exited;
      expect(result.signal ?? result.code).not.toBe(0);

      // Untrappable kill: no cleanup ran, so the sabotage is still on disk —
      // and it is on disk only inside the sandbox.
      expect(existsSync(session.active.sandboxTarget)).toBe(true);
      expect(existsSync(typeTargetAbs)).toBe(false);
      expect(repoState()).toEqual(before);
      expect(tripwire.events).toEqual([]);
    } finally {
      tripwire.close();
    }
  }, 60_000);

  it("leaves the checkout pristine when terminated at timeout (SIGTERM)", async () => {
    const before = repoState();
    const session = await startBarrier("type");
    sessions.push(session);
    session.child.kill("SIGTERM");
    await session.exited;
    expect(existsSync(typeTargetAbs)).toBe(false);
    expect(repoState()).toEqual(before);
  }, 60_000);
});

// ── CI-27 ───────────────────────────────────────────────────────────────────

describe("#815 CI-27 verify-storybook-empty-suite", () => {
  it("patches the sandbox copy and not the tracked file, mid-run", async () => {
    const mod = await loadStorybookGuard();
    const before = repoState();
    const tripwire = armTripwire();
    const seen: Array<{
      cwd: string;
      sandboxPatched: boolean;
      checkoutHash: string | null;
      checkoutState: RepoState;
    }> = [];
    let calls = 0;

    let code: number;
    try {
      code = mod.runStorybookEmptySuiteGuard(
        {},
        {
          probe: (_env: NodeJS.ProcessEnv, cwd: string) => {
            calls += 1;
            if (calls === 1) return syntheticProbe(15);
            const sandboxCopy = readFileSync(
              path.join(cwd, SB_TARGET_REL),
              "utf8",
            );
            seen.push({
              cwd,
              sandboxPatched: sandboxCopy.includes("__bb749_no_such_story__"),
              checkoutHash: hashFile(sbTargetAbs),
              checkoutState: repoState(),
            });
            return syntheticProbe(0);
          },
        },
      );
    } finally {
      tripwire.close();
    }

    expect(code).toBe(0);
    expect(calls, "both phases must run").toBe(2);
    expect(seen).toHaveLength(1);
    expect(path.resolve(seen[0].cwd)).not.toBe(repoRoot);
    expect(seen[0].sandboxPatched, "sabotage must really happen").toBe(true);
    expect(
      seen[0].checkoutHash,
      `${SB_TARGET_REL} changed in the checkout while sabotage was live`,
    ).toBe(before.storybookMainOnDisk);
    expect(seen[0].checkoutState).toEqual(before);
    expect(tripwire.events).toEqual([]);
    expect(repoState()).toEqual(before);
  }, 120_000);

  it("exits non-zero for a toothless sabotage, with and without cleanup failure", async () => {
    const mod = await loadStorybookGuard();
    const { createGuardSandbox } = await loadSandboxLib();
    const before = repoState();

    const run = (sabotagedCount: number, breakCleanup: boolean) => {
      let calls = 0;
      return mod.runStorybookEmptySuiteGuard(
        {},
        {
          probe: () => {
            calls += 1;
            return syntheticProbe(calls === 1 ? 15 : sabotagedCount);
          },
          createSandbox: (opts: { repoRoot: string }) => {
            const sandbox = createGuardSandbox({
              repoRoot: opts.repoRoot,
              prefix: "bb815-sb-",
              copyDirs: ["src", "shared", ".storybook"],
              linkDirs: ["node_modules", "public"],
              matchPathSpace: true,
            });
            return breakCleanup ? withFailingDispose(sandbox) : sandbox;
          },
        },
      );
    };

    // Sabotage did not empty the suite → property false (1).
    expect(run(7, false)).toBe(1);
    expect(run(7, true), "cleanup must not soften a red verdict").toBe(1);
    // Sabotage was a no-op → cannot check (2). Still non-zero either way.
    expect(run(15, false)).toBe(2);
    expect(run(15, true)).toBe(2);
    expect(repoState()).toEqual(before);
  }, 180_000);

  it("refuses to run (exit 2) when the target resolves outside the sandbox", async () => {
    const mod = await loadStorybookGuard();
    const { SandboxEscapeError } = await loadSandboxLib();
    const before = repoState();
    let probes = 0;
    const code = mod.runStorybookEmptySuiteGuard(
      {},
      {
        probe: () => {
          probes += 1;
          return syntheticProbe(15);
        },
        createSandbox: () => ({
          root: path.join(repoRoot, "..", "not-a-sandbox"),
          base: "",
          linkDirs: [],
          resolve: (rel: string) => {
            throw new SandboxEscapeError(
              `sabotage target ${rel} resolves outside the sandbox`,
            );
          },
          dispose: () => {},
        }),
      },
    );
    expect(code).toBe(2);
    expect(probes, "refuse before spending a probe run").toBe(0);
    expect(repoState()).toEqual(before);
  }, 60_000);

  it("leaves the tracked file pristine when SIGKILLed mid-sabotage", async () => {
    const before = repoState();
    const tripwire = armTripwire();
    const session = await startBarrier("storybook");
    sessions.push(session);
    try {
      const sandboxCopy = readFileSync(session.active.sandboxTarget, "utf8");
      expect(sandboxCopy).toContain("__bb749_no_such_story__");
      expect(hashFile(sbTargetAbs)).toBe(before.storybookMainOnDisk);
      expect(repoState()).toEqual(before);

      session.child.kill("SIGKILL");
      const result = await session.exited;
      expect(result.signal ?? result.code).not.toBe(0);

      expect(readFileSync(session.active.sandboxTarget, "utf8")).toContain(
        "__bb749_no_such_story__",
      );
      expect(hashFile(sbTargetAbs)).toBe(before.storybookMainOnDisk);
      expect(repoState()).toEqual(before);
      expect(tripwire.events).toEqual([]);
    } finally {
      tripwire.close();
    }
  }, 120_000);

  it("leaves the tracked file pristine when terminated at timeout (SIGTERM)", async () => {
    const before = repoState();
    const session = await startBarrier("storybook");
    sessions.push(session);
    session.child.kill("SIGTERM");
    await session.exited;
    expect(hashFile(sbTargetAbs)).toBe(before.storybookMainOnDisk);
    expect(repoState()).toEqual(before);
  }, 120_000);

  it("releases the barrier and finishes green when nothing kills it", async () => {
    const before = repoState();
    const session = await startBarrier("storybook");
    sessions.push(session);
    session.release();
    const result = await session.exited;
    expect(result.code).toBe(0);
    expect(repoState()).toEqual(before);
  }, 120_000);
});

// ── whole-guard runs, no seams (the shape CI and pre-push actually invoke) ──

describe("#815 unmodified guard invocations", () => {
  it("CI-25 CLI run never touches the checkout", async () => {
    const before = repoState();
    const tripwire = armTripwire();
    let result: { status: number | null; output: string };
    try {
      result = await runGuardCli(
        "scripts/verify-type-program-membership.mjs",
        180_000,
      );
    } finally {
      tripwire.close();
    }
    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(
      /PASS: type-program membership guard has teeth/,
    );
    expect(
      tripwire.events,
      `the guard wrote the checkout during its run: ${tripwire.events.join(", ")}`,
    ).toEqual([]);
    expect(repoState()).toEqual(before);
  }, 180_000);

  it("CI-27 CLI run never touches the tracked .storybook/main.ts", async () => {
    const before = repoState();
    const tripwire = armTripwire();
    let result: { status: number | null; output: string };
    try {
      result = await runGuardCli(
        "scripts/verify-storybook-empty-suite.mjs",
        300_000,
      );
    } finally {
      tripwire.close();
    }
    // Exit 2 is legitimate here (no playwright chromium locally); exit 1 would
    // mean the property is actually false, which is CI-27's own job to report.
    expect(result.status, result.output).not.toBe(1);
    expect(
      tripwire.events,
      `the guard wrote the checkout during its run: ${tripwire.events.join(", ")}`,
    ).toEqual([]);
    expect(repoState()).toEqual(before);
  }, 300_000);
});

// ── static wiring (keeps the structural fix from drifting back) ─────────────

describe("#815 static wiring", () => {
  it("both guards resolve their sabotage target through the sandbox", () => {
    const typeSrc = readFileSync(typeGuardSrc, "utf8");
    const sbSrc = readFileSync(storybookGuardSrc, "utf8");

    for (const [label, src] of [
      ["verify-type-program-membership.mjs", typeSrc],
      ["verify-storybook-empty-suite.mjs", sbSrc],
    ] as const) {
      expect(src, `${label} must build a sandbox`).toMatch(
        /from "\.\/lib\/guard-sandbox\.mjs"/,
      );
      expect(src, `${label} must resolve targets through it`).toMatch(
        /sandbox\.resolve\(/,
      );
    }

    expect(typeSrc).toMatch(/writeFileSync\(\s*\n?\s*sabotageAbs/);
    expect(sbSrc).toMatch(/writeFileSync\(sabotageTarget/);
    // No write may be aimed at a REPO_ROOT-derived path again.
    expect(typeSrc).not.toMatch(/writeFileSync\([^)]*REPO_ROOT/);
    expect(sbSrc).not.toMatch(/writeFileSync\(\s*STORYBOOK_MAIN\b/);
    // Restoring the checkout is no longer the safety mechanism.
    expect(sbSrc).not.toMatch(/installSignalRestore/);
  });
});
