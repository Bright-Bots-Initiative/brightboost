/* @vitest-environment node */

import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  chmod,
  copyFile,
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
const sourcePredeployScript = join(repoRoot, "backend", "scripts", "predeploy.sh");
type Harness = {
  root: string;
  binDir: string;
  callLog: string;
  backendCwd: string;
  predeployScript: string;
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

function runPredeploy(
  harness: Harness,
  env: Record<string, string | undefined>,
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(shellExecutable, [harness.predeployScript], {
      cwd: harness.backendCwd,
      env: {
        ...process.env,
        ...env,
      },
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
  const backendScriptsDir = join(root, "backend", "scripts");
  const rootPrismaDir = join(root, "prisma");
  await mkdir(binDir, { recursive: true });
  await mkdir(backendScriptsDir, { recursive: true });
  await mkdir(rootPrismaDir, { recursive: true });
  const predeployScript = join(backendScriptsDir, "predeploy.sh");
  await copyFile(sourcePredeployScript, predeployScript);
  await makeExecutable(predeployScript);

  // Ensure script path probing resolves against sandbox, not real repo.
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
    backendCwd: join(root, "backend"),
    predeployScript,
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

function stubEnv(
  harness: Harness,
  extra: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    DIRECT_URL: "stub",
    STUB_CALL_LOG: harness.callLog,
    PATH: `${harness.binDir}:${process.env.PATH ?? ""}`,
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
      expect(seedCallCount(result.calls)).toBe(1);
      expect(hasSeedCall(result.calls)).toBe(true);
    });
  });

  it("E-1: skips seed when RUN_SEED is unset", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
      expect(result.stdout).toContain("predeploy: skipping seed");
    });
  });

  it("E-2: runs seed once when RUN_SEED=true", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "true" }));

      expect(result.code).toBe(0);
      expect(seedCallCount(result.calls)).toBe(1);
    });
  });

  it("E-3: skips seed when RUN_SEED=false", async () => {
    await withHarness(async (harness) => {
      const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: "false" }));

      expect(result.code).toBe(0);
      expect(hasSeedCall(result.calls)).toBe(false);
    });
  });

  it("E-4: only exact true enables seed", async () => {
    for (const value of ["1", "yes", "TRUE"]) {
      await withHarness(async (harness) => {
        const result = await runPredeploy(harness, stubEnv(harness, { RUN_SEED: value }));

        expect(result.code).toBe(0);
        expect(hasSeedCall(result.calls)).toBe(false);
        expect(result.stdout).toContain("predeploy: skipping seed");
      });
    }
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
