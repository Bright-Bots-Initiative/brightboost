import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #871 — teacher access is scoped to the classes / home groups a teacher owns.
 *
 * Runs through the mounted Express app with the real auth middleware
 * (dev-header identity, NODE_ENV=test) and the real policy in
 * utils/authorization.ts. Only Prisma is mocked: `enrollment.findFirst`
 * answers the single relationship question the policy asks, so each case
 * below states exactly which relationship exists.
 *
 * RED evidence (this suite against the pre-fix routes from main 72746e87):
 * 9 of 20 cases fail — PROF-2/3/5/7/10, PROG-2/4 and CKPT-2/3. Any teacher
 * received 200 with the target's email (and the same 200/404 split exposed
 * whether an id existed), enrollment removal changed nothing, and teachers
 * and admins could write another learner's checkpoint. Student-to-student
 * denial (PROF-6, PROG-3, CKPT-4) already held on the baseline.
 */

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  enrollment: { findFirst: vi.fn() },
  progress: { upsert: vi.fn(), findMany: vi.fn() },
  unit: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

const getAggregatedProgressMock = vi.hoisted(() => vi.fn());
vi.mock("../../services/progress", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/progress")>();
  return { ...actual, getAggregatedProgress: getAggregatedProgressMock };
});

import app from "../../server";

const TEACHER = { id: "teacher-owner", role: "teacher" } as const;
const OTHER_TEACHER = { id: "teacher-stranger", role: "teacher" } as const;
const STUDENT = { id: "student-a", role: "student" } as const;
const OTHER_STUDENT = { id: "student-b", role: "student" } as const;
const ADMIN = { id: "staff-1", role: "admin" } as const;

const STUDENT_ROW = {
  id: STUDENT.id,
  name: "Ada",
  email: "ada@example.com",
  role: "student",
  school: null,
  subject: null,
  avatarUrl: null,
  createdAt: new Date("2026-01-01"),
};

const TEACHER_ROW = {
  id: OTHER_TEACHER.id,
  name: "Grace",
  email: "grace@school.org",
  role: "teacher",
  school: "Hilltop",
  subject: "Science",
  avatarUrl: null,
  createdAt: new Date("2026-01-01"),
};

function as(actor: { id: string; role: string }) {
  return { "x-user-id": actor.id, "x-role": actor.role };
}

/**
 * The teacher owns a course in which `studentId` is enrolled. The mock plays
 * the database join: the row is returned only when the query's predicates
 * (student id, owning teacher, target role) all hold for the fixture.
 */
function enrolledWith(
  teacherId: string,
  studentId: string,
  targetRole: "student" | "teacher" = "student",
) {
  prismaMock.enrollment.findFirst.mockImplementation(({ where }: any) => {
    const ok =
      where.studentId === studentId &&
      where.course?.teacherId === teacherId &&
      where.student?.role === targetRole;
    return Promise.resolve(ok ? { id: "enr-1" } : null);
  });
}

function noEnrollments() {
  prismaMock.enrollment.findFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEV_ROLE_HEADER = "1";
  prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
    if (where.id === STUDENT.id) return Promise.resolve(STUDENT_ROW);
    if (where.id === OTHER_TEACHER.id) return Promise.resolve(TEACHER_ROW);
    return Promise.resolve(null);
  });
  getAggregatedProgressMock.mockResolvedValue({
    moduleSlug: "stem-1",
    units: [],
  });
  prismaMock.progress.upsert.mockImplementation(({ create }: any) =>
    Promise.resolve({
      id: "prog-1",
      timeSpentS: create.timeSpentS,
      status: create.status,
      studentId: create.studentId,
    }),
  );
});

