import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

// Prisma mock (hoisted so it exists before the module mocks below apply).
const prismaMock = vi.hoisted(() => ({
  course: { findFirst: vi.fn() },
  enrollment: { findMany: vi.fn() },
  progress: { findMany: vi.fn() },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

vi.mock("../utils/prisma", () => ({
  default: new PrismaClient(),
}));

// Import app AFTER mocking.
import app from "../server";

const TEACHER = "teacher-1";
const OTHER_TEACHER = "teacher-2";
const COURSE = "course-1";

function asTeacher(id: string) {
  return { "x-user-id": id, "x-role": "teacher" } as Record<string, string>;
}
function asStudent(id: string) {
  return { "x-user-id": id, "x-role": "student" } as Record<string, string>;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe("GET /api/teacher/courses/:courseId/attention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Lets the devRoleShim trust x-user-id / x-role headers (test-only).
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
  });

  it("404s when the teacher does not own the course", async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention`)
      .set(asTeacher(OTHER_TEACHER));
    expect(res.status).toBe(404);
  });

  it("403s for a student (teacher-only)", async () => {
    const res = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention`)
      .set(asStudent("kid-1"));
    expect(res.status).toBe(403);
  });

  it("returns an empty list (and skips the Progress query) when no one is enrolled", async () => {
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE });
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention`)
      .set(asTeacher(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ staleDays: 3, students: [] });
    expect(prismaMock.progress.findMany).not.toHaveBeenCalled();
  });

  it("groups stale in-progress activities per student (keeps oldest, no email)", async () => {
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE });
    prismaMock.enrollment.findMany.mockResolvedValue([
      { studentId: "kid-1" },
      { studentId: "kid-2" },
    ]);
    // Endpoint preserves this (oldest-first) order; first row per student wins.
    prismaMock.progress.findMany.mockResolvedValue([
      { studentId: "kid-1", moduleSlug: "m1", activityId: "a1", updatedAt: daysAgo(5), User: { name: "Ada Lovelace" } },
      { studentId: "kid-1", moduleSlug: "m1", activityId: "a2", updatedAt: daysAgo(4), User: { name: "Ada Lovelace" } },
      { studentId: "kid-2", moduleSlug: "m2", activityId: "a3", updatedAt: daysAgo(7), User: { name: "Grace Hopper" } },
    ]);

    const res = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention`)
      .set(asTeacher(TEACHER));

    expect(res.status).toBe(200);
    expect(res.body.staleDays).toBe(3);
    expect(res.body.students).toHaveLength(2);

    const ada = res.body.students[0];
    expect(ada.studentId).toBe("kid-1");
    expect(ada.studentName).toBe("Ada Lovelace");
    expect(ada.inProgressCount).toBe(2);
    expect(ada.activityId).toBe("a1"); // oldest kept as the representative
    expect(ada.daysSinceActive).toBeGreaterThanOrEqual(5);
    expect(ada.email).toBeUndefined(); // never leak email

    expect(res.body.students[1].studentId).toBe("kid-2");

    // Progress query filters IN_PROGRESS older than the cutoff date.
    const where = prismaMock.progress.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("IN_PROGRESS");
    expect(where.updatedAt.lt).toBeInstanceOf(Date);
    expect(where.studentId.in).toEqual(["kid-1", "kid-2"]);
  });

  it("honors a custom staleDays within bounds and falls back when out of range", async () => {
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE });
    prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: "kid-1" }]);
    prismaMock.progress.findMany.mockResolvedValue([]);

    const ok = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention?staleDays=7`)
      .set(asTeacher(TEACHER));
    expect(ok.body.staleDays).toBe(7);

    const tooLow = await request(app)
      .get(`/api/teacher/courses/${COURSE}/attention?staleDays=0`)
      .set(asTeacher(TEACHER));
    expect(tooLow.body.staleDays).toBe(3);
  });
});
