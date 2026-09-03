/* @vitest-environment node */
/**
 * BRAND_R0 — environment posture on the wire.
 *
 * Proves, per environment, what `/health` reports and whether responses carry
 * `X-Robots-Tag`. Two-phase: the healthy production and staging shapes first,
 * then the shapes the deploy-target smoke must reject — including the
 * consistency contract's central case, a Railway staging environment that
 * inherited `APP_ENV=production`.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  progress: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  avatar: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

const MANAGED_KEYS = [
  "APP_ENV",
  "RAILWAY_ENVIRONMENT_NAME",
  "GIT_SHA",
  "RAILWAY_GIT_COMMIT_SHA",
  "POSTHOG_KEY",
  "POSTHOG_KEY_ENV",
  "SERVE_FRONTEND",
] as const;

const saved: Partial<
  Record<(typeof MANAGED_KEYS)[number], string | undefined>
> = {};

async function loadApp(
  env: Partial<Record<(typeof MANAGED_KEYS)[number], string>>,
) {
  for (const key of MANAGED_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  vi.resetModules();
  const mod = await import("./server");
  return mod.default;
}

beforeEach(() => {
  for (const key of MANAGED_KEYS) saved[key] = process.env[key];
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

// The first `import("./server")` transforms the whole backend graph; under a
// full `npm test` run with parallel workers it has exceeded Vitest's default
// 5 s test timeout (observed in the parity gate). Warm it once with a long hook
// timeout so each case measures the property, not the cold transform.
beforeAll(async () => {
  await loadApp({});
}, 120_000);

describe("/health environment posture (BRAND_R0)", { timeout: 60_000 }, () => {
  it("healthy production: Railway + APP_ENV agree, labelled key → enabled, no X-Robots-Tag", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "production",
      APP_ENV: "production",
      RAILWAY_GIT_COMMIT_SHA: SHA,
      POSTHOG_KEY: "phc_not_a_real_key",
      POSTHOG_KEY_ENV: "production",
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      env: "production",
      envSource: "railway",
      declaredEnv: "production",
      railwayEnv: "production",
      railwayEnvironmentName: "production",
      mismatch: "none",
      configError: null,
      sha: SHA,
      noindex: false,
      analytics: "enabled",
    });
    expect(res.headers["x-robots-tag"]).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("healthy staging: Railway + APP_ENV agree, staging key → enabled, noindex on /health and /api/health", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "staging",
      GIT_SHA: SHA,
      POSTHOG_KEY: "phc_not_a_real_key",
      POSTHOG_KEY_ENV: "staging",
    });
    for (const path of ["/health", "/api/health"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "ok",
        env: "staging",
        envSource: "railway",
        declaredEnv: "staging",
        mismatch: "none",
        sha: SHA,
        noindex: true,
        analytics: "enabled",
      });
      expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    }
  });

  it("today's production (NODE_ENV only, unlabeled key) → production, analytics=enabled-unlabeled, warned once", async () => {
    const app = await loadApp({ POSTHOG_KEY: "phc_not_a_real_key" });
    // NODE_ENV is "test" under Vitest, so declare production outside Railway to
    // model the pre-BRAND_R0 host without a Railway name.
    const app2 = await loadApp({
      APP_ENV: "production",
      POSTHOG_KEY: "phc_not_a_real_key",
    });
    void app;
    const res = await request(app2).get("/health");
    expect(res.body).toMatchObject({
      env: "production",
      envSource: "declared",
      declaredEnv: "production",
      railwayEnv: null,
      mismatch: "none",
      noindex: false,
      analytics: "enabled-unlabeled",
    });
    expect(res.headers["x-robots-tag"]).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[analytics] enabled WITHOUT a label"),
    );
  });

  it("SABOTAGE: Railway staging that inherited APP_ENV=production → preview, noindex, analytics refused, startup error", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "production",
      RAILWAY_GIT_COMMIT_SHA: SHA,
      POSTHOG_KEY: "phc_not_a_real_key",
      POSTHOG_KEY_ENV: "production",
    });
    const res = await request(app).get("/api/health");
    expect(res.body).toMatchObject({
      env: "preview",
      envSource: "railway",
      declaredEnv: "production",
      railwayEnv: "staging",
      mismatch: "declared-vs-railway",
      noindex: true,
      analytics: "refused",
    });
    expect(res.body.configError).toContain(
      "APP_ENV=production disagrees with RAILWAY_ENVIRONMENT_NAME",
    );
    expect(res.body.configError).not.toContain("phc_");
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "[deploy-env] CONFIGURATION ERROR (declared-vs-railway)",
      ),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[analytics] REFUSED"),
    );
  });

  it("SABOTAGE: Railway production with APP_ENV=staging → preview + noindex, never production", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "production",
      APP_ENV: "staging",
    });
    const res = await request(app).get("/health");
    expect(res.body).toMatchObject({
      env: "preview",
      mismatch: "declared-vs-railway",
      noindex: true,
    });
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });

  it("the non-production header reaches API responses too (not only /health)", async () => {
    const app = await loadApp({ APP_ENV: "staging" });
    const res = await request(app).post("/api/login").send({});
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });

  it("sha is reported as unknown when no SHA variable is present", async () => {
    const app = await loadApp({ APP_ENV: "staging" });
    const res = await request(app).get("/health");
    expect(res.body.sha).toBe("unknown");
  });

  it("staging with the production-labelled key reports analytics=refused", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "staging",
      POSTHOG_KEY: "phc_not_a_real_key",
      POSTHOG_KEY_ENV: "production",
    });
    const res = await request(app).get("/health");
    expect(res.body.analytics).toBe("refused");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[analytics] REFUSED"),
    );
  });

  it("staging with a preview-labelled key (foreign non-production label) reports analytics=refused", async () => {
    const app = await loadApp({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "staging",
      POSTHOG_KEY: "phc_not_a_real_key",
      POSTHOG_KEY_ENV: "preview",
    });
    const res = await request(app).get("/health");
    expect(res.body.analytics).toBe("refused");
  });

  it("staging with an unlabeled PostHog key reports analytics=refused", async () => {
    const app = await loadApp({
      APP_ENV: "staging",
      POSTHOG_KEY: "phc_not_a_real_key",
    });
    const res = await request(app).get("/health");
    expect(res.body.analytics).toBe("refused");
  });

  it("no PostHog key reports analytics=disabled in every environment", async () => {
    const app = await loadApp({ APP_ENV: "production" });
    const res = await request(app).get("/health");
    expect(res.body.analytics).toBe("disabled");
  });

  it("a Railway environment named staging is noindexed even without APP_ENV", async () => {
    const app = await loadApp({ RAILWAY_ENVIRONMENT_NAME: "staging" });
    const res = await request(app).get("/health");
    expect(res.body).toMatchObject({
      env: "staging",
      envSource: "railway",
      declaredEnv: null,
      noindex: true,
    });
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
