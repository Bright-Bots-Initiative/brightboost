/* @vitest-environment node */
/**
 * BRAND_R0 deploy-target smoke — two-phase proof for both modes.
 *
 * A local HTTP stand-in plays the deployed host (nginx SPA fallback shape:
 * unknown paths return index.html with 200). Healthy production and healthy
 * staging pass first, in compat and in strict mode; every sabotage then names
 * its finding code.
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

interface PageMetas {
  declared: string | null;
  railway: string | null;
  effective: string | null;
  source: string | null;
  mismatch: string | null;
  sha: string | null;
}

interface HostState {
  metas: PageMetas;
  pageRobots: string | null;
  health: null | {
    path: "/api/health" | "/health";
    robots: string | null;
    body: Record<string, unknown>;
  };
}

const state: HostState = {
  metas: {
    declared: null,
    railway: null,
    effective: null,
    source: null,
    mismatch: null,
    sha: null,
  },
  pageRobots: null,
  health: null,
};

function meta(name: string, value: string | null): string {
  return value === null ? "" : `<meta name="${name}" content="${value}" />`;
}

function html(): string {
  const m = state.metas;
  return `<!doctype html><html lang="en"><head><title>BrightBoost</title>
    ${meta("bb-app-env", m.declared)}
    ${meta("bb-railway-env", m.railway)}
    ${meta("bb-env-effective", m.effective)}
    ${meta("bb-env-source", m.source)}
    ${meta("bb-env-mismatch", m.mismatch)}
    ${meta("bb-git-sha", m.sha)}
    </head><body><div id="root"></div></body></html>`;
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
  state.metas = {
    declared: "production",
    railway: "production",
    effective: "production",
    source: "railway",
    mismatch: "none",
    sha: SHA,
  };
  state.pageRobots = null;
  state.health = {
    path: "/api/health",
    robots: null,
    body: {
      status: "ok",
      env: "production",
      envSource: "railway",
      declaredEnv: "production",
      railwayEnv: "production",
      mismatch: "none",
      sha: SHA,
      noindex: false,
      analytics: "enabled",
    },
  };
}

function healthyStaging() {
  state.metas = {
    declared: "staging",
    railway: "staging",
    effective: "staging",
    source: "railway",
    mismatch: "none",
    sha: SHA,
  };
  state.pageRobots = "noindex, nofollow";
  state.health = {
    path: "/api/health",
    robots: "noindex, nofollow",
    body: {
      status: "ok",
      env: "staging",
      envSource: "railway",
      declaredEnv: "staging",
      railwayEnv: "staging",
      mismatch: "none",
      sha: SHA,
      noindex: true,
      analytics: "enabled",
    },
  };
}

/** The pre-BRAND_R0 production host: undeclared page, unlabeled analytics. */
function bootstrapProduction() {
  healthyProduction();
  state.metas = {
    declared: null,
    railway: null,
    effective: null,
    source: null,
    mismatch: null,
    sha: SHA,
  };
  state.health!.path = "/health";
  state.health!.body = {
    status: "ok",
    env: "production",
    envSource: "node_env",
    declaredEnv: null,
    railwayEnv: null,
    mismatch: "none",
    sha: SHA,
    noindex: false,
    analytics: "enabled-unlabeled",
  };
}

const codes = (r: Awaited<ReturnType<typeof checkDeployTarget>>) =>
  r.findings.map((f) => f.code).sort();

const strictProd = {
  baseUrl: "",
  expectEnv: "production",
  expectSha: SHA,
  strict: true,
  expectAnalytics: "enabled",
};
const strictStaging = {
  baseUrl: "",
  expectEnv: "staging",
  expectSha: SHA,
  strict: true,
  expectAnalytics: "enabled",
};

