/* @vitest-environment node */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function resolveBash(): string {
  return process.env.BB_BASH || "bash";
}

function pathToFileUrl(p: string): string {
  return pathToFileURL(p).href;
}

function runStepPresence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(resolveBash(), ["scripts/verify-ci-step-presence.sh"], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, 60_000);
    child.stdout?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.stderr?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: 2, output: output + `\n${err.message}` });
    });
  });
}

async function loadCore() {
  return import(
    pathToFileUrl(
      path.join(repoRoot, "scripts/verify-ci-step-presence-core.mjs"),
    )
  );
}

describe("verify-ci-step-presence.sh (U1-04 + review Bug A + round 3)", () => {
  it("healthy: real workflow + manifest exits 0", async () => {
    const { status, output } = await runStepPresence();
    expect(status, `expected exit 0:\n${output}`).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  });

  it("property false: required step commented out → exit 1 (Bug A regression)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-presence-"));
    tempDirs.push(dir);

    const realWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const workflowPath = path.join(dir, "ci-cd-commented.yml");
    const commented = realWorkflow
      .split(/\r?\n/)
      .map((line) =>
        line.includes("check-prisma-drift.sh") ? `# ${line}` : line,
      )
      .join("\n");
    writeFileSync(workflowPath, commented, "utf8");

    const manifestPath = path.join(dir, "ci-required-steps.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSteps: [
          {
            job: "build-and-test",
            run: "bash scripts/check-prisma-drift.sh",
          },
        ],
      }),
      "utf8",
    );

    const { status, output } = await runStepPresence({
      ...process.env,
      CI_STEP_PRESENCE_WORKFLOW: workflowPath,
      CI_STEP_PRESENCE_MANIFEST: manifestPath,
    });

    expect(
      status,
      `commented-out drift step must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/MISSING required step/);
    expect(output).toContain("bash scripts/check-prisma-drift.sh");
  });

  it("property false: required step deleted entirely → exit 1", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-presence-"));
    tempDirs.push(dir);

    const realWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const workflowPath = path.join(dir, "ci-cd.yml");
    const sabotaged = realWorkflow
      .split(/\r?\n/)
      .filter((line) => !line.includes("check-prisma-drift.sh"))
      .join("\n");
    writeFileSync(workflowPath, sabotaged, "utf8");

    const manifestPath = path.join(dir, "ci-required-steps.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSteps: [
          {
            job: "build-and-test",
            run: "bash scripts/check-prisma-drift.sh",
          },
          {
            job: "build-and-test",
            run: "this-step-definitely-does-not-exist-in-workflow",
          },
        ],
      }),
      "utf8",
    );

    const { status, output } = await runStepPresence({
      ...process.env,
      CI_STEP_PRESENCE_WORKFLOW: workflowPath,
      CI_STEP_PRESENCE_MANIFEST: manifestPath,
    });

    expect(
      status,
      `manifest entry naming a missing step must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/MISSING required step/);
    expect(output).toContain("this-step-definitely-does-not-exist-in-workflow");
    expect(output).toContain("bash scripts/check-prisma-drift.sh");
  });

  it("cross-job aliasing: frontend typecheck does not satisfy backend requirement", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-only:
    steps:
      - name: FE typecheck
        run: npm run typecheck
  build-and-test:
    steps:
      - name: FE typecheck
        run: npm run typecheck
      - name: BE typecheck
        run: cd backend && npm run typecheck
`;
    const required = [
      { job: "build-and-test", run: "npm run typecheck" },
      { job: "build-and-test", run: "cd backend && npm run typecheck" },
    ];
    expect(core.checkRequiredPresent(workflow, required).ok).toBe(true);

    const { text, removedCount } = core.removeStepsMatching(workflow, {
      job: "build-and-test",
      run: "cd backend && npm run typecheck",
    });
    expect(removedCount).toBe(1);
    const after = core.checkRequiredPresent(text, required);
    expect(after.ok).toBe(false);
    expect(
      after.missing.some((m: string) => m.includes("build-and-test")),
    ).toBe(true);
    expect(
      after.missing.some((m: string) =>
        m.includes("cd backend && npm run typecheck"),
      ),
    ).toBe(true);
  });

  it("echo impostor does not satisfy an exact required run line", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-and-test:
    steps:
      - run: echo "npm run typecheck"
`;
    const result = core.checkRequiredPresent(workflow, [
      { job: "build-and-test", run: "npm run typecheck" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("comment impostor: # npm run lint as run content → missing", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-and-test:
    steps:
      - run: |
          # npm run lint
`;
    const result = core.checkRequiredPresent(workflow, [
      { job: "build-and-test", run: "npm run lint" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("multi-line run: exact line matches; embedded command does not", async () => {
    const core = await loadCore();
    const exact = `
jobs:
  build-and-test:
    steps:
      - run: |
          echo start
          npm run lint
          echo end
`;
    expect(
      core.checkRequiredPresent(exact, [
        { job: "build-and-test", run: "npm run lint" },
      ]).ok,
    ).toBe(true);

    const embedded = `
jobs:
  build-and-test:
    steps:
      - run: |
          RESULT=$(npm run lint)
`;
    expect(
      core.checkRequiredPresent(embedded, [
        { job: "build-and-test", run: "npm run lint" },
      ]).ok,
    ).toBe(false);
  });

  it("right job / wrong job: db-check requirement not satisfied by build-and-test", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-and-test:
    steps:
      - run: npm run test:db
  db-check:
    steps:
      - run: echo other
`;
    const result = core.checkRequiredPresent(workflow, [
      { job: "db-check", run: "npm run test:db" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("renamed job → missing, message names the job", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-renamed:
    steps:
      - run: npm run lint
`;
    const result = core.checkRequiredPresent(workflow, [
      { job: "build-and-test", run: "npm run lint" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.missing[0]).toMatch(/build-and-test/);
  });

  it("whitespace tolerance on an otherwise-identical line → present", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-and-test:
    steps:
      - run: "  npm run lint  "
`;
    expect(
      core.checkRequiredPresent(workflow, [
        { job: "build-and-test", run: "npm run lint" },
      ]).ok,
    ).toBe(true);
  });

  it("sabotage no-op (requirement matches nothing) → exit 2", async () => {
    const core = await loadCore();
    const workflow = `
jobs:
  build-and-test:
    steps:
      - run: npm run lint
`;
    const { removedCount } = core.removeStepsMatching(workflow, {
      job: "build-and-test",
      run: "npm run typecheck",
    });
    expect(removedCount).toBe(0);

    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-sabotage-noop-"));
    tempDirs.push(dir);
    const workflowPath = path.join(dir, "wf.yml");
    const manifestPath = path.join(dir, "manifest.json");
    writeFileSync(workflowPath, workflow, "utf8");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSteps: [{ job: "build-and-test", run: "npm run typecheck" }],
      }),
      "utf8",
    );

    const status: number | null = await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [
          path.join(repoRoot, "scripts/verify-ci-step-presence-core.mjs"),
          "sabotage-all",
        ],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            CI_STEP_PRESENCE_WORKFLOW: workflowPath,
            CI_STEP_PRESENCE_MANIFEST: manifestPath,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.on("close", (code) => resolve(code));
      child.on("error", () => resolve(2));
    });
    // Healthy check would fail first in the shell wrapper; sabotage-all alone
    // must exit 2 when removal is a no-op.
    expect(status).toBe(2);
  });
});
