/* @vitest-environment node */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptRel = "scripts/e2e-seed.mjs";

function runSeed(
  env: NodeJS.ProcessEnv,
  timeoutMs = 15_000,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptRel], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, timeoutMs);
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

describe("e2e:seed production DATABASE_URL refusal (U2-08 / G-002)", () => {
  it("refuses a production-shaped URL with exit 1 before any write", async () => {
    const { status, output } = await runSeed({
      ...process.env,
      DATABASE_URL: "postgresql://u:p@db.example.supabase.co:5432/e2e",
    });

    expect(
      status,
      `production-shaped URL must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/Refusing.*production-shaped/);
    expect(output).toMatch(/No writes performed/);
    expect(output).not.toMatch(/Seed complete/);
    expect(output).not.toMatch(/PrismaClient/i);
    expect(output).not.toMatch(/Can't reach database/i);
  });

  it("exits 2 when DATABASE_URL is missing (could not run, not property false)", async () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const { status, output } = await runSeed(env);

    expect(
      status,
      `missing DATABASE_URL must exit 2 (could not run), got ${status}:\n${output}`,
    ).toBe(2);
    expect(status).not.toBe(1);
    expect(output).toMatch(/DATABASE_URL is not set/);
    expect(output).not.toMatch(/Seed complete/);
  });

  it("exits 2 when DATABASE_URL is empty", async () => {
    const { status, output } = await runSeed({
      ...process.env,
      DATABASE_URL: "   ",
    });

    expect(
      status,
      `empty DATABASE_URL must exit 2 (could not run), got ${status}:\n${output}`,
    ).toBe(2);
    expect(output).toMatch(/DATABASE_URL is not set/);
  });
});
