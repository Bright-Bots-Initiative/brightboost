/* @vitest-environment node */

import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  chmod,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
  calls: string[];
};

const repoRoot = join(process.cwd());
/** Real script under test — §13.2 / C1-03 (not a sandbox copy). */
const realPredeployScript = join(repoRoot, "backend", "scripts", "predeploy.sh");

type Harness = {
  root: string;
  binDir: string;
  callLog: string;
  backendCwd: string;
};

const shellExecutable =
  process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\sh.exe" : "sh";

/** Backup for G-005 if a test throws before withHarness's finally. */
const tempDirs: string[] = [];

async function makeExecutable(path: string) {
  await chmod(path, 0o755);
}

async function makeStub(scriptPath: string, body: string) {
  await writeFile(scriptPath, body, "utf8");
  await makeExecutable(scriptPath);
}

function buildChildEnv(
  overrides: Record<string, string | undefined>,
): Record<string, string> {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete childEnv[key];
    } else {
      childEnv[key] = value;
    }
  }
  return Object.fromEntries(
    Object.entries(childEnv).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function runPredeploy(
  harness: Harness,
  env: Record<string, string | undefined>,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(shellExecutable, [realPredeployScript], {
      cwd: harness.backendCwd,
      env: buildChildEnv(env),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", async (code) => {
      try {
        const callsRaw = env.STUB_CALL_LOG
          ? await readFile(env.STUB_CALL_LOG, "utf8")
          : "";
        const calls = callsRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        resolve({ code: code ?? -1, stdout, stderr, calls });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function setupHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), "predeploy-gate-"));
  tempDirs.push(root);

  const binDir = join(root, "bin");
  const backendCwd = join(root, "backend");
  const rootPrismaDir = join(root, "prisma");
  await mkdir(binDir, { recursive: true });
  await mkdir(backendCwd, { recursive: true });
  await mkdir(rootPrismaDir, { recursive: true });

  // Path probes are cwd-relative (`../prisma/…` from backend/). Fake them so
  // resolution never touches the real repo tree (C1-02 / overview.md §13.2).
  await writeFile(join(rootPrismaDir, "schema.prisma"), "generator client {}\n", "utf8");
  await writeFile(join(rootPrismaDir, "seed.cjs"), "console.log('sandbox seed');\n", "utf8");

  const callLog = join(root, "calls.log");
  await writeFile(callLog, "", "utf8");

  const npxStub = join(binDir, "npx");
  await makeStub(
    npxStub,
    `#!/usr/bin/env sh
printf 'npx %s\\n' "$*" >> "$STUB_CALL_LOG"
if [ "$STUB_FAIL_MIGRATE" = "true" ] && [ "$1" = "prisma" ] && [ "$2" = "migrate" ] && [ "$3" = "deploy" ]; then
  exit 88
fi
exit 0
`,
  );

  const nodeStub = join(binDir, "node");
  await makeStub(
    nodeStub,
    `#!/usr/bin/env sh
printf 'node %s\\n' "$*" >> "$STUB_CALL_LOG"
if [ "$STUB_FAIL_SEED" = "true" ] && [ "$1" = "../prisma/seed.cjs" ]; then
  exit 77
fi
exit 0
`,
  );

  return {
    root,
    binDir,
    callLog,
    backendCwd,
  };
}

async function cleanupHarness(root: string) {
  const idx = tempDirs.indexOf(root);
  if (idx !== -1) {
    tempDirs.splice(idx, 1);
  }
  await rm(root, { recursive: true, force: true });
}

/** Primary cleanup path (C1-04 / G-005): always rm the sandbox in finally. */
async function withHarness<T>(fn: (harness: Harness) => Promise<T>): Promise<T> {
  const harness = await setupHarness();
  try {
    return await fn(harness);
  } finally {
    await cleanupHarness(harness.root);
  }
}

/**
 * Controlled env per §13.2 / C1-03.
 * `undefined` values are deleted so the child sees a true unset (E-1),
 * not a leaked value from the parent process.env.
 */
function stubEnv(
  harness: Harness,
  extra: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    DIRECT_URL: "stub",
    STUB_CALL_LOG: harness.callLog,
    PATH: `${harness.binDir}:${process.env.PATH ?? ""}`,
    RUN_SEED: undefined,
    RUN_GAMIFICATION_BACKFILL: undefined,
    STUB_FAIL_MIGRATE: undefined,
    STUB_FAIL_SEED: undefined,
    ...extra,
  };
}

