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
 *
 * #822 review added two more ways the sandbox could reach outside itself, both
 * covered below against disposable fixtures:
 *
 *   A. blanket root copying pulled a LINKED WORKTREE's `.git` — a regular
 *      `gitdir:` file naming the real repository — plus any untracked `.env*` /
 *      `.npmrc`, into a tree explicitly allowed to survive SIGKILL;
 *   B. containment started at the target's PARENT, so a symlink at the exact
 *      target passed: `cpSync` preserves such a link from the caller and the
 *      write then followed it out of the sandbox.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  watch,
  writeFileSync,
  type FSWatcher,
} from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import os from "node:os";
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

/**
 * Sandboxes left behind on purpose (SIGKILL cases, simulated cleanup failure)
 * still contain links into the real `node_modules` / `public`. Drop those AS
 * LINKS before any recursive delete, and refuse the delete if one survives —
 * the same rule guard-sandbox.mjs applies to its own cleanup.
 */
function removeSandboxSafely(dir: string): void {
  if (!existsSync(dir)) return;
  for (const rel of ["node_modules", "public"]) {
    const link = path.join(dir, rel);
    if (!existsSync(link)) continue;
    try {
      unlinkSync(link);
    } catch {
      try {
        rmdirSync(link);
      } catch {
        /* checked below */
      }
    }
    if (existsSync(link)) {
      throw new Error(
        `refusing to recursively delete ${dir}: ${link} still links into the checkout`,
      );
    }
  }
  rmSync(dir, { recursive: true, force: true });
}

afterEach(() => {
  while (sessions.length > 0) sessions.pop()?.dispose();
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir) removeSandboxSafely(dir);
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

// ── #822 fixtures: link capability, linked worktrees, external sentinels ────

/**
 * Sizes of the three escape-matrix groups, asserted exactly.
 *
 * Totals derive from these: 21 on a host with neither link type, 22 with hard
 * links, 25 with symlinks, 26 with both. docs/ops/guards.md quotes the same
 * four figures; a change here fails the suite until they agree.
 */
const ESCAPE_GROUP_SIZES = { base: 21, hardLink: 1, symLink: 4 } as const;

const ESCAPE_COUNT_HINT =
  "escape-refusal matrix changed size — update ESCAPE_GROUP_SIZES and the counts in docs/ops/guards.md";

/** Can this host create symlinks at all? Probed once, outside any test. */
const SYMLINKS_AVAILABLE = ((): boolean => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "bb822-linkprobe-"));
  try {
    symlinkSync(
      path.join(dir, "target.txt"),
      path.join(dir, "link.txt"),
      "file",
    );
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
})();

const EXTERNAL_SENTINEL_BODY =
  'const c = { stories: ["../src/**/*.stories.tsx"] };\nexport default c;\n// EXTERNAL SENTINEL — must stay byte-identical\n';

/** The two root files CI-27's sandbox actually needs (mirrors the guard). */
const sbRootFiles = [
  "vite.config.ts",
  "vitest.config.ts",
  "vitest.workspace.ts",
];

/**
 * Plant symlinks inside `dir`. Windows only allows this with Developer Mode or
 * elevation, so report the capability instead of failing the whole suite — the
 * Linux CI runner always has it, and the assertion count says which ran.
 */
function trySymlinks(
  dir: string,
  outsideDir: string,
  sentinel: string,
): { available: boolean; reason?: string } {
  try {
    symlinkSync(sentinel, path.join(dir, "file-link.ts"), "file");
    symlinkSync(
      path.join(outsideDir, "no-such-file.ts"),
      path.join(dir, "dangling.ts"),
      "file",
    );
    symlinkSync(outsideDir, path.join(dir, "dir-link"), "junction");
    return { available: true };
  } catch (err) {
    return { available: false, reason: (err as NodeJS.ErrnoException).code };
  }
}

/** Hard links need no privilege but do need the same volume. */
function tryHardlink(from: string, to: string): boolean {
  try {
    linkSync(from, to);
    return lstatSync(to).nlink > 1;
  } catch {
    return false;
  }
}

interface WorktreeFixture {
  base: string;
  mainRepo: string;
  worktree: string;
  manifestPath: string;
  sentinels: string[];
  dotGitIsRegularFile: boolean;
  state: () => Record<string, string | null>;
}

/**
 * A disposable repository plus a REAL linked worktree (`git worktree add`), in
 * which `.git` is a regular `gitdir:` FILE pointing back at the real repository.
 * That file is what blanket root copying duplicated into a sandbox allowed to
 * outlive SIGKILL (#822 review; the repository-selection class of #787).
 *
 * The worktree root also carries deliberately fake secret sentinels.
 */
