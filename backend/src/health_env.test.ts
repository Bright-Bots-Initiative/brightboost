/* @vitest-environment node */
/**
 * BRAND_R0 — environment posture on the wire.
 *
 * Proves, per environment, what `/health` reports and whether responses carry
 * `X-Robots-Tag`. Two-phase: the healthy production and staging shapes first,
 * then the shapes the deploy-target smoke must reject.
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
  it("healthy production: env=production, sha, no X-Robots-Tag, analytics enabled", async () => {
    const app = await loadApp({
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
      envSource: "APP_ENV",
      sha: SHA,
      noindex: false,
      analytics: "enabled",
    });
    expect(res.headers["x-robots-tag"]).toBeUndefined();
  });

  it("healthy staging: env=staging, X-Robots-Tag noindex on /health and /api/health", async () => {
    const app = await loadApp({
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
        sha: SHA,
        noindex: true,
        analytics: "enabled",
      });
      expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    }
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

  it("staging that inherited the production PostHog key reports analytics=refused", async () => {
    const app = await loadApp({
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
      envSource: "RAILWAY_ENVIRONMENT_NAME",
      noindex: true,
    });
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
