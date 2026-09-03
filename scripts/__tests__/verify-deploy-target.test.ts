/* @vitest-environment node */
/**
 * BRAND_R0 deploy-target smoke — two-phase proof.
 *
 * A local HTTP stand-in plays the deployed host (nginx SPA fallback shape:
 * unknown paths return index.html with 200). Healthy production and healthy
 * staging pass first; every sabotage then names its finding code.
 */
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkDeployTarget,
  readMeta,
  shaMatches,
} from "../verify-deploy-target.mjs";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";
const OTHER_SHA = "67b38c3d2f90c8acc4ea6122178226acbf8bab77";

interface HostState {
  metaEnv: string | null; // null = tag absent; "%VITE_APP_ENV%" = unreplaced placeholder
  metaSha: string | null;
  pageRobots: string | null;
  health: null | {
    path: "/api/health" | "/health";
    robots: string | null;
    body: Record<string, unknown>;
  };
}

const state: HostState = {
  metaEnv: null,
  metaSha: SHA,
  pageRobots: null,
  health: {
    path: "/api/health",
    robots: null,
    body: {
      status: "ok",
      env: "production",
      sha: SHA,
      noindex: false,
      analytics: "enabled",
    },
  },
};

function html(): string {
  const metas = [
    state.metaEnv === null
      ? ""
      : `<meta\n      name="bb-app-env"\n      content="${state.metaEnv}"\n    />`,
    state.metaSha === null
      ? ""
      : `<meta name="bb-git-sha" content="${state.metaSha}" />`,
  ].join("\n");
  return `<!doctype html><html lang="en"><head><title>BrightBoost</title>${metas}</head><body><div id="root"></div></body></html>`;
}

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "/";
    if (state.health && url === state.health.path) {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      if (state.health.robots)
        res.setHeader("x-robots-tag", state.health.robots);
      res.end(JSON.stringify(state.health.body));
      return;
    }
    // nginx SPA fallback: everything else is index.html with 200.
    res.statusCode = 200;
    res.setHeader("content-type", "text/html");
    if (state.pageRobots) res.setHeader("x-robots-tag", state.pageRobots);
    res.end(html());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function healthyProduction() {
  state.metaEnv = "production";
  state.metaSha = SHA;
  state.pageRobots = null;
  state.health = {
    path: "/api/health",
    robots: null,
    body: {
      status: "ok",
      env: "production",
      sha: SHA,
      noindex: false,
      analytics: "enabled",
    },
  };
}

function healthyStaging() {
  state.metaEnv = "staging";
  state.metaSha = SHA;
  state.pageRobots = "noindex, nofollow";
  state.health = {
    path: "/api/health",
    robots: "noindex, nofollow",
    body: {
      status: "ok",
      env: "staging",
      sha: SHA,
      noindex: true,
      analytics: "enabled",
    },
  };
}

const codes = (r: Awaited<ReturnType<typeof checkDeployTarget>>) =>
  r.findings.map((f) => f.code).sort();

