/* @vitest-environment node */

import { afterEach, describe, expect, it } from "vitest";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
  tempRoots.push(root);
  return root;
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
    { encoding: "utf8", cwd: repoRoot },
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

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${r.stderr || r.stdout || r.status}`,
    );
  }
}

function initGitRepo(root: string): void {
  git(root, ["init"]);
  git(root, ["config", "user.email", "agent-check@test.local"]);
  git(root, ["config", "user.name", "agent-check-test"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", "fixture"]);
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
      { encoding: "utf8", cwd: repoRoot },
    );
    expect(result.status).toBe(2);
    expect(result.status).not.toBe(1);

    const notDir = spawnSync(
      process.execPath,
      [realScript, "--root", realScript, "--json"],
      { encoding: "utf8", cwd: repoRoot },
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

  it("U1-23 spaced-path healthy run", () => {
    const root = copyFixtureSpaced();
    expect(root.includes(" ")).toBe(true);
    const result = runCheck(root);
    expect(result.status).toBe(0);
    expect(result.json!.findings).toEqual([]);
  });
});