function makeLinkedWorktreeFixture(): WorktreeFixture {
  const base = mkdtempSync(path.join(os.tmpdir(), "bb822-wt-"));
  scratch.push(base);
  const mainRepo = path.join(base, "mainrepo");
  const worktree = path.join(base, "linked-wt");
  const run = (args: string[], cwd: string) => {
    const r = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    });
    if (r.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${r.stdout}${r.stderr}`);
    }
    return (r.stdout ?? "").trim();
  };

  mkdirSync(mainRepo, { recursive: true });
  run(["init", "-q", "-b", "main"], mainRepo);
  run(["config", "user.email", "fixture@example.invalid"], mainRepo);
  run(["config", "user.name", "Fixture"], mainRepo);
  run(["config", "core.hooksPath", ""], mainRepo);

  for (const rel of [
    "src/components",
    "src/test",
    "shared",
    ".storybook",
    "public",
    "node_modules",
  ]) {
    mkdirSync(path.join(mainRepo, rel), { recursive: true });
  }
  writeFileSync(
    path.join(mainRepo, "src/components/Demo.stories.tsx"),
    "export default {};\n",
  );
  writeFileSync(path.join(mainRepo, "src/guard-a.ts"), "export {};\n");
  writeFileSync(path.join(mainRepo, "shared/kind.ts"), "export {};\n");
  writeFileSync(
    path.join(mainRepo, ".storybook/main.ts"),
    'const c = { stories: ["../src/**/*.stories.tsx"] };\nexport default c;\n',
  );
  writeFileSync(
    path.join(mainRepo, "package.json"),
    '{ "name": "fx", "private": true }\n',
  );
  writeFileSync(
    path.join(mainRepo, "tsconfig.json"),
    '{ "include": ["src", "shared"] }\n',
  );
  for (const name of sbRootFiles) {
    writeFileSync(path.join(mainRepo, name), "export default {};\n");
  }
  writeFileSync(
    path.join(mainRepo, ".gitignore"),
    "node_modules\n.bb-guard-sandbox-*/\n.env*\n.npmrc\n",
  );
  run(["add", "-A"], mainRepo);
  run(["commit", "-qm", "fixture base"], mainRepo);
  run(["worktree", "add", "-q", "-b", "wt-branch", worktree], mainRepo);

  // Fake values only — these exist to be looked for, never to be a real secret.
  writeFileSync(
    path.join(worktree, ".env.local"),
    "FAKE_API_KEY=not-a-real-secret-0000\n",
  );
  writeFileSync(
    path.join(worktree, ".npmrc"),
    "//registry.example.invalid/:_authToken=FAKE-TOKEN-0000\n",
  );
  writeFileSync(
    path.join(worktree, "unrelated-untracked.txt"),
    "unrelated untracked root file\n",
  );
  mkdirSync(path.join(worktree, "node_modules"), { recursive: true });
  writeFileSync(
    path.join(worktree, "node_modules/marker.txt"),
    "worktree node_modules\n",
  );

  const manifestPath = path.join(base, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ guardFiles: ["src/guard-a.ts"] }),
  );

  const sentinels = [".env.local", ".npmrc", "unrelated-untracked.txt"];
  const wtGit = (args: string[]) =>
    (
      spawnSync("git", args, {
        cwd: worktree,
        encoding: "utf8",
        windowsHide: true,
      }).stdout ?? ""
    ).trim();

  return {
    base,
    mainRepo,
    worktree,
    manifestPath,
    sentinels,
    dotGitIsRegularFile: lstatSync(path.join(worktree, ".git")).isFile(),
    state: () => {
      const snap: Record<string, string | null> = {
        head: wtGit(["rev-parse", "HEAD"]),
        ref: wtGit(["symbolic-ref", "HEAD"]),
        status: wtGit(["status", "--porcelain"]),
        index: digest(wtGit(["ls-files", "-s"])),
      };
      for (const rel of sentinels)
        snap[rel] = hashFile(path.join(worktree, rel));
      return snap;
    },
  };
}

/** Names never allowed in a sandbox built from that fixture. */
const PROHIBITED_IN_SANDBOX = [
  ".git",
  ".env.local",
  ".npmrc",
  "unrelated-untracked.txt",
];

function prohibitedPresentIn(root: string): string[] {
  if (!existsSync(root)) return [];
  const names = new Set(readdirSync(root));
  return PROHIBITED_IN_SANDBOX.filter((n) => names.has(n));
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
  {
    timeoutMs = 60_000,
    checkoutRoot,
    env,
  }: {
    timeoutMs?: number;
    /** Run the guard against a disposable checkout instead of this repository. */
    checkoutRoot?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
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
        [
          runnerPath,
          guard,
          String(address.port),
          ...(checkoutRoot ? [checkoutRoot] : []),
        ],
        {
          cwd: repoRoot,
          env: env ?? process.env,
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
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
  it("refuses escapes, absolute paths, linked-directory traversal and non-regular targets", async () => {
    const { createGuardSandbox, SandboxEscapeError } = await loadSandboxLib();
    const outside = mkdtempSync(path.join(os.tmpdir(), "bb822-outside-"));
    scratch.push(outside);
    const sentinel = path.join(outside, "EXTERNAL_SENTINEL.ts");
    writeFileSync(sentinel, EXTERNAL_SENTINEL_BODY);
    const sentinelBefore = hashFile(sentinel);

    const sandbox = createGuardSandbox({
      repoRoot,
      prefix: "bb815-unit-",
      copyDirs: [".storybook"],
      linkDirs: ["node_modules"],
    });
    scratch.push(sandbox.root);
    try {
      // Hostile entries planted INSIDE the sandbox, the way `cpSync` would carry
      // them in from a caller's checkout.
      const planted = path.join(sandbox.root, "planted");
      mkdirSync(path.join(planted, "a-directory"), { recursive: true });
      const links = trySymlinks(planted, outside, sentinel);
      const hardlinked = tryHardlink(
        sentinel,
        path.join(planted, "hardlink.ts"),
      );

      /**
       * Every input `resolve()` must refuse, named so a failure says which.
       *
       * The inputs are grouped by the host capability they need, and the
       * totals below are computed from these arrays rather than written out
       * in prose — the previous comment claimed "23" when the real figure was
       * 21/22/26 depending on the host, and nothing caught the drift.
       */
      const baseInputs: Array<[string, unknown]> = [
        ["empty string", ""],
        ["whitespace only", "   "],
        ["null", null],
        ["undefined", undefined],
        ["number", 42],
        ["object", {}],
        ["parent escape", "../outside.ts"],
        ["grandparent escape", "../../outside.ts"],
        [
          "sideways into the checkout",
          `../${path.basename(repoRoot)}/${SB_TARGET_REL}`,
        ],
        ["absolute checkout path", path.join(repoRoot, SB_TARGET_REL)],
        ["absolute temp path", path.resolve(os.tmpdir(), "bb822-escape.ts")],
        ["normalising escape", "a/../../outside.ts"],
        ["trailing-slash parent", "../"],
        ["dot", "."],
        ["dot dot", ".."],
        ["the sandbox root itself", "./"],
        ["a linked directory itself", "node_modules"],
        ["through a linked directory", "node_modules/typescript/package.json"],
        ["deep through a linked directory", "node_modules/.bin/anything"],
        ["an existing directory as the target", ".storybook"],
        ["a planted directory as the target", "planted/a-directory"],
      ];
      /** Needs a hard link: same volume, no privilege. */
      const hardLinkInputs: Array<[string, unknown]> = [
        ["a hard-linked target", "planted/hardlink.ts"],
      ];
      /** Needs symlink creation: Developer Mode / root-equivalent on Windows. */
      const symLinkInputs: Array<[string, unknown]> = [
        ["a symlink AT the exact target", "planted/file-link.ts"],
        ["a DANGLING symlink at the target", "planted/dangling.ts"],
        ["a symlinked directory as the target", "planted/dir-link"],
        ["through a symlinked directory", "planted/dir-link/inside.ts"],
      ];

      const matrix: Array<[string, unknown]> = [
        ...baseInputs,
        ...(hardlinked ? hardLinkInputs : []),
        ...(links.available ? symLinkInputs : []),
      ];

      for (const [label, input] of matrix) {
        expect(
          () => sandbox.resolve(input as string),
          `resolve(${JSON.stringify(input)}) — ${label} — must refuse`,
        ).toThrow(SandboxEscapeError);
        expect(
          () => sandbox.write(input as string, "should never be written"),
          `write(${JSON.stringify(input)}) — ${label} — must refuse`,
        ).toThrow(SandboxEscapeError);
      }

      // The matrix must not silently shrink — per group, not just in total, so
      // the four symlink cases cannot vanish behind an unavailable hard link.
      // These sizes are the figures quoted in docs/ops/guards.md; changing a
      // group is meant to fail here until that table is updated too.
      expect(baseInputs.length, ESCAPE_COUNT_HINT).toBe(
        ESCAPE_GROUP_SIZES.base,
      );
      expect(hardLinkInputs.length, ESCAPE_COUNT_HINT).toBe(
        ESCAPE_GROUP_SIZES.hardLink,
      );
      expect(symLinkInputs.length, ESCAPE_COUNT_HINT).toBe(
        ESCAPE_GROUP_SIZES.symLink,
      );
      // …and the assembled matrix is exactly the groups this host can run.
      expect(
        matrix.length,
        `escape-refusal matrix mis-assembled (symlinks=${links.available}, hardlinks=${hardlinked})`,
      ).toBe(
        baseInputs.length +
          (hardlinked ? hardLinkInputs.length : 0) +
          (links.available ? symLinkInputs.length : 0),
      );

      // Nothing outside the sandbox was touched by any refusal.
      expect(hashFile(sentinel)).toBe(sentinelBefore);

      // …and the legitimate targets still work.
      expect(sandbox.resolve(SB_TARGET_REL)).toBe(
        path.join(sandbox.root, SB_TARGET_REL),
      );
      expect(sandbox.write(SB_TARGET_REL, "// patched\n")).toBe(
        path.join(sandbox.root, SB_TARGET_REL),
      );
      expect(readFileSync(path.join(sandbox.root, SB_TARGET_REL), "utf8")).toBe(
        "// patched\n",
      );
      // A target whose directories do not exist yet is created, not refused.
      const fresh = sandbox.write(TYPE_TARGET_REL, "export {};\n");
      expect(fresh).toBe(path.join(sandbox.root, TYPE_TARGET_REL));
      expect(lstatSync(fresh).isFile()).toBe(true);
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
        env: { BB_GUARD_SANDBOX_BASE: repoRoot },
      }),
    ).toThrow(GuardSandboxError);
    expect(git(["status", "--porcelain"])).not.toMatch(/bb815-nested-/);
  });

  it("refuses an in-repository sandbox git can see", async () => {
    const { createGuardSandbox, GuardSandboxError } = await loadSandboxLib();
    // `.bb-guard-sandbox-*` is in .gitignore; this prefix deliberately is not.
    expect(() =>
      createGuardSandbox({
        repoRoot,
        prefix: ".bb-not-ignored-sandbox-",
        location: "repo",
        copyDirs: [],
        linkDirs: [],
      }),
    ).toThrow(GuardSandboxError);
    // The refusal must not leave the rejected directory behind.
    expect(git(["status", "--porcelain"])).not.toMatch(/bb-not-ignored/);
    // A prefix git does ignore is accepted, and stays invisible while it lives.
    const before = git(["status", "--porcelain"]);
    const sandbox = createGuardSandbox({
      repoRoot,
      prefix: ".bb-guard-sandbox-",
      location: "repo",
      copyDirs: [],
      linkDirs: [],
    });
    try {
      expect(existsSync(sandbox.root)).toBe(true);
      expect(path.dirname(sandbox.root)).toBe(repoRoot);
      expect(git(["status", "--porcelain"])).toBe(before);
    } finally {
      sandbox.dispose();
    }
  });

  it("rejects an in-repository prefix that is not dot-prefixed", async () => {
    const { createGuardSandbox, GuardSandboxError } = await loadSandboxLib();
    expect(() =>
      createGuardSandbox({
        repoRoot,
        prefix: "visible-sandbox-",
        location: "repo",
        copyDirs: [],
        linkDirs: [],
      }),
    ).toThrow(GuardSandboxError);
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

// ── #822 A: only allowlisted root config is copied ──────────────────────────

describe("#822 root-file allowlist — a sandbox never copies .git or secrets", () => {
  it("has no broad-copy API left to ask for", async () => {
    const { createGuardSandbox, GuardSandboxError, rootFileRefusal } =
      await loadSandboxLib();
    const shared = {
      repoRoot,
      prefix: "bb822-api-",
      copyDirs: [],
      linkDirs: [],
    };

    // The retired switches must throw, not be quietly ignored.
    for (const retired of [
      { copyRootFiles: true },
      { copyRootFiles: false },
      { excludeRootFiles: ["package.json"] },
    ]) {
      expect(
        () => createGuardSandbox({ ...shared, ...retired }),
        `${Object.keys(retired)[0]} must be refused, not ignored`,
      ).toThrow(GuardSandboxError);
    }
    // …and so must any other unrecognised option, so a typo cannot re-open one.
    expect(() =>
      createGuardSandbox({ ...shared, copyEverything: true }),
    ).toThrow(GuardSandboxError);

    // The hard deny list stands even if a future allowlist names one of these.
    for (const name of [
      ".git",
      ".env",
      ".env.local",
      ".env.production",
      ".npmrc",
      ".netrc",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "id_rsa",
      "server.pem",
      "../outside.json",
      "nested/dir.json",
    ]) {
      expect(rootFileRefusal(name), `${name} must be refused`).toBeTruthy();
      expect(() =>
        createGuardSandbox({ ...shared, rootFiles: [name] }),
      ).toThrow(GuardSandboxError);
    }
    expect(rootFileRefusal("tsconfig.json")).toBeNull();

    // Fail loudly rather than build a partial sandbox that could false-pass.
    expect(() =>
      createGuardSandbox({ ...shared, rootFiles: ["no-such-config.json"] }),
    ).toThrow(/required root file is missing/);
    expect(() => createGuardSandbox({ ...shared, rootFiles: ["src"] })).toThrow(
      /not a regular file/,
    );

    // The rejections leave nothing behind.
    expect(git(["status", "--porcelain"])).not.toMatch(/bb822-api-/);
  });

  it("denies the forbidden root files whatever their case", async () => {
    const {
      createGuardSandbox,
      GuardSandboxError,
      rootFileRefusal,
      FORBIDDEN_ROOT_FILES,
    } = await loadSandboxLib();
    const shared = {
      repoRoot,
      prefix: "bb822-case-",
      copyDirs: [],
      linkDirs: [],
    };

    // Structural: NTFS and the default macOS filesystem are case-insensitive,
    // so a rule without `i` is bypassable by spelling. Asserting the flag on
    // the data itself means a future entry cannot reintroduce the hole.
    for (const { test, why } of FORBIDDEN_ROOT_FILES) {
      expect(
        test.flags,
        `${test} must be case-insensitive (${why}) — a case-sensitive deny rule is bypassable on NTFS/APFS`,
      ).toContain("i");
    }

    // Behavioural: the spelling that slipped past the old `/^\.git$/` rule,
    // plus a case variant of every other entry.
    for (const name of [
      ".GIT",
      ".Git",
      ".gIt",
      ".ENV",
      ".Env.Local",
      ".env.PRODUCTION",
      ".NPMRC",
      ".NetRC",
      "_NETRC",
      "PACKAGE-LOCK.JSON",
      "Yarn.Lock",
      "PNPM-LOCK.YAML",
      "Bun.Lockb",
      "ID_RSA",
      "Id_Ed25519",
      "SERVER.PEM",
      "Cert.PFX",
      "A.KeyStore",
    ]) {
      expect(
        rootFileRefusal(name),
        `${name} must be refused whatever its case`,
      ).toBeTruthy();
      expect(
        () => createGuardSandbox({ ...shared, rootFiles: [name] }),
        `createGuardSandbox must refuse rootFiles: [${JSON.stringify(name)}]`,
      ).toThrow(GuardSandboxError);
    }

    // The case rule must not swallow legitimate names that merely look similar.
    for (const allowed of [
      "gitignore.json",
      "envcheck.ts",
      "tsconfig.json",
      "vite.config.ts",
    ]) {
      expect(
        rootFileRefusal(allowed),
        `${allowed} must stay allowed`,
      ).toBeNull();
    }

    expect(git(["status", "--porcelain"])).not.toMatch(/bb822-case-/);
  });

  it("copies only the named config out of a real linked worktree", async () => {
    const { createGuardSandbox } = await loadSandboxLib();
    const fx = makeLinkedWorktreeFixture();
    expect(
      fx.dotGitIsRegularFile,
      "fixture must be a LINKED worktree: .git has to be a regular gitdir: file",
    ).toBe(true);
    const before = fx.state();

    const variants = [
      {
        label: "CI-25",
        opts: {
          prefix: "bb822-type-",
          copyDirs: ["src", "shared"],
          linkDirs: ["node_modules"],
          rootFiles: ["tsconfig.json"],
        },
      },
      {
        label: "CI-27",
        opts: {
          prefix: ".bb-guard-sandbox-",
          location: "repo" as const,
          copyDirs: ["src", "shared", ".storybook"],
          linkDirs: ["public"],
          rootFiles: sbRootFiles,
        },
      },
    ];

    for (const { label, opts } of variants) {
      const sandbox = createGuardSandbox({ repoRoot: fx.worktree, ...opts });
      scratch.push(sandbox.root);
      try {
        expect(
          prohibitedPresentIn(sandbox.root),
          `${label} sandbox copied files it must never copy`,
        ).toEqual([]);
        expect(existsSync(path.join(sandbox.root, ".git"))).toBe(false);
        // Exactly the allowlist, nothing more: every other entry is a copied
        // directory or a link.
        const files = readdirSync(sandbox.root, { withFileTypes: true })
          .filter((e) => e.isFile())
          .map((e) => e.name)
          .sort();
        expect(files, `${label} root files`).toEqual(
          [...opts.rootFiles].sort(),
        );
      } finally {
        sandbox.dispose();
      }
    }

    expect(fx.state(), "the linked worktree must be untouched").toEqual(before);
  }, 60_000);

  it("keeps .git and the secret sentinels out DURING active sabotage", async () => {
    const mod = await loadTypeGuard();
    const fx = makeLinkedWorktreeFixture();
    const before = fx.state();
    const seen: Array<{
      root: string;
      sabotageLive: boolean;
      prohibited: string[];
      state: Record<string, string | null>;
    }> = [];

    const code = mod.runTypeProgramMembership({
      repoRoot: fx.worktree,
      env: { ...process.env, TYPE_GUARD_MANIFEST: fx.manifestPath },
      // The guard is blocked inside this callback with the probe already
      // written — a barrier, not a sleep. Everything observed here is observed
      // WHILE the sabotage is live, before any cleanup can run.
      listFiles: (root: string) => {
        const listing = `${fx.worktree.replace(/\\/g, "/")}/src/guard-a.ts`;
        if (path.resolve(root) !== path.resolve(fx.worktree)) {
          scratch.push(root);
          seen.push({
            root,
            sabotageLive: existsSync(path.join(root, TYPE_TARGET_REL)),
            prohibited: prohibitedPresentIn(root),
            state: fx.state(),
          });
        }
        return listing;
      },
    });

    expect(code).toBe(0);
    expect(seen, "phase 2 must run against a sandbox").toHaveLength(1);
    expect(
      seen[0].sabotageLive,
      "sabotage must really be live at the observation point",
    ).toBe(true);
    expect(
      seen[0].prohibited,
      "prohibited files were present in the sandbox while sabotage was live",
    ).toEqual([]);
    expect(seen[0].state).toEqual(before);
    expect(fx.state()).toEqual(before);
  }, 60_000);

  it("keeps them out after SIGKILL, with the sandbox still on disk", async () => {
    const fx = makeLinkedWorktreeFixture();
    const before = fx.state();
    const session = await startBarrier("type", {
      checkoutRoot: fx.worktree,
      env: { ...process.env, TYPE_GUARD_MANIFEST: fx.manifestPath },
    });
    sessions.push(session);

    // Live sabotage, in the sandbox only.
    expect(existsSync(session.active.sandboxTarget)).toBe(true);
    expect(prohibitedPresentIn(session.active.sandboxRoot)).toEqual([]);

    session.child.kill("SIGKILL");
    const result = await session.exited;
    expect(result.signal ?? result.code).not.toBe(0);

    // Untrappable kill: no cleanup ran, so the sandbox is still there — and it
    // still holds none of the prohibited files.
    expect(
      existsSync(session.active.sandboxRoot),
      "the SIGKILL must have landed while the sandbox was live",
    ).toBe(true);
    expect(existsSync(session.active.sandboxTarget)).toBe(true);
    expect(
      prohibitedPresentIn(session.active.sandboxRoot),
      "a hard-killed sandbox stranded prohibited files on disk",
    ).toEqual([]);
    expect(existsSync(path.join(session.active.sandboxRoot, ".git"))).toBe(
      false,
    );
    expect(fx.state()).toEqual(before);
  }, 90_000);
});

// ── #822 B: the final path component is contained too ───────────────────────

describe("#822 final-component containment — a symlinked target is refused", () => {
  /**
   * Build a disposable checkout in which `rel` IS a file symlink to a sentinel
   * outside the sandbox — the shape `cpSync` preserves into the sandbox.
   */
  function makeSymlinkTargetFixture(rel: string): {
    repo: string;
    sentinel: string;
    manifestPath: string;
    available: boolean;
  } {
    const base = mkdtempSync(path.join(os.tmpdir(), "bb822-sym-"));
    scratch.push(base);
    const repo = path.join(base, "repo");
    const outside = path.join(base, "outside");
    mkdirSync(outside, { recursive: true });
    const sentinel = path.join(outside, "EXTERNAL_SENTINEL.ts");
    writeFileSync(sentinel, EXTERNAL_SENTINEL_BODY);

    const run = (args: string[]) => {
      const r = spawnSync("git", args, {
        cwd: repo,
        encoding: "utf8",
        windowsHide: true,
      });
      if (r.status !== 0)
        throw new Error(`git ${args.join(" ")}: ${r.stdout}${r.stderr}`);
    };
    mkdirSync(path.join(repo, "src/components"), { recursive: true });
    mkdirSync(path.join(repo, "src/test"), { recursive: true });
    mkdirSync(path.join(repo, "shared"), { recursive: true });
    mkdirSync(path.join(repo, ".storybook"), { recursive: true });
    mkdirSync(path.join(repo, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(repo, "src/components/Demo.stories.tsx"),
      "export default {};\n",
    );
    writeFileSync(path.join(repo, "src/guard-a.ts"), "export {};\n");
    writeFileSync(path.join(repo, "shared/kind.ts"), "export {};\n");
    writeFileSync(
      path.join(repo, "package.json"),
      '{ "name": "fx", "private": true }\n',
    );
    writeFileSync(
      path.join(repo, "tsconfig.json"),
      '{ "include": ["src", "shared"] }\n',
    );
    for (const name of sbRootFiles) {
      writeFileSync(path.join(repo, name), "export default {};\n");
    }
    writeFileSync(
      path.join(repo, ".gitignore"),
      "node_modules\n.bb-guard-sandbox-*/\n",
    );
    if (rel !== SB_TARGET_REL) {
      writeFileSync(path.join(repo, SB_TARGET_REL), EXTERNAL_SENTINEL_BODY);
    }
    run(["init", "-q", "-b", "main"]);
    run(["config", "user.email", "fixture@example.invalid"]);
    run(["config", "user.name", "Fixture"]);
    run(["config", "core.hooksPath", ""]);
    run(["add", "-A"]);
    run(["commit", "-qm", "base"]);

    let available = true;
    try {
      symlinkSync(sentinel, path.join(repo, rel), "file");
    } catch {
      available = false;
    }
    const manifestPath = path.join(base, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({ guardFiles: ["src/guard-a.ts"] }),
    );
    return { repo, sentinel, manifestPath, available };
  }

  // These two are the headline evidence for the containment fix. On a host
  // that cannot create symlinks they must report SKIPPED, never green: a
  // passing test that asserted nothing reads as "verified" to anyone scanning
  // the run, which is precisely the false confidence this suite exists to deny.
  it.skipIf(!SYMLINKS_AVAILABLE)(
    "CI-25 refuses a symlinked probe path and the sentinel is byte-identical",
    async () => {
      const mod = await loadTypeGuard();
      const fx = makeSymlinkTargetFixture(TYPE_TARGET_REL);
      expect(
        fx.available,
        "host can create symlinks, so the fixture must have planted one",
      ).toBe(true);
      const before = hashFile(fx.sentinel);
      const code = mod.runTypeProgramMembership({
        repoRoot: fx.repo,
        env: { ...process.env, TYPE_GUARD_MANIFEST: fx.manifestPath },
        listFiles: () => `${fx.repo.replace(/\\/g, "/")}/src/guard-a.ts`,
      });
      expect(code, "a refusal is could-not-run, never a pass").toBe(2);
      expect(
        hashFile(fx.sentinel),
        "the guard wrote through the symlink to a file outside the sandbox",
      ).toBe(before);
      expect(readFileSync(fx.sentinel, "utf8")).toBe(EXTERNAL_SENTINEL_BODY);
    },
    60_000,
  );

  it.skipIf(!SYMLINKS_AVAILABLE)(
    "CI-27 refuses a symlinked .storybook/main.ts and spends no probe run",
    async () => {
      const mod = await loadStorybookGuard();
      const fx = makeSymlinkTargetFixture(SB_TARGET_REL);
      expect(
        fx.available,
        "host can create symlinks, so the fixture must have planted one",
      ).toBe(true);
      const before = hashFile(fx.sentinel);
      let probes = 0;
      const code = mod.runStorybookEmptySuiteGuard(
        {},
        {
          repoRoot: fx.repo,
          probe: () => {
            probes += 1;
            return syntheticProbe(15);
          },
        },
      );
      expect(code).toBe(2);
      expect(probes, "refuse before spending a probe run").toBe(0);
      expect(
        hashFile(fx.sentinel),
        "the guard wrote through the symlink to a file outside the sandbox",
      ).toBe(before);
      expect(readFileSync(fx.sentinel, "utf8")).toBe(EXTERNAL_SENTINEL_BODY);
    },
    60_000,
  );

  // The skips above are honest on a developer's Windows box, but they must not
  // become a way for this coverage to disappear on CI. Every POSIX host can
  // create symlinks, so anything other than "available" there is a defect.
  it("keeps the symlink cases runnable wherever the OS allows them", () => {
    if (process.platform === "win32") {
      // Developer Mode (or an elevated shell) is optional on Windows; the
      // Linux runner below is what keeps the two cases exercised every PR.
      expect(typeof SYMLINKS_AVAILABLE).toBe("boolean");
      return;
    }
    expect(
      SYMLINKS_AVAILABLE,
      `symlinks must be creatable on ${process.platform} — the two containment cases silently skipped instead of running`,
    ).toBe(true);
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
    // CI-25 writes its probe through `sandbox.write` and never calls
    // `resolve`. An earlier version of this stub supplied only a throwing
    // `resolve`, so the exit 2 actually came from `sandbox.write is not a
    // function` — the right code for the wrong reason, pinning nothing. The
    // call counters below are what keep that from happening again.
    let writeCalls = 0;
    let resolveCalls = 0;
    const refuse = (rel: string) => {
      throw new SandboxEscapeError(
        `sabotage target ${rel} resolves outside the sandbox`,
      );
    };
    const code = mod.runTypeProgramMembership({
      listFiles: () => healthyListing(),
      createSandbox: () => ({
        root: path.join(repoRoot, "..", "not-a-sandbox"),
        base: "",
        linkDirs: [],
        resolve: (rel: string) => {
          resolveCalls += 1;
          return refuse(rel);
        },
        write: (rel: string) => {
          writeCalls += 1;
          return refuse(rel);
        },
        dispose: () => {
          disposed = true;
        },
      }),
    });
    expect(
      writeCalls + resolveCalls,
      "the guard never asked the sandbox for the target — this test would pass on a TypeError",
    ).toBeGreaterThan(0);
    expect(writeCalls, "CI-25 must route its probe through sandbox.write").toBe(
      1,
    );
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
              prefix: ".bb-guard-sandbox-",
              location: "repo",
              copyDirs: ["src", "shared", ".storybook"],
              linkDirs: ["public"],
              rootFiles: sbRootFiles,
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

  // There is deliberately NO equivalent seam-free case for CI-27. Running that
  // guard end to end means two real Storybook browser runs, and from inside
  // `npm test` those re-enter the Storybook Vitest project that the outer run is
  // already executing — the two share `node_modules/.vite` through the sandbox's
  // link, and the nested run then collects nothing (`healthy=0 → FAIL`).
  // Measured, not assumed: the case passes standalone (`--project unit`) and
  // fails under a full `npm test`. That interference belongs to #817's residual
  // `node_modules/.vite` writes.
  //
  // CI-27 already runs end to end twice per PR outside this suite — as its own
  // `build-and-test` step and as parity CI-27 — so re-running it here buys no
  // coverage and would make `npm test` flaky. The equivalent falsification is
  // documented as a manual proof in docs/ops/guards.md; the repository-safety
  // property itself is covered above by the mid-run barrier, SIGKILL, SIGTERM,
  // toothless × cleanup-failure and static-wiring cases.
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
        /sandbox\.(resolve|write)\(/,
      );
    }

    // Every sabotage write goes through the sandbox's contained writer, which
    // re-checks the whole path (final component included) and creates with `wx`.
    expect(typeSrc).toMatch(/sandbox\.write\(\s*SABOTAGE_REL/);
    expect(sbSrc).toMatch(/sandbox\.write\(STORYBOOK_MAIN_REL/);
    // No bare writeFileSync may reappear in either guard.
    for (const [label, src] of [
      ["verify-type-program-membership.mjs", typeSrc],
      ["verify-storybook-empty-suite.mjs", sbSrc],
    ] as const) {
      expect(src, `${label} must not write files directly`).not.toMatch(
        /\bwriteFileSync\(/,
      );
    }
    // Restoring the checkout is no longer the safety mechanism.
    expect(sbSrc).not.toMatch(/installSignalRestore/);
  });

  it("neither guard can ask for a blanket root copy", () => {
    const libSrc = readFileSync(
      path.join(repoRoot, "scripts/lib/guard-sandbox.mjs"),
      "utf8",
    );
    for (const [label, src] of [
      [
        "verify-type-program-membership.mjs",
        readFileSync(typeGuardSrc, "utf8"),
      ],
      [
        "verify-storybook-empty-suite.mjs",
        readFileSync(storybookGuardSrc, "utf8"),
      ],
    ] as const) {
      expect(src, `${label} must name its root files explicitly`).toMatch(
        /rootFiles:\s*SANDBOX_ROOT_FILES/,
      );
      expect(
        src,
        `${label} must not use the retired blanket switches`,
      ).not.toMatch(/copyRootFiles|excludeRootFiles:/);
    }
    // The library must not read the checkout root as a directory listing at all.
    expect(
      libSrc,
      "guard-sandbox.mjs must not enumerate the repository root",
    ).not.toMatch(/readdirSync\(\s*absRepoRoot/);
    expect(libSrc).toMatch(/FORBIDDEN_ROOT_FILES/);
  });
});
