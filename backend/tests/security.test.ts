import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/server";

describe("Security Middleware", () => {
  it("should have security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-download-options"]).toBe("noopen");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should enforce rate limiting on API routes", async () => {
    // We need to send enough requests to trigger the rate limit.
    // The limit is 100 per 15 mins.
    // Note: We are using a fresh supertest app instance, but rate limiter state is usually kept in memory.
    // However, vitest might isolate tests or app instance might be fresh.
    // Let's check if we can trigger it.

    // To avoid running 101 requests in a test (slow), we could mock the rate limiter or just try to trigger it quickly if possible.
    // But since we can't easily mock the config without changing code, we might need to send 101 requests.
    // Or we could mock the `rateLimit` function if we want to test that it is applied, but integration test is better.
    // 100 requests is not too many for a local test loop.

    const agent = request(app); // Use agent to persist cookies/session if needed, but here it's IP based.

    // Send 100 requests (allowed)
    // We only test /api/something. Let's use /api/health if it existed, or a public route /api/login (but that needs body).
    // /api/signup/student is public. Or we can just hit /api (404 but still middleware triggers).
    // Let's use a non-existent route under /api to avoid side effects, rate limiter should still trigger.
    const url = "/api/rate-limit-test-" + Math.random();

    // Fast loop
    const limit = 100;
    const promises = [];
    for (let i = 0; i < limit; i++) {
      promises.push(agent.get(url));
    }
    await Promise.all(promises);

    // The 101st request should be blocked
    const res = await agent.get(url);
    expect(res.status).toBe(429);
    expect(res.text).toContain("Too many requests");
  });

  it("should NOT enforce rate limiting on non-API routes (e.g. health)", async () => {
    // Since we consumed the rate limit for our IP in the previous test (if state persists),
    // we should check if /health still works.
    // express-rate-limit defaults to memory store.
    // If previous test ran, our IP is blocked for /api.
    // But /health is NOT under /api, so it should be fine.

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
