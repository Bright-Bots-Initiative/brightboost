import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #879 (DATA-03) — benchmark submissions are scored against the template's
 * canonical question set, once per question.
 *
 * RED evidence on pre-fix main (fc75512f): BM-2 answers 201 with score 10 of
 * 5 (the audit's 200%); BM-3 answers 201 counting the unknown id as wrong;
 * BM-4 answers 201 with a partial attempt persisted; BM-5 answers 201 with an
 * impossible index stored; BM-6 answers 201 for 201 answers; BM-7 persists the
 * answers in submission order.
 */

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  benchmarkAssignment: { findUnique: vi.fn() },
  benchmarkAttempt: { create: vi.fn() },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

import app from "../../server";

const STUDENT = "student-123"; // the dev shim's id for the mock token

const QUESTIONS = [
  {
    id: "q1",
    prompt: "1",
    choices: ["a", "b", "c"],
    correctIndex: 0,
    skillTag: "count",
  },
  {
    id: "q2",
    prompt: "2",
    choices: ["a", "b", "c"],
    correctIndex: 1,
    skillTag: "count",
  },
  {
    id: "q3",
    prompt: "3",
    choices: ["a", "b"],
    correctIndex: 1,
    skillTag: "shape",
  },
  {
    id: "q4",
    prompt: "4",
    choices: ["a", "b", "c", "d"],
    correctIndex: 3,
    skillTag: "shape",
  },
  {
    id: "q5",
    prompt: "5",
    choices: ["a", "b"],
    correctIndex: 0,
    skillTag: "pattern",
  },
];

const ASSIGNMENT = {
  id: "asg-1",
  courseId: "course-1",
  templateId: "tpl-1",
  kind: "PRE",
  status: "OPEN",
  template: { id: "tpl-1", title: "Readiness", questions: QUESTIONS },
  course: { id: "course-1", enrollments: [{ studentId: STUDENT }] },
};

/** Every question answered once, in template order: q1 ✓ q2 ✗ q3 ✓ q4 ✗ q5 ✓ → 3 / 5. */
const CANONICAL = [
  { questionId: "q1", selectedIndex: 0 },
  { questionId: "q2", selectedIndex: 0 },
  { questionId: "q3", selectedIndex: 1 },
  { questionId: "q4", selectedIndex: 0 },
  { questionId: "q5", selectedIndex: 0 },
];

function submit(body: Record<string, unknown>) {
  return request(app)
    .post("/api/student/benchmarks/asg-1/submit")
    .set("Authorization", "Bearer mock-token-for-mvp")
    .send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.benchmarkAssignment.findUnique.mockResolvedValue(ASSIGNMENT);
  prismaMock.benchmarkAttempt.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "att-1",
      createdAt: new Date().toISOString(),
      ...data,
    }),
  );
});

describe("#879 — POST /student/benchmarks/:id/submit scores the canonical question set", () => {
  it("BM-1: a complete submission is scored once per question and persisted with the canonical total", async () => {
    const res = await submit({ answers: CANONICAL, timeSpentS: 120 });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(3);
    expect(res.body.totalQuestions).toBe(5);
    const data = prismaMock.benchmarkAttempt.create.mock.calls[0][0].data;
    expect(
      data.answers.map((a: { questionId: string }) => a.questionId),
    ).toEqual(["q1", "q2", "q3", "q4", "q5"]);
    expect(data.answers[0]).toEqual({
      questionId: "q1",
      selectedIndex: 0,
      isCorrect: true,
      skillTag: "count",
    });
    expect(data.answers[1].isCorrect).toBe(false);
  });

  it("BM-2: ten copies of one correct answer are refused, never scored as 10 of 5", async () => {
    const res = await submit({
      answers: Array.from({ length: 10 }, () => ({
        questionId: "q1",
        selectedIndex: 0,
      })),
      timeSpentS: 5,
    });
    expect(res.status).toBe(400);
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("BM-3: an answer for a question the template does not carry is refused", async () => {
    const res = await submit({
      answers: [
        ...CANONICAL.slice(0, 4),
        { questionId: "q9", selectedIndex: 0 },
      ],
      timeSpentS: 5,
    });
    expect(res.status).toBe(400);
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("BM-4: an incomplete submission is refused (D5)", async () => {
    const res = await submit({ answers: CANONICAL.slice(0, 4), timeSpentS: 5 });
    expect(res.status).toBe(400);
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("BM-5: a choice index at or past the question's choice count is refused", async () => {
    const res = await submit({
      answers: [
        ...CANONICAL.slice(0, 2),
        { questionId: "q3", selectedIndex: 2 },
        ...CANONICAL.slice(3),
      ],
      timeSpentS: 5,
    });
    expect(res.status).toBe(400);
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("BM-6: oversized inputs are refused at the schema", async () => {
    const tooMany = await submit({
      answers: Array.from({ length: 201 }, (_, i) => ({
        questionId: `q${i}`,
        selectedIndex: 0,
      })),
      timeSpentS: 5,
    });
    expect(tooMany.status).toBe(400);
    const longId = await submit({
      answers: [{ questionId: "x".repeat(101), selectedIndex: 0 }],
      timeSpentS: 5,
    });
    expect(longId.status).toBe(400);
    const hugeIndex = await submit({
      answers: [{ questionId: "q1", selectedIndex: 101 }],
      timeSpentS: 5,
    });
    expect(hugeIndex.status).toBe(400);
    const tooLong = await submit({ answers: CANONICAL, timeSpentS: 90000 });
    expect(tooLong.status).toBe(400);
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });

  it("BM-7: answers submitted out of order are scored the same and persisted in template order", async () => {
    const shuffled = [...CANONICAL].reverse();
    const res = await submit({ answers: shuffled, timeSpentS: 30 });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(3);
    const data = prismaMock.benchmarkAttempt.create.mock.calls[0][0].data;
    expect(
      data.answers.map((a: { questionId: string }) => a.questionId),
    ).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("BM-8: a second submission still answers 409 (unique attempt per student)", async () => {
    prismaMock.benchmarkAttempt.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const res = await submit({ answers: CANONICAL, timeSpentS: 30 });
    expect(res.status).toBe(409);
  });

  it("BM-9: closed, unknown and un-enrolled assignments keep their existing answers", async () => {
    prismaMock.benchmarkAssignment.findUnique.mockResolvedValueOnce({
      ...ASSIGNMENT,
      status: "CLOSED",
    });
    expect((await submit({ answers: CANONICAL, timeSpentS: 1 })).status).toBe(
      400,
    );
    prismaMock.benchmarkAssignment.findUnique.mockResolvedValueOnce(null);
    expect((await submit({ answers: CANONICAL, timeSpentS: 1 })).status).toBe(
      404,
    );
    prismaMock.benchmarkAssignment.findUnique.mockResolvedValueOnce({
      ...ASSIGNMENT,
      course: { id: "course-1", enrollments: [] },
    });
    expect((await submit({ answers: CANONICAL, timeSpentS: 1 })).status).toBe(
      403,
    );
    expect(prismaMock.benchmarkAttempt.create).not.toHaveBeenCalled();
  });
});