function hasSeedCall(calls: string[]) {
  return calls.some((line) => line.includes("node ../prisma/seed.cjs"));
}

function seedCallCount(calls: string[]) {
  return calls.filter((line) => line.includes("node ../prisma/seed.cjs")).length;
}

function hasBackfillCall(calls: string[]) {
  return calls.some((line) => line.includes("node scripts/backfill-gamification.cjs"));
}

/** Upstream of the gate — must still run when seed is skipped (E-1 "everything else identical"). */
function hasMigrateCall(calls: string[]) {
  return calls.some((line) => line.includes("npx prisma migrate deploy"));
}

function hasGenerateCall(calls: string[]) {
  return calls.some((line) => line.includes("npx prisma generate"));
}

const SKIP_LINE =
  "predeploy: skipping seed (RUN_SEED not set — see docs/deploy.md, issue #651)";
const RUN_LINE_PREFIX = "predeploy: RUN_SEED=true — running seed from";

describe("predeploy RUN_SEED gate", () => {
  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it("C1-05: harness observes node seed when RUN_SEED=true", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "true" }));

      expect(result.code).toBe(0);
      expect(hasMigrateCall(result.calls)).toBe(true);
      expect(hasGenerateCall(result.calls)).toBe(true);
      expect(seedCallCount(result.calls)).toBe(1);
      expect(hasSeedCall(result.calls)).toBe(true);
      expect(result.stdout).toContain(`${RUN_LINE_PREFIX} ../prisma/seed.cjs`);
    });
  });

  it("E-1: skips seed when RUN_SEED is unset", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness));

      expect(result.code).toBe(0);
      // Call log = the deed (G-202); stdout = the word — asserted separately (T1-1-08).
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(result.stdout).toContain(SKIP_LINE);
      // Everything else identical: migrate + generate still ran (§5.8 E-1).
      expect(hasMigrateCall(result.calls)).toBe(true);
      expect(hasGenerateCall(result.calls)).toBe(true);
    });
  });

  it("E-2: runs seed once when RUN_SEED=true", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "true" }));

      expect(result.code).toBe(0);
      expect(seedCallCount(result.calls)).toBe(1);
      expect(result.stdout).toContain(`${RUN_LINE_PREFIX} ../prisma/seed.cjs`);
    });
  });

  it("E-3: skips seed when RUN_SEED=false", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "false" }));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
    });
  });

  // Exact `"true"` only — 1/yes/TRUE are counter-intuitive skips (E-4 / G-105).
  it("E-4: does not seed when RUN_SEED=1", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "1" }));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(result.stdout).toContain(SKIP_LINE);
    });
  });

  it("E-4: does not seed when RUN_SEED=yes", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "yes" }));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(result.stdout).toContain(SKIP_LINE);
    });
  });

  it("E-4: does not seed when RUN_SEED=TRUE", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "TRUE" }));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(result.stdout).toContain(SKIP_LINE);
    });
  });

  it("E-5: keeps seed failures non-fatal", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(
        harness,
        stubEnv(harness, { RUN_SEED: "true", STUB_FAIL_SEED: "true" }),
      );

      expect(result.code).toBe(0);
      expect(seedCallCount(result.calls)).toBe(1);
      expect(result.stdout).toContain("predeploy: seed had warnings (non-fatal)");
    });
  });

  it("E-8: keeps seed and backfill gates independent", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(
        harness,
        stubEnv(harness, { RUN_GAMIFICATION_BACKFILL: "true" }),
      );

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(hasBackfillCall(result.calls)).toBe(true);
    });
  });
});
