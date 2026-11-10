import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  user: { count: vi.fn() },
  progress: { groupBy: vi.fn() },
}));
vi.mock("../utils/prisma", () => ({ default: prisma }));
vi.mock("@prisma/client", async (original) => ({
  ...(await original<typeof import("@prisma/client")>()),
  PrismaClient: class {
    constructor() {
      return prisma;
    }
  },
}));

// Reload the router to give each case a fresh production cache and limiter.
async function app() {
  const { default: router } = await import("./context");
  const server = express();
  server.set("trust proxy", 1);
  server.use("/context", router);
  return server;
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  // Synthetic aggregate fixture, with no user records returned to the process.
  prisma.user.count.mockImplementation(async ({ where }) => {
    if (where.role === "student") return where.progress ? 3 : 10;
    if (where.role === "teacher") return where.courses ? 2 : 4;
    return where.progress.some.status ? 2 : 4;
  });
  // Old implementation's equivalent fixture, for the pre-fix red proof.
  prisma.progress.groupBy.mockImplementation(async ({ where }) =>
    Array.from({ length: where ? 2 : 4 }, (_, i) => ({
      studentId: `student-${i}`,
    })),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("public Task Ranker context (#887)", () => {
  it("preserves the anonymous aggregate-only contract", async () => {
    const response = await request(await app()).get("/context");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      app: "Bright Boost",
      signals: [
        {
          type: "activation_rate",
          value: 0.3,
          label: "30% students activated",
          boost: 2,
          threshold_dir: "below",
          threshold: 0.5,
        },
        {
          type: "drop_off",
          value: 0.5,
          label: "50% drop-off after first module",
          boost: 3,
          threshold_dir: "above",
          threshold: 0.4,
        },
        {
          type: "teacher_adoption",
          value: 0.5,
          label: "50% of teachers set up class",
          boost: 2,
          threshold_dir: "below",
          threshold: 0.6,
        },
      ],
    });
  });

  it("returns zero rates for an empty deployment", async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.progress.groupBy.mockResolvedValue([]);
    const response = await request(await app()).get("/context");
    expect(response.status).toBe(200);
    expect(
      response.body.signals.map((s: { value: number }) => s.value),
    ).toEqual([0, 0, 0]);
  });

  it("uses scalar distinct-user counts instead of materializing every student ID", async () => {
    await request(await app())
      .get("/context")
      .expect(200);
    expect(prisma.progress.groupBy).not.toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { progress: { some: {} } },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { progress: { some: { status: "COMPLETED" } } },
    });
  });

  it("reuses one aggregate across IPs and query strings until its 60-second expiry", async () => {
    const server = await app();
    const first = await request(server).get("/context");
    const reads = prisma.user.count.mock.calls.length;
    vi.setSystemTime(Date.now() + 59_999);
    const cached = await request(server)
      .get("/context?cacheBust=1")
      .set("X-Forwarded-For", "192.0.2.10");
    expect(cached.body).toEqual(first.body);
    expect(prisma.user.count).toHaveBeenCalledTimes(reads);
    vi.setSystemTime(Date.now() + 1);
    prisma.user.count.mockResolvedValue(0);
    const fresh = await request(server).get("/context");
    expect(prisma.user.count).toHaveBeenCalledTimes(reads * 2);
    expect(fresh.body.signals.map((s: { value: number }) => s.value)).toEqual([
      0, 0, 0,
    ]);
  });

  it("coalesces concurrent misses while a database read is pending", async () => {
    const server = await app();
    // All count calls share a gate; requests from different IPs share one load.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    prisma.user.count.mockImplementation(async () => {
      await gate;
      return 0;
    });
    const pending = Array.from({ length: 12 }, (_, i) =>
      request(server)
        .get(`/context?request=${i}`)
        .set("X-Forwarded-For", `192.0.2.${i + 1}`)
        .then((r) => r),
    );
    await vi.waitFor(() => expect(prisma.user.count).toHaveBeenCalled());
    // Allow all HTTP requests to reach the held query without resolving it.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const reads = prisma.user.count.mock.calls.length;
    release();
    const responses = await Promise.all(pending);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(reads).toBe(6);
    expect(prisma.user.count).toHaveBeenCalledTimes(6);
  });

  it("limits requests before database work and sends a retry hint", async () => {
    const server = await app();
    for (let i = 0; i < 60; i++)
      await request(server).get("/context").expect(200);
    const reads = prisma.user.count.mock.calls.length;
    const blocked = await request(server).get("/context");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(prisma.user.count).toHaveBeenCalledTimes(reads);
    await request(server)
      .get("/context")
      .set("X-Forwarded-For", "192.0.2.20")
      .expect(200);
    expect(prisma.user.count).toHaveBeenCalledTimes(reads);
  });

  it("bounds failed refreshes for 5 seconds, then recovers without serving stale data", async () => {
    const server = await app();
    await request(server).get("/context").expect(200);
    vi.setSystemTime(Date.now() + 60_000);
    prisma.user.count.mockRejectedValue(
      new Error("private database diagnostic"),
    );
    const failed = await request(server).get("/context");
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: "Failed to compute signals" });
    const reads = prisma.user.count.mock.calls.length;
    await request(server).get("/context").expect(500);
    expect(prisma.user.count).toHaveBeenCalledTimes(reads);
    vi.setSystemTime(Date.now() + 5_000);
    prisma.user.count.mockResolvedValue(0);
    await request(server).get("/context").expect(200);
    expect(prisma.user.count).toHaveBeenCalledTimes(reads + 6);
  });
  it("keeps a failed batch coalesced until its other reads settle", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    prisma.user.count.mockImplementation(async () => {
      await gate;
      return 0;
    });
    prisma.user.count.mockRejectedValueOnce(new Error("one query failed"));
    const server = await app();
    const first = request(server)
      .get("/context")
      .then((r) => r);
    await vi.waitFor(() => expect(prisma.user.count).toHaveBeenCalledTimes(6));
    vi.setSystemTime(Date.now() + 60_000);
    const second = request(server)
      .get("/context")
      .then((r) => r);
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
    const responses = await Promise.all([first, second]);
    expect(responses.map((r) => r.status)).toEqual([500, 500]);
    expect(prisma.user.count).toHaveBeenCalledTimes(6);
  });

  it("is mounted publicly with its limiter on the real server", async () => {
    const { default: server } = await import("../server");
    const response = await request(server).get("/context");
    expect(response.status).toBe(200);
    expect(response.headers["ratelimit-limit"]).toBe("60");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.app).toBe("Bright Boost");
  });
});
