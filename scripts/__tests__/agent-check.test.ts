/* @vitest-environment node */

import { afterEach, describe, expect, it } from "vitest";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

type Finding = { code: string; path: string; message: string };
type CheckJson = {
  ok: boolean;
  findings: Finding[];
  inventory: {
    adapters: string[];
    rules: string[];
    skills: string[];
    claudeStubs: string[];
    julesStubs: string[];
  };
};

type RunResult = {
  status: number | null;
  json: CheckJson | null;
  stdout: string;
  stderr: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const realScript = join(repoRoot, "scripts", "agent-check.mjs");
const fixtureTree = join(here, "fixtures", "agent-tree");
const fixtureSpaced = join(here, "fixtures", "agent-tree-spaced");

const BOOTSTRAP =
  "Before work, read `docs/agents/overview.md`, everything under `docs/agents/rules`, and `docs/agents/skills/overview.md`. Use task-specific skills from `docs/agents/skills/**/SKILL.md`.";

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root && existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function trackTemp(root: string): string {
  // realpath so the isolation assertion below compares like with like
  // (Windows 8.3 names, macOS /var -> /private/var).
  const real = realpathSync(root);
  tempRoots.push(real);
  return real;
}

/**
 * Ambient git environment is poison for this file (#787).
 *
 * Git exports `GIT_DIR` into every process a hook spawns when the checkout is a
 * linked worktree (`pre-commit` also exports `GIT_INDEX_FILE`), and husky's
 * `pre-push` runs this suite. `spawnSync`'s `cwd` does NOT override an
 * inherited `GIT_DIR`: with `GIT_WORK_TREE` unset git treats the child's cwd as
 * the work tree, so the fixture `git add -A` / `git commit` below rewrote the
 * contributor's real index with the fixture tree and pushed "fixture" /
 * "track env" onto their branch. Every git call in this file therefore runs
 * with the inherited git environment scrubbed.
 */
function gitSafeEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^GIT_/i.test(key)) env[key] = value;
  }
  return { ...env, ...extra };
}

/** Scrubbed env pinned at `root`'s own repository — nothing else is reachable. */
function tempRepoEnv(root: string): NodeJS.ProcessEnv {
  return gitSafeEnv({ GIT_DIR: join(root, ".git"), GIT_WORK_TREE: root });
}

function normalizePath(p: string): string {
  const real = existsSync(p) ? realpathSync(p) : p;
  const slashed = real.replace(/\\/g, "/");
  return process.platform === "win32" ? slashed.toLowerCase() : slashed;
}

function copyFixture(src: string): string {
  const root = trackTemp(mkdtempSync(join(tmpdir(), "agent-check-")));
  cpSync(src, root, { recursive: true });
  return root;
}

function copyFixtureSpaced(): string {
  const parent = trackTemp(mkdtempSync(join(tmpdir(), "agent check ")));
  const root = join(parent, "tree");
  mkdirSync(root, { recursive: true });
  cpSync(fixtureSpaced, root, { recursive: true });
  return root;
}

/** Relocate script + allowlist so ALLOWLIST_PATH resolves under tmp (U1-20/21). */
function copyScriptBundle(allowlist: unknown): { scriptPath: string } {
  const bundle = trackTemp(mkdtempSync(join(tmpdir(), "agent-check-script-")));
  const scriptsDir = join(bundle, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  cpSync(realScript, join(scriptsDir, "agent-check.mjs"));
  writeFileSync(
    join(scriptsDir, "agent-check.allowlist.json"),
    `${JSON.stringify(allowlist, null, 2)}\n`,
    "utf8",
  );
  return { scriptPath: join(scriptsDir, "agent-check.mjs") };
}

function runCheck(
  root: string,
  args: string[] = [],
  scriptPath: string = realScript,
): RunResult {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--root", root, "--json", ...args],
    { encoding: "utf8", cwd: repoRoot, env: gitSafeEnv() },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  let json: CheckJson | null = null;
  try {
    json = JSON.parse(stdout) as CheckJson;
  } catch {
    json = null;
  }
  return { status: result.status, json, stdout, stderr };
}

function codes(result: RunResult): string[] {
  return (result.json?.findings ?? []).map((f) => f.code);
}

/** Run git against `cwd`'s own temp repository only (#787) and return stdout. */
function gitOut(cwd: string, args: string[]): string {
  const r = spawnSync("git", ["-C", cwd, ...args], {
    cwd,
    encoding: "utf8",
    env: tempRepoEnv(cwd),
  });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${r.stderr || r.stdout || r.status}`,
    );
  }
  return (r.stdout ?? "").trim();
}

function git(cwd: string, args: string[]): void {
  gitOut(cwd, args);
}

/** Fail loudly rather than corrupt: the repo git resolved must be `root`'s. */
function assertRepoIsolated(root: string): void {
  const resolved = normalizePath(
    gitOut(root, ["rev-parse", "--absolute-git-dir"]),
  );
  const expected = normalizePath(join(root, ".git"));
  if (resolved !== expected) {
    throw new Error(
      `fixture git escaped its temp repo (#787): expected ${expected}, got ${resolved}`,
    );
  }
}