describe("#871 profile reads — GET /api/users/:id", () => {
  it("PROF-1: a student reads their own profile", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(STUDENT));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(STUDENT.id);
    // Self needs no relationship lookup.
    expect(prismaMock.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it("PROF-2: an unrelated teacher is denied and learns nothing", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(OTHER_TEACHER));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden" });
    expect(JSON.stringify(res.body)).not.toContain("ada@example.com");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("PROF-3: an unrelated teacher gets the same 403 for an id that does not exist", async () => {
    noEnrollments();
    const res = await request(app)
      .get("/api/users/no-such-user")
      .set(as(OTHER_TEACHER));
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("PROF-4: the teacher who owns the student's class reads the profile", async () => {
    enrolledWith(TEACHER.id, STUDENT.id);
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(TEACHER));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ada@example.com");
  });

  it("PROF-5: removing the enrollment revokes the teacher's access", async () => {
    enrolledWith(TEACHER.id, STUDENT.id);
    const before = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(TEACHER));
    expect(before.status).toBe(200);

    noEnrollments(); // enrollment deleted
    const after = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(TEACHER));
    expect(after.status).toBe(403);
  });

  it("PROF-6: a student cannot read another student", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(OTHER_STUDENT));
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("PROF-7: a teacher cannot read another teacher even with a stray enrollment row", async () => {
    // The target account has role "teacher"; the policy's join requires the
    // enrolled account to be a student, so the relationship does not resolve.
    enrolledWith(TEACHER.id, OTHER_TEACHER.id, "teacher");
    const res = await request(app)
      .get(`/api/users/${OTHER_TEACHER.id}`)
      .set(as(TEACHER));
    expect(prismaMock.enrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ student: { role: "student" } }),
      }),
    );
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("PROF-8: staff (admin) reads any profile", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(ADMIN));
    expect(res.status).toBe(200);
    expect(prismaMock.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it("PROF-9: the dev shim identity cannot manufacture group ownership", async () => {
    // `mock-token-for-mvp` yields student-123 in test/dev; it is still just a
    // student and gets the same 403 as any other unrelated student.
    noEnrollments();
    const res = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set("Authorization", "Bearer mock-token-for-mvp");
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("PROF-10: a denied response is byte-identical for existing and non-existing ids", async () => {
    noEnrollments();
    const existing = await request(app)
      .get(`/api/users/${STUDENT.id}`)
      .set(as(OTHER_TEACHER));
    const missing = await request(app)
      .get("/api/users/does-not-exist")
      .set(as(OTHER_TEACHER));
    expect(existing.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(existing.text).toBe(missing.text);
  });
});

describe("#871 aggregate progress reads — GET /api/progress/:studentId", () => {
  it("PROG-1: a student reads their own progress", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/progress/${STUDENT.id}`)
      .set(as(STUDENT));
    expect(res.status).toBe(200);
    expect(getAggregatedProgressMock).toHaveBeenCalledWith(
      STUDENT.id,
      "stem-1",
    );
  });

  it("PROG-2: an unrelated teacher is denied before any progress lookup", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/progress/${STUDENT.id}`)
      .set(as(OTHER_TEACHER));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
    expect(getAggregatedProgressMock).not.toHaveBeenCalled();
  });

  it("PROG-3: another student is denied", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/progress/${STUDENT.id}`)
      .set(as(OTHER_STUDENT));
    expect(res.status).toBe(403);
    expect(getAggregatedProgressMock).not.toHaveBeenCalled();
  });

  it("PROG-4: the owning teacher reads progress; revoking the enrollment revokes it", async () => {
    enrolledWith(TEACHER.id, STUDENT.id);
    const ok = await request(app)
      .get(`/api/progress/${STUDENT.id}?module=stem-1`)
      .set(as(TEACHER));
    expect(ok.status).toBe(200);

    noEnrollments();
    const denied = await request(app)
      .get(`/api/progress/${STUDENT.id}?module=stem-1`)
      .set(as(TEACHER));
    expect(denied.status).toBe(403);
  });

  it("PROG-5: a malformed id is rejected as 400 before authorization", async () => {
    noEnrollments();
    const res = await request(app)
      .get("/api/progress/not%20valid!")
      .set(as(OTHER_TEACHER));
    expect(res.status).toBe(400);
    expect(prismaMock.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it("PROG-6: staff reads any learner's progress", async () => {
    noEnrollments();
    const res = await request(app)
      .get(`/api/progress/${STUDENT.id}`)
      .set(as(ADMIN));
    expect(res.status).toBe(200);
  });
});

describe("#871 checkpoint writes — POST /api/progress/checkpoint", () => {
  const body = (studentId: string) => ({
    studentId,
    moduleSlug: "stem-1",
    lessonId: "lesson-1",
    activityId: "act-1",
    timeSpentS: 30,
    completed: false,
  });

  it("CKPT-1: a student writes their own checkpoint", async () => {
    const res = await request(app)
      .post("/api/progress/checkpoint")
      .set(as(STUDENT))
      .send(body(STUDENT.id));
    expect(res.status).toBe(200);
    expect(prismaMock.progress.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.progress.upsert.mock.calls[0][0].create.studentId).toBe(
      STUDENT.id,
    );
  });

  it("CKPT-2: the owning teacher's read grant does not become a write grant", async () => {
    enrolledWith(TEACHER.id, STUDENT.id);
    const res = await request(app)
      .post("/api/progress/checkpoint")
      .set(as(TEACHER))
      .send(body(STUDENT.id));
    expect(res.status).toBe(403);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CKPT-3: staff cannot write a learner's checkpoint", async () => {
    const res = await request(app)
      .post("/api/progress/checkpoint")
      .set(as(ADMIN))
      .send(body(STUDENT.id));
    expect(res.status).toBe(403);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CKPT-4: a student cannot write another student's checkpoint via the body", async () => {
    const res = await request(app)
      .post("/api/progress/checkpoint")
      .set(as(OTHER_STUDENT))
      .send(body(STUDENT.id));
    expect(res.status).toBe(403);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });
});