describe("verify-deploy-target — phase 1: healthy hosts pass", () => {
  it("strict production passes", async () => {
    healthyProduction();
    const r = await checkDeployTarget({ ...strictProd, baseUrl });
    expect(codes(r)).toEqual([]);
    expect(r.mode).toBe("strict");
  });

  it("strict staging passes (noindex on page and health, declared, consistent, sha known both sides)", async () => {
    healthyStaging();
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual([]);
  });

  it("strict staging with analytics intentionally disabled passes when expected", async () => {
    healthyStaging();
    state.health!.body.analytics = "disabled";
    const r = await checkDeployTarget({
      ...strictStaging,
      baseUrl,
      expectAnalytics: "disabled",
    });
    expect(codes(r)).toEqual([]);
  });

  it("compat mode accepts the pre-BRAND_R0 production host (undeclared page, unlabeled analytics, /health)", async () => {
    bootstrapProduction();
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA.slice(0, 7),
      expectAnalytics: "enabled",
    });
    expect(codes(r)).toEqual([]);
    expect(r.mode).toBe("compat");
    expect(r.observed.health?.path).toBe("/health");
  });
});

describe("verify-deploy-target — phase 2: sabotage fails with the named code", () => {
  it("SABOTAGE strict: undeclared production → DT-012 (page and health)", async () => {
    bootstrapProduction();
    state.health!.body.analytics = "enabled";
    const r = await checkDeployTarget({ ...strictProd, baseUrl });
    expect(codes(r)).toEqual(["DT-012", "DT-012"]);
  });

  it("SABOTAGE strict: unlabeled production analytics → DT-011", async () => {
    healthyProduction();
    state.health!.body.analytics = "enabled-unlabeled";
    const r = await checkDeployTarget({ ...strictProd, baseUrl });
    expect(codes(r)).toEqual(["DT-011"]);
    // …but compat mode tolerates it for the bootstrap check.
    const c = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA,
      expectAnalytics: "enabled",
    });
    expect(codes(c)).toEqual([]);
  });

  it("SABOTAGE: configuration mismatch (copied APP_ENV=production on Railway staging) → DT-010 on both sides plus the effective-env findings", async () => {
    healthyStaging();
    state.metas = {
      ...state.metas,
      declared: "production",
      effective: "preview",
      mismatch: "declared-vs-railway",
    };
    state.health!.body = {
      ...state.health!.body,
      env: "preview",
      declaredEnv: "production",
      mismatch: "declared-vs-railway",
      analytics: "refused",
    };
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toContain("DT-010");
    expect(codes(r).filter((c) => c === "DT-010")).toHaveLength(2);
    expect(codes(r)).toContain("DT-008");
    expect(codes(r)).toContain("DT-012");
    expect(codes(r)).toContain("DT-001");
    expect(codes(r)).toContain("DT-006");
  });

  it("SABOTAGE strict: frontend and backend disagree on environment → DT-009 (+ DT-006)", async () => {
    healthyStaging();
    state.health!.body = {
      ...state.health!.body,
      env: "production",
      declaredEnv: "staging",
      noindex: false,
    };
    state.health!.robots = null;
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toContain("DT-009");
    expect(codes(r)).toContain("DT-006");
  });

  it("SABOTAGE strict: environment sources differ (frontend built without the Railway value) → DT-009", async () => {
    healthyStaging();
    state.metas = { ...state.metas, railway: null, source: "declared" };
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual(["DT-009"]);
  });

  it("SABOTAGE strict: frontend and backend SHAs differ → DT-013 (+ the side that misses expected)", async () => {
    healthyStaging();
    state.metas.sha = OTHER_SHA;
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual(["DT-002", "DT-013"]);
  });

  it("SABOTAGE: staging missing noindex → DT-003 (page and health)", async () => {
    healthyStaging();
    state.pageRobots = null;
    state.health!.robots = null;
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual(["DT-003", "DT-003"]);
  });

  it("SABOTAGE: production accidentally noindexed → DT-004", async () => {
    healthyProduction();
    state.pageRobots = "noindex, nofollow";
    state.health!.body.noindex = true;
    const r = await checkDeployTarget({ ...strictProd, baseUrl });
    expect(codes(r)).toEqual(["DT-004", "DT-004"]);
  });

  it("SABOTAGE: wrong deployed SHA → DT-002 (page) and DT-007 (health)", async () => {
    healthyStaging();
    state.metas.sha = OTHER_SHA;
    state.health!.body.sha = OTHER_SHA;
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual(["DT-002", "DT-007"]);
  });

  it("SABOTAGE: unknown SHA on both sides → DT-002 and DT-007", async () => {
    healthyStaging();
    state.metas.sha = "%BB_GIT_SHA%";
    state.health!.body.sha = "unknown";
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual(["DT-002", "DT-007"]);
  });

  it("SABOTAGE: analytics refused → DT-008 in every mode", async () => {
    healthyStaging();
    state.health!.body.analytics = "refused";
    expect(
      codes(await checkDeployTarget({ ...strictStaging, baseUrl })),
    ).toEqual(["DT-008"]);
    expect(
      codes(
        await checkDeployTarget({
          baseUrl,
          expectEnv: "staging",
          expectSha: SHA,
        }),
      ),
    ).toEqual(["DT-008"]);
  });

  it("SABOTAGE strict: analytics expectation unmet (disabled when enabled expected, and vice versa) → DT-011", async () => {
    healthyStaging();
    state.health!.body.analytics = "disabled";
    expect(
      codes(await checkDeployTarget({ ...strictStaging, baseUrl })),
    ).toEqual(["DT-011"]);
    state.health!.body.analytics = "enabled";
    expect(
      codes(
        await checkDeployTarget({
          ...strictStaging,
          baseUrl,
          expectAnalytics: "disabled",
        }),
      ),
    ).toEqual(["DT-011"]);
  });

  it("SABOTAGE: health unreachable → DT-005; a pre-contract backend under strict → DT-006/DT-007/DT-010/DT-012", async () => {
    healthyStaging();
    state.health = null;
    expect(
      codes(await checkDeployTarget({ ...strictStaging, baseUrl })),
    ).toEqual(["DT-005"]);

    healthyStaging();
    state.health!.body = {
      status: "ok",
      sharedEngine: "greatwork-engine-stub-730@0.0.0",
    };
    const r = await checkDeployTarget({ ...strictStaging, baseUrl });
    expect(codes(r)).toEqual([
      "DT-006",
      "DT-007",
      "DT-010",
      "DT-011",
      "DT-012",
    ]);
  });

  it("SABOTAGE compat: a production host whose page declares staging → DT-001", async () => {
    healthyProduction();
    state.metas = { ...state.metas, declared: "staging", effective: "staging" };
    const r = await checkDeployTarget({
      baseUrl,
      expectEnv: "production",
      expectSha: SHA,
    });
    expect(codes(r)).toEqual(["DT-001"]);
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
    await expect(
      checkDeployTarget({ baseUrl, expectEnv: "staging", strict: true }),
    ).rejects.toThrow(/--expect-sha/);
    await expect(
      checkDeployTarget({
        baseUrl,
        expectEnv: "staging",
        strict: true,
        expectSha: SHA,
      }),
    ).rejects.toThrow(/--expect-analytics/);
  });
});