function initGitRepo(root: string): void {
  git(root, ["init"]);
  assertRepoIsolated(root);
  git(root, ["config", "user.email", "agent-check@test.local"]);
  git(root, ["config", "user.name", "agent-check-test"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", "fixture"]);
}

/**
 * Read-only probe of the checkout this suite runs in — never pinned, because a
 * linked worktree's `.git` is a file, not a directory. Worktree status is
 * deliberately not sampled: other guard tests legitimately dirty the tree
 * (see scripts/verify-ci-shell-gate.sh), while HEAD, branch and a staged diff
 * are exactly what the #787 corruption moved.
 */
function realCheckoutState(): Record<string, string> {
  const read = (args: string[]): string => {
    const r = spawnSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      env: gitSafeEnv(),
    });
    return (r.stdout ?? "").trim();
  };
  return {
    head: read(["rev-parse", "HEAD"]),
    branch: read(["rev-parse", "--abbrev-ref", "HEAD"]),
    staged: read(["diff", "--cached", "--name-only"]),
  };
}

function trackEnvFile(root: string): void {
  writeFileSync(join(root, ".env"), "PLACEHOLDER=1\n", "utf8");
  git(root, ["add", ".env"]);
  git(root, ["commit", "-m", "track env"]);
}

describe("agent-check silent-logic", () => {
  it("U1-01 healthy fixture → exit 0, empty findings, inventory matches", () => {
    const root = copyFixture(fixtureTree);
    const result = runCheck(root);
    expect(result.status).toBe(0);
    expect(result.json).not.toBeNull();
    expect(result.json!.ok).toBe(true);
    expect(result.json!.findings).toEqual([]);
    expect([...result.json!.inventory.adapters].sort()).toEqual(
      [".cursor/rules/agent-context.mdc", "AGENTS.md", "CLAUDE.md"].sort(),
    );
    expect([...result.json!.inventory.rules].sort()).toEqual(
      [
        "docs/agents/rules/00-core.md",
        "docs/agents/rules/10-testing.md",
      ].sort(),
    );
    expect([...result.json!.inventory.skills].sort()).toEqual(
      ["i18n-strings", "red-green-verification"].sort(),
    );
  });

  it("U1-22 bad --root → exit 2, never 1", () => {
    const missing = join(tmpdir(), "agent-check-missing-root-does-not-exist");
    const result = spawnSync(
      process.execPath,
      [realScript, "--root", missing, "--json"],
      { encoding: "utf8", cwd: repoRoot, env: gitSafeEnv() },
    );
    expect(result.status).toBe(2);
    expect(result.status).not.toBe(1);

    const notDir = spawnSync(
      process.execPath,
      [realScript, "--root", realScript, "--json"],
      { encoding: "utf8", cwd: repoRoot, env: gitSafeEnv() },
    );
    expect(notDir.status).toBe(2);
    expect(notDir.status).not.toBe(1);
  });

  it("U1-07 fenced @import is not enough; bare line is required (AC-006)", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const broken = copyFixture(fixtureTree);
    writeFileSync(
      join(broken, "CLAUDE.md"),
      ["```", "@docs/agents/agent.md", "```", "", BOOTSTRAP, ""].join("\n"),
      "utf8",
    );
    const bad = runCheck(broken);
    expect(bad.status).toBe(1);
    expect(codes(bad)).toContain("AC-006");

    const bareOk = copyFixture(fixtureTree);
    writeFileSync(
      join(bareOk, "CLAUDE.md"),
      ["@docs/agents/agent.md", "", BOOTSTRAP, ""].join("\n"),
      "utf8",
    );
    const ok = runCheck(bareOk);
    expect(ok.status).toBe(0);
    expect(codes(ok)).not.toContain("AC-006");
  });

  it("U1-17 relative link resolution (./, ../, nested) → AC-016", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const rootDot = copyFixture(fixtureTree);
    writeFileSync(
      join(rootDot, "docs", "agents", "overview.md"),
      "# Overview\n\nSee [missing](./nope-does-not-exist.md).\n",
      "utf8",
    );
    const dot = runCheck(rootDot);
    expect(dot.status).toBe(1);
    expect(codes(dot)).toContain("AC-016");

    const rootUp = copyFixture(fixtureTree);
    writeFileSync(
      join(rootUp, "docs", "agents", "learned", "security.md"),
      "# Security\n\nSee [up](../missing-parent.md).\n",
      "utf8",
    );
    const up = runCheck(rootUp);
    expect(up.status).toBe(1);
    expect(codes(up)).toContain("AC-016");

    const rootNested = copyFixture(fixtureTree);
    writeFileSync(
      join(rootNested, "docs", "agents", "learned", "security.md"),
      "# Security\n\nSee [sib](./also-missing.md).\n",
      "utf8",
    );
    const nested = runCheck(rootNested);
    expect(nested.status).toBe(1);
    expect(codes(nested)).toContain("AC-016");
  });

  it("U1-13 skill on disk absent from index → AC-012", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const root = copyFixture(fixtureTree);
    writeFileSync(
      join(root, "docs", "agents", "skills", "overview.md"),
      "# Skills\n\n| Skill | When |\n| --- | --- |\n| `i18n-strings` | copy |\n",
      "utf8",
    );
    const result = runCheck(root);
    expect(result.status).toBe(1);
    expect(codes(result)).toContain("AC-012");
  });

  it("U1-14 index lists missing skill → AC-013", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const root = copyFixture(fixtureTree);
    writeFileSync(
      join(root, "docs", "agents", "skills", "overview.md"),
      [
        "# Skills",
        "",
        "| Skill | When |",
        "| --- | --- |",
        "| `red-green-verification` | falsify |",
        "| `i18n-strings` | copy |",
        "| `ghost-skill` | missing on disk |",
        "",
      ].join("\n"),
      "utf8",
    );
    const result = runCheck(root);
    expect(result.status).toBe(1);
    expect(codes(result)).toContain("AC-013");
  });

  it("U1-11 missing description → AC-010", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const root = copyFixture(fixtureTree);
    writeFileSync(
      join(root, "docs", "agents", "skills", "i18n-strings", "SKILL.md"),
      "---\nname: i18n-strings\n---\n\nBody.\n",
      "utf8",
    );
    const result = runCheck(root);
    expect(result.status).toBe(1);
    expect(codes(result)).toContain("AC-010");
  });

  it("U1-12 name ≠ directory → AC-011", () => {
    const healthy = copyFixture(fixtureTree);
    expect(runCheck(healthy).status).toBe(0);

    const root = copyFixture(fixtureTree);
    writeFileSync(
      join(root, "docs", "agents", "skills", "i18n-strings", "SKILL.md"),
      "---\nname: wrong-name\ndescription: Add or translate user-facing copy with en+es keys when changing strings.\n---\n\nBody.\n",
      "utf8",
    );
    const result = runCheck(root);
    expect(result.status).toBe(1);
    expect(codes(result)).toContain("AC-011");
  });

  it("U1-20 allowlist past-expiry → AC-018", () => {
    const okRoot = copyFixture(fixtureTree);
    initGitRepo(okRoot);
    trackEnvFile(okRoot);
    const healthyAllow = copyScriptBundle({
      trackedEnvFiles: [{ path: ".env", issue: 754, expires: "2099-01-01" }],
    });
    const ok = runCheck(okRoot, [], healthyAllow.scriptPath);
    expect(ok.status).toBe(0);

    const root = copyFixture(fixtureTree);
    initGitRepo(root);
    trackEnvFile(root);
    const { scriptPath } = copyScriptBundle({
      trackedEnvFiles: [{ path: ".env", issue: 754, expires: "2020-01-01" }],
    });
    const bad = runCheck(root, [], scriptPath);
    expect(bad.status).toBe(1);
    expect(codes(bad)).toContain("AC-018");
  });

  it("U1-21 allowlist issue 000 fails; valid issue passes", () => {
    const root = copyFixture(fixtureTree);
    initGitRepo(root);
    trackEnvFile(root);

    const zero = copyScriptBundle({
      trackedEnvFiles: [{ path: ".env", issue: 0, expires: "2099-01-01" }],
    });
    const bad = runCheck(root, [], zero.scriptPath);
    expect(bad.status).toBe(1);
    expect(codes(bad)).toContain("AC-018");

    const valid = copyScriptBundle({
      trackedEnvFiles: [{ path: ".env", issue: 754, expires: "2099-01-01" }],
    });
    const ok = runCheck(root, [], valid.scriptPath);
    expect(ok.status).toBe(0);
    expect(codes(ok)).not.toContain("AC-018");
  });

  it("U1-24 --fix is idempotent (second run → zero filesystem change)", () => {
    const root = copyFixture(fixtureTree);
    const first = runCheck(root, ["--fix"]);
    expect(first.status).toBe(0);

    const snapshot = (dir: string): Map<string, string> => {
      const out = new Map<string, string>();
      const walk = (d: string, rel: string) => {
        for (const name of readdirSync(d)) {
          const full = join(d, name);
          const r = rel ? `${rel}/${name}` : name;
          if (statSync(full).isDirectory()) walk(full, r);
          else out.set(r.replace(/\\/g, "/"), readFileSync(full, "utf8"));
        }
      };
      walk(dir, "");
      return out;
    };

    const before = snapshot(join(root, ".claude"));
    const second = runCheck(root, ["--fix"]);
    expect(second.status).toBe(0);
    expect(snapshot(join(root, ".claude"))).toEqual(before);
  });

  it("U1-25 leaked git env cannot reach the ambient repository (#787)", () => {
    // Sacrificial stand-in for a contributor's checkout. Before the fix the
    // fixture commits landed here (and, in the wild, on their real branch).
    const victim = trackTemp(
      mkdtempSync(join(tmpdir(), "agent-check-victim-")),
    );
    writeFileSync(join(victim, "keep.txt"), "keep\n", "utf8");
    initGitRepo(victim);
    // Report a broken probe as state rather than throwing, so a failure names
    // what the leak did to the repository instead of where git gave up.
    const probe = (args: string[]): string => {
      try {
        return gitOut(victim, args);
      } catch (error) {
        return `unreadable: ${(error as Error).message}`;
      }
    };
    const snapshot = () => ({
      head: probe(["rev-parse", "HEAD"]),
      branch: probe(["rev-parse", "--abbrev-ref", "HEAD"]),
      index: probe(["ls-files"]),
      status: probe(["status", "--porcelain"]),
    });
    const victimBefore = snapshot();
    const realBefore = realCheckoutState();

    // Exactly the #787 leak: git exports these into everything a hook spawns
    // when the checkout is a linked worktree, and husky's pre-push runs this
    // suite. Restored in `finally` so no other test in this file sees them.
    const saved = {
      GIT_DIR: process.env.GIT_DIR,
      GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
    };
    let escaped: Error | null = null;
    let bad: RunResult | null = null;
    try {
      process.env.GIT_DIR = join(victim, ".git");
      process.env.GIT_INDEX_FILE = join(victim, ".git", "index");

      const root = copyFixture(fixtureTree);
      // The spawned script must also read `root`'s repo, not the leaked one:
      // AC-018 only fires when `.env` is tracked in the temp fixture repo.
      const { scriptPath } = copyScriptBundle({
        trackedEnvFiles: [{ path: ".env", issue: 754, expires: "2020-01-01" }],
      });
      try {
        initGitRepo(root);
        trackEnvFile(root);
        bad = runCheck(root, [], scriptPath);
      } catch (error) {
        escaped = error as Error;
      }
    } finally {
      for (const key of ["GIT_DIR", "GIT_INDEX_FILE"] as const) {
        const prev = saved[key];
        if (prev === undefined) delete process.env[key];
        else process.env[key] = prev;
      }
    }

    expect(snapshot()).toEqual(victimBefore);
    expect(realCheckoutState()).toEqual(realBefore);
    expect(escaped?.message ?? null).toBeNull();
    expect(bad!.status).toBe(1);
    expect(codes(bad!)).toContain("AC-018");
  });

  it("U1-23 spaced-path healthy run", () => {
    const root = copyFixtureSpaced();
    expect(root.includes(" ")).toBe(true);
    const result = runCheck(root);
    expect(result.status).toBe(0);
    expect(result.json!.findings).toEqual([]);
  });
});
