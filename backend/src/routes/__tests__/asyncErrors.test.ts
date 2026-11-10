import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const db = vi.hoisted(() => ({
  course: { findMany: vi.fn(), findFirst: vi.fn() },
  pathwayCohort: { findMany: vi.fn(), findFirst: vi.fn() },
  moduleFamily: { findMany: vi.fn() },
  experiment: { findMany: vi.fn() },
  creation: { findUnique: vi.fn() },
  enrollment: { findMany: vi.fn(), findUnique: vi.fn() },
  feedback: { create: vi.fn() },
  progress: { findMany: vi.fn() },
  activity: { findMany: vi.fn() },
  pulseResponse: { count: vi.fn() },
  user: { findUnique: vi.fn() },
  avatar: { findUnique: vi.fn() },
  pDSession: { findMany: vi.fn() },
  benchmarkTemplate: { findMany: vi.fn() },
  resource: { findMany: vi.fn() },
}));
vi.mock("../../utils/prisma", () => ({ default: db }));
vi.mock("@prisma/client", async (original) => ({
  ...(await original<typeof import("@prisma/client")>()),
  PrismaClient: class {
    constructor() {
      return db;
    }
  },
}));

// Exercise the actual bootstrap and global error handler, not a router mounted
// on a test-only error handler. Import order is part of the regression (#848).
import app, { handleError } from "../../server";
import type { Request, Response } from "express";

type RouteCase = {
  file: string;
  method?: "get" | "post";
  url: string;
  role?: "student" | "teacher" | "admin";
  body?: Record<string, unknown>;
  read: ReturnType<typeof vi.fn>;
  healthy: number;
  error?: string;
};
const cases: RouteCase[] = [
  {
    file: "courses",
    url: "/teacher/courses",
    role: "teacher",
    read: db.course.findMany,
    healthy: 200,
  },
  {
    file: "pathways",
    url: "/pathways/cohorts",
    role: "teacher",
    read: db.pathwayCohort.findMany,
    healthy: 200,
  },
  {
    file: "moduleCatalog",
    url: "/module-catalog/families",
    role: "student",
    read: db.moduleFamily.findMany,
    healthy: 200,
  },
  {
    file: "experiments",
    url: "/experiments",
    role: "admin",
    read: db.experiment.findMany,
    healthy: 200,
  },
  {
    file: "creations",
    url: "/creations/missing",
    role: "student",
    read: db.creation.findUnique,
    healthy: 404,
  },
  {
    file: "assignments",
    url: "/student/assignments",
    role: "student",
    read: db.enrollment.findMany,
    healthy: 200,
  },
  {
    file: "auth",
    method: "post",
    url: "/auth/lookup-code",
    body: { code: "EXAMPLE" },
    read: db.course.findFirst,
    healthy: 404,
  },
  {
    file: "feedback",
    method: "post",
    url: "/feedback",
    role: "student",
    body: { liked: "The game" },
    read: db.feedback.create,
    healthy: 201,
  },
  {
    file: "pulse",
    method: "post",
    url: "/pulse",
    role: "student",
    body: { courseId: "course", kind: "PRE", score: 3 },
    read: db.enrollment.findUnique,
    healthy: 403,
  },
  {
    file: "studentStats",
    url: "/student/stats",
    role: "student",
    read: db.progress.findMany,
    healthy: 200,
  },
  // Existing catches must keep their route-specific error contracts too.
  {
    file: "profile",
    url: "/profile",
    role: "student",
    read: db.user.findUnique,
    healthy: 404,
  },
  {
    file: "avatar",
    url: "/avatar/specialty-status",
    role: "student",
    read: db.progress.findMany,
    healthy: 200,
    error: "Could not load specialty status",
  },
  {
    file: "pd",
    url: "/teacher/pd-sessions",
    role: "teacher",
    read: db.pDSession.findMany,
    healthy: 200,
    error: "Failed to fetch PD sessions",
  },
  {
    file: "benchmarks",
    url: "/teacher/benchmark-templates",
    role: "teacher",
    read: db.benchmarkTemplate.findMany,
    healthy: 200,
    error: "Failed to fetch templates",
  },
  {
    file: "resources",
    url: "/teacher/resources",
    role: "teacher",
    read: db.resource.findMany,
    healthy: 200,
    error: "Failed to fetch resources",
  },
];

function send(route: RouteCase, authenticated = true) {
  const agent = request(app);
  const req = agent[route.method ?? "get"](`/api${route.url}`).timeout({
    response: 5_000,
    deadline: 6_000,
  });
  if (authenticated && route.role)
    req.set("x-role", route.role).set("x-user-id", "example-user");
  return route.body ? req.send(route.body) : req;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ALLOW_DEV_ROLE_HEADER", "1");
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const model of Object.values(db))
    for (const [method, fn] of Object.entries(model)) {
      fn.mockResolvedValue(
        method === "findMany" ? [] : method === "count" ? 0 : null,
      );
    }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("async errors reach the server boundary (#848)", () => {
  it.each(cases)(
    "$file: healthy response, then rejected DB work gets JSON 500 without hanging",
    async (route) => {
      if (route.role === "admin")
        db.user.findUnique.mockResolvedValue({ role: "admin" });
      const healthy = await send(route);
      expect(healthy.status).toBe(route.healthy);
      expect(route.read).toHaveBeenCalled();
      route.read.mockRejectedValueOnce(
        new Error("private database diagnostic"),
      );
      const failed = await send(route);
      expect(failed.status).toBe(500);
      expect(failed.type).toBe("application/json");
      expect(failed.body).toEqual({
        error: route.error ?? "Internal server error",
      });
      expect(failed.text).not.toContain("private database diagnostic");
    },
    10_000,
  );

  it.each(cases.filter((route) => route.role))(
    "$file: authentication still stops the request before database work",
    async (route) => {
      const response = await send(route, false);
      expect(response.status).toBe(401);
      expect(route.read).not.toHaveBeenCalled();
    },
  );

  it.each(["status", "statusCode"])(
    "preserves %s on an async client error",
    async (field) => {
      db.course.findMany.mockRejectedValueOnce(
        Object.assign(new Error("Request conflict"), { [field]: 409 }),
      );
      const response = await send(cases[0]);
      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: "Request conflict" });
    },
  );

  it("preserves role and validation rejections", async () => {
    await request(app)
      .get("/api/teacher/courses")
      .set("Authorization", "Bearer mock-token-for-mvp")
      .expect(403);
    expect(db.course.findMany).not.toHaveBeenCalled();
    const invalid = await request(app).post("/api/auth/lookup-code").send({});
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: "Code is required" });
    expect(db.course.findFirst).not.toHaveBeenCalled();
  });
  it("delegates an error after headers were sent instead of writing a second response", () => {
    const error = new Error("late failure");
    const next = vi.fn();
    const status = vi.fn();
    handleError(
      error,
      {} as Request,
      { headersSent: true, status } as unknown as Response,
      next,
    );
    expect(next).toHaveBeenCalledExactlyOnceWith(error);
    expect(status).not.toHaveBeenCalled();
  });
});
