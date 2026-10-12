import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  enrollment: { findFirst: vi.fn() },
  benchmarkAssignment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  benchmarkAttempt: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("../../utils/prisma", () => ({ default: db }));
import router from "../benchmarks";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: "learner", role: "student" };
  next();
});
app.use(router);
const question = {
  id: "q1",
  prompt: "One?",
  choices: ["1", "2"],
  correctIndex: 0,
  skillTag: "count",
};
const post = {
  id: "post",
  kind: "POST",
  status: "OPEN",
  courseId: "class",
  templateId: "template",
  course: { enrollments: [{ studentId: "learner" }] },
  template: { id: "template", title: "Counting", questions: [question] },
  attempts: [],
};
const submit = () =>
  request(app)
    .post("/student/benchmarks/post/submit")
    .send({
      answers: [{ questionId: "q1", selectedIndex: 0 }],
      timeSpentS: 30,
    });
const questions = () => request(app).get("/student/benchmarks/post");
const list = () => request(app).get("/student/courses/class/benchmarks");

beforeEach(() => {
  vi.resetAllMocks();
  db.enrollment.findFirst.mockResolvedValue({ studentId: "learner" });
  db.benchmarkAssignment.findUnique.mockResolvedValue(post);
  db.benchmarkAssignment.findMany.mockResolvedValue([post]);
  db.benchmarkAssignment.findFirst.mockResolvedValue({
    id: "pre",
    status: "OPEN",
  });
  db.benchmarkAttempt.findUnique.mockResolvedValue(null);
  db.benchmarkAttempt.findMany.mockResolvedValue([]);
  db.benchmarkAttempt.create.mockImplementation(async ({ data }) => ({
    id: "attempt",
    ...data,
  }));
});

describe("#889 — one PRE prerequisite across listing, questions and submission", () => {
  it("leaves ordinary PRE assessment submission working", async () => {
    db.benchmarkAssignment.findUnique.mockResolvedValue({
      ...post,
      kind: "PRE",
    });
    expect((await submit()).status).toBe(201);
    expect(db.benchmarkAttempt.create).toHaveBeenCalledOnce();
  });

  it("refuses direct POST submission before PRE without writing an attempt", async () => {
    expect((await list()).body[0].locked).toBe(true);
    expect((await questions()).status).toBe(403);
    const result = await submit();
    expect(result.status).toBe(403);
    expect(result.body.error).toBe("Complete the PRE benchmark first");
    expect(db.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("fails closed when there is no PRE assignment", async () => {
    db.benchmarkAssignment.findFirst.mockResolvedValue(null);
    expect((await list()).body[0].locked).toBe(true);
    expect((await questions()).status).toBe(403);
    expect((await submit()).status).toBe(403);
    expect(db.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("counts a completed PRE even after the teacher closes it", async () => {
    db.benchmarkAssignment.findFirst.mockResolvedValue({
      id: "pre",
      status: "CLOSED",
    });
    db.benchmarkAttempt.findUnique.mockImplementation(async ({ where }) =>
      where.assignmentId_studentId.assignmentId === "pre"
        ? { id: "pre-attempt" }
        : null,
    );
    db.benchmarkAttempt.findMany.mockResolvedValue([
      { assignment: { templateId: "template" } },
    ]);
    expect((await list()).body[0].locked).toBe(false);
    const result = await questions();
    expect(result.status).toBe(200);
    expect(result.body.questions[0]).not.toHaveProperty("correctIndex");
    expect((await submit()).status).toBe(201);
  });

  it("rechecks on submission after a stale browser fetched the questions", async () => {
    db.benchmarkAttempt.findUnique.mockImplementation(async ({ where }) =>
      where.assignmentId_studentId.assignmentId === "pre"
        ? { id: "pre-attempt" }
        : null,
    );
    db.benchmarkAttempt.findMany.mockResolvedValueOnce([
      { assignment: { templateId: "template" } },
    ]);
    expect((await questions()).status).toBe(200);
    db.benchmarkAttempt.findUnique.mockResolvedValue(null);
    expect((await submit()).status).toBe(403);
    expect(db.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("only looks for the current learner's PRE in this class and template", async () => {
    await submit();
    expect(db.benchmarkAttempt.findMany).toHaveBeenCalledWith({
      where: {
        studentId: "learner",
        assignment: {
          courseId: "class",
          kind: "PRE",
          templateId: { in: ["template"] },
        },
      },
      select: { assignment: { select: { templateId: true } } },
    });
    expect(db.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("answers a lookup failure without writing and allows retry after recovery", async () => {
    db.benchmarkAttempt.findMany.mockRejectedValueOnce(new Error("offline"));
    expect((await submit()).status).toBe(500);
    expect(db.benchmarkAttempt.create).not.toHaveBeenCalled();
    db.benchmarkAttempt.findMany.mockResolvedValue([
      { assignment: { templateId: "template" } },
    ]);
    expect((await submit()).status).toBe(201);
  });
});