describe("helpers", () => {
  it("readMeta handles multi-line tags and treats placeholders/empties as absent", () => {
    expect(
      readMeta(
        '<meta\n  name="bb-app-env"\n  content="staging"\n/>',
        "bb-app-env",
      ),
    ).toEqual({ present: true, value: "staging" });
    expect(
      readMeta(
        '<meta name="bb-git-sha" content="%BB_GIT_SHA%" />',
        "bb-git-sha",
      ),
    ).toEqual({ present: true, value: null });
    expect(
      readMeta('<meta name="bb-app-env" content="" />', "bb-app-env"),
    ).toEqual({ present: true, value: null });
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

  it("exit 0 on a healthy strict staging host, 1 with the code on sabotage, 2 on usage error", async () => {
    healthyStaging();
    const healthy = await run([
      "--url",
      baseUrl,
      "--expect-env",
      "staging",
      "--expect-sha",
      SHA,
      "--require-declared-env",
      "--expect-analytics",
      "enabled",
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
      "--require-declared-env",
      "--expect-analytics",
      "enabled",
      "--json",
    ]);
    expect(red.status).toBe(1);
    expect(
      JSON.parse(red.stdout).findings.map((f: { code: string }) => f.code),
    ).toContain("DT-003");

    const usage = await run([
      "--url",
      baseUrl,
      "--expect-env",
      "staging",
      "--require-declared-env",
    ]);
    expect(usage.status).toBe(2);
    expect(usage.stderr).toMatch(/--expect-sha/);
  });
});