describe("verify-deploy-target — phase 1: healthy hosts pass", () => {
  it("healthy production passes with an exact SHA", async () => {
    healthyProduction();
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.observed.health?.path).toBe("/api/health");
  });

  it("healthy production also passes when the page is undeclared (today's build) and health is on /health", async () => {
    healthyProduction();
    state.metaEnv = null;
    state.health!.path = "/health";
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA.slice(0, 7),
    });
    expect(codes(r)).toEqual([]);
    expect(r.observed.health?.path).toBe("/health");
  });

  it("healthy staging passes with noindex on page and health", async () => {
    healthyStaging();
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("verify-deploy-target — phase 2: sabotage fails with the named code", () => {
  it("staging missing noindex → DT-003 (page and health)", async () => {
    healthyStaging();
    state.pageRobots = null;
    state.health!.robots = null;
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-003", "DT-003"]);
  });

  it("production accidentally noindexed → DT-004", async () => {
    healthyProduction();
    state.pageRobots = "noindex, nofollow";
    state.health!.body.noindex = true;
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-004", "DT-004"]);
  });

  it("wrong deployed SHA → DT-002 (page) and DT-007 (health)", async () => {
    healthyStaging();
    state.metaSha = OTHER_SHA;
    state.health!.body.sha = OTHER_SHA;
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-002", "DT-007"]);
  });

  it("missing SHA (unknown / unreplaced placeholder) → DT-002 and DT-007", async () => {
    healthyStaging();
    state.metaSha = "%VITE_GIT_SHA%";
    state.health!.body.sha = "unknown";
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-002", "DT-007"]);
  });

  it("staging that never declared itself (placeholder meta) → DT-001; wrong health env → DT-006", async () => {
    healthyStaging();
    state.metaEnv = "%VITE_APP_ENV%";
    state.health!.body.env = "production";
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-001", "DT-006"]);
  });

  it("a production host whose page declares staging → DT-001", async () => {
    healthyProduction();
    state.metaEnv = "staging";
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-001"]);
  });

  it("staging configured with production analytics → DT-008", async () => {
    healthyStaging();
    state.health!.body.analytics = "refused";
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-008"]);
  });

  it("health unreachable (SPA fallback swallows it) → DT-005; a pre-BRAND_R0 health → DT-006/DT-007", async () => {
    healthyStaging();
    state.health = null;
    const r1 = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r1)).toEqual(["DT-005"]);

    healthyStaging();
    state.health!.body = {
      status: "ok",
      sharedEngine: "greatwork-engine-stub-730@0.0.0",
    };
    const r2 = await checkDeployTarget({
      baseUrl,
      expectEnv: "staging",
      expectSha: SHA,
    });
    expect(codes(r2)).toEqual(["DT-006", "DT-007"]);
  });

  it("unreachable host → DT-000 and DT-005, never a throw", async () => {
    const r = await checkDeployTarget({
      baseUrl: "http://127.0.0.1:1",
      expectEnv: "staging",
      expectSha: SHA,
      timeoutMs: 2_000,
    });
    expect(codes(r)).toEqual(["DT-000", "DT-005"]);
  });

  it("usage errors throw UsageError (exit 2 territory), not findings", async () => {
    await expect(
      checkDeployTarget({ baseUrl, expectEnv: "prod" }),
    ).rejects.toThrow(/--expect-env/);
    await expect(
      checkDeployTarget({ baseUrl: "", expectEnv: "staging" }),
    ).rejects.toThrow(/--url/);
    await expect(
      checkDeployTarget({ baseUrl, expectEnv: "staging", expectSha: "xyz" }),
    ).rejects.toThrow(/--expect-sha/);
  });
});

describe("helpers", () => {
  it("readMeta handles multi-line tags and treats placeholders as absent", () => {
    expect(
      readMeta(
        '<meta\n  name="bb-app-env"\n  content="staging"\n/>',
        "bb-app-env",
      ),
    ).toEqual({
      present: true,
      value: "staging",
    });
    expect(
      readMeta(
        '<meta name="bb-git-sha" content="%VITE_GIT_SHA%" />',
        "bb-git-sha",
      ),
    ).toEqual({
      present: true,
      value: null,
    });
    expect(readMeta("<html></html>", "bb-app-env")).toEqual({
      present: false,
      value: null,
    });
  });

  it("shaMatches accepts prefix matches of at least 7 hex chars only", () => {
    expect(shaMatches(SHA, SHA.slice(0, 7))).toBe(true);
    expect(shaMatches(SHA.slice(0, 7), SHA)).toBe(true);
    expect(shaMatches(SHA, OTHER_SHA)).toBe(false);
    expect(shaMatches("abc", SHA)).toBe(false);
    expect(shaMatches(null, SHA)).toBe(false);
  });
});

describe("CLI exit codes", { timeout: 30_000 }, () => {
  const script = path.resolve(__dirname, "../verify-deploy-target.mjs");

  function run(
    args: string[],
  ): Promise<{ status: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [script, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (c) => (stdout += String(c)));
      child.stderr.on("data", (c) => (stderr += String(c)));
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    });
  }

  it("exit 0 on a healthy staging host, 1 with the code on sabotage, 2 on usage error", async () => {
    healthyStaging();
    const healthy = await run([
      "--url",
      baseUrl,
      "--expect-env",
      "staging",
      "--expect-sha",
      SHA,
      "--json",
    ]);
    expect(healthy.status).toBe(0);
    expect(JSON.parse(healthy.stdout).ok).toBe(true);

    state.pageRobots = null;
    state.health!.robots = null;
    const red = await run([
      "--url",
      baseUrl,
      "--expect-env",
      "staging",
      "--expect-sha",
      SHA,
      "--json",
    ]);
    expect(red.status).toBe(1);
    expect(
      JSON.parse(red.stdout).findings.map((f: { code: string }) => f.code),
    ).toContain("DT-003");

    const usage = await run(["--url", baseUrl]);
    expect(usage.status).toBe(2);
    expect(usage.stderr).toMatch(/--expect-env/);
  });
});
