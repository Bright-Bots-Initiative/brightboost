import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #879 (DATA-03) — the historical inspection query, validated against seeded
 * malformed attempts on a real PostgreSQL before it is offered for production
 * inspection. The query itself lives in
 * backend/scripts/sql/benchmark-attempt-inspection.sql and is read from there
 * so the test exercises exactly what the owner will run.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database.
 */
const dbUrl = bindTestDatabase();

const SQL = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../scripts/sql/benchmark-attempt-inspection.sql",
  ),
  "utf8",
);

type Row = {
  attempt_id: string;
  score: number;
  totalQuestions: number;
  template_count: number | null;
  answer_count: number | null;
  duplicate_answers: number;
  unknown_ids: number;
  missing_questions: number;
  bad_index: number;
  repair_first_answer_score: number | null;
  reasons: string;
};

describe.skipIf(!dbUrl)(
  "#879 benchmark attempt inspection query (real PostgreSQL)",
  () => {
    const tag = runTag();
    const ids = {
      teacher: `t-879-${tag}`,
      course: `c-879-${tag}`,
      template: `tpl-879-${tag}`,
      assignment: `asg-879-${tag}`,
      attempt: (k: string) => `att-879-${k}-${tag}`,
      student: (k: string) => `s-879-${k}-${tag}`,
    };
    const CASES = [
      "valid",
      "dup",
      "unknown",
      "incomplete",
      "range",
      "huge",
      "total",
      "score",
      "json",
      "numstr",
    ];

    let prisma: typeof import("../../utils/prisma").default;

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
    const ans = (
      questionId: string,
      selectedIndex: number | string,
      isCorrect = false,
    ) => ({
      questionId,
      selectedIndex,
      isCorrect,
      skillTag: "x",
    });
    /** q1 ✓ q2 ✗ q3 ✓ q4 ✗ q5 ✓ → 3 of 5 under the canonical rule. */
    const CANONICAL = [
      ans("q1", 0, true),
      ans("q2", 0),
      ans("q3", 1, true),
      ans("q4", 0),
      ans("q5", 0, true),
    ];

    beforeAll(async () => {
      prisma = (await import("../../utils/prisma")).default;
      expect(process.env.DATABASE_URL).toBe(dbUrl);
      await prisma.user.createMany({
        data: [
          {
            id: ids.teacher,
            name: "T",
            role: "teacher",
            email: `${ids.teacher}@t.test`,
          },
          ...CASES.map((k) => ({
            id: ids.student(k),
            name: k,
            role: "student",
            email: `${ids.student(k)}@s.test`,
          })),
        ],
      });
      await prisma.course.create({
        data: {
          id: ids.course,
          name: "Class",
          teacherId: ids.teacher,
          joinCode: `JC${tag}Q`,
          kind: "class",
        },
      });
      await prisma.benchmarkTemplate.create({
        data: {
          id: ids.template,
          title: "Readiness",
          gradeRange: "K-2",
          subject: "STEM",
          questions: QUESTIONS,
        },
      });
      await prisma.benchmarkAssignment.create({
        data: {
          id: ids.assignment,
          courseId: ids.course,
          templateId: ids.template,
          kind: "PRE",
        },
      });
      const attempt = (
        k: string,
        answers: unknown,
        score: number,
        totalQuestions = 5,
      ) => ({
        id: ids.attempt(k),
        assignmentId: ids.assignment,
        studentId: ids.student(k),
        answers: answers as object,
        score,
        totalQuestions,
        timeSpentS: 30,
      });
      await prisma.benchmarkAttempt.createMany({
        data: [
          attempt("valid", CANONICAL, 3),
          // The audit's case: ten copies of one correct answer, scored 10 of 5.
          attempt(
            "dup",
            Array.from({ length: 10 }, () => ans("q1", 0, true)),
            10,
          ),
          attempt("unknown", [...CANONICAL.slice(0, 4), ans("q9", 0)], 3),
          attempt("incomplete", CANONICAL.slice(0, 4), 2),
          attempt(
            "range",
            [...CANONICAL.slice(0, 2), ans("q3", 2), ...CANONICAL.slice(3)],
            2,
          ),
          // A huge numeric index and a non-numeric one: neither may be cast.
          attempt(
            "huge",
            [ans("q1", 1e20), ans("q2", "abc"), ...CANONICAL.slice(2)],
            2,
          ),
          // A numeric STRING index: ->> renders it as 1 and the regex would
          // pass it, but the submission schema never accepts a string.
          attempt("numstr", [ans("q1", "1"), ...CANONICAL.slice(1)], 2),
          attempt("total", CANONICAL, 3, 4),
          attempt("score", CANONICAL, 5),
          attempt("json", { not: "an array" }, 0),
        ],
      });
    });

    afterAll(async () => {
      await prisma.benchmarkAttempt.deleteMany({
        where: { assignmentId: ids.assignment },
      });
      await prisma.benchmarkAssignment.delete({
        where: { id: ids.assignment },
      });
      await prisma.benchmarkTemplate.delete({ where: { id: ids.template } });
      await prisma.course.delete({ where: { id: ids.course } });
      await prisma.user.deleteMany({
        where: { id: { in: [ids.teacher, ...CASES.map(ids.student)] } },
      });
      await prisma.$disconnect();
    });

    it("INSPECT-1: flags every seeded malformed attempt with the right reasons and leaves the valid one alone", async () => {
      const all = (await prisma.$queryRawUnsafe(SQL)) as Row[];
      const mine = new Map(
        all
          .filter((r) => r.attempt_id.endsWith(tag))
          .map((r) => [r.attempt_id, r]),
      );
      const reasons = (k: string) =>
        mine.get(ids.attempt(k))?.reasons.split(", ") ?? [];

      expect(mine.has(ids.attempt("valid"))).toBe(false);

      expect(reasons("dup")).toEqual(
        expect.arrayContaining([
          "score above total",
          "duplicate answers",
          "missing question",
        ]),
      );
      expect(
        mine.get(ids.attempt("dup"))?.repair_first_answer_score,
      ).toBeNull();

      expect(reasons("unknown")).toEqual(
        expect.arrayContaining(["unknown question id", "missing question"]),
      );
      expect(
        mine.get(ids.attempt("unknown"))?.repair_first_answer_score,
      ).toBeNull();

      expect(reasons("incomplete")).toEqual(["missing question"]);
      expect(
        mine.get(ids.attempt("incomplete"))?.repair_first_answer_score,
      ).toBeNull();

      expect(reasons("range")).toEqual([
        "choice index out of range or not an integer",
      ]);
      expect(mine.get(ids.attempt("range"))?.bad_index).toBe(1);

      expect(reasons("huge")).toEqual([
        "choice index out of range or not an integer",
      ]);
      expect(mine.get(ids.attempt("huge"))?.bad_index).toBe(2);

      expect(reasons("total")).toEqual(["total differs from template"]);
      expect(mine.get(ids.attempt("total"))?.repair_first_answer_score).toBe(3);

      expect(reasons("score")).toEqual(["score inconsistent with answers"]);
      expect(mine.get(ids.attempt("score"))?.repair_first_answer_score).toBe(3);

      expect(reasons("json")).toEqual(
        expect.arrayContaining(["malformed json"]),
      );

      // The numeric string is flagged as a bad index; the four numeric
      // indexes beside it are accepted (exactly one bad index is counted).
      expect(reasons("numstr")).toEqual([
        "choice index out of range or not an integer",
      ]);
      expect(mine.get(ids.attempt("numstr"))?.bad_index).toBe(1);
      expect(mine.get(ids.attempt("numstr"))?.unknown_ids).toBe(0);
      expect(mine.get(ids.attempt("numstr"))?.missing_questions).toBe(0);
      expect(
        mine.get(ids.attempt("json"))?.repair_first_answer_score,
      ).toBeNull();
    });

    it("INSPECT-2: the repair-policy column is the first stored answer per question, not a credit for any correct duplicate", async () => {
      // Two answers for q1: a wrong one first, then a correct one. The candidate
      // policy keeps the first (wrong); crediting "any correct duplicate" would
      // give 4. Both are flagged as duplicates regardless.
      const k = "dupfirst";
      await prisma.user.create({
        data: {
          id: ids.student(k),
          name: k,
          role: "student",
          email: `${ids.student(k)}@s.test`,
        },
      });
      await prisma.benchmarkAttempt.create({
        data: {
          id: ids.attempt(k),
          assignmentId: ids.assignment,
          studentId: ids.student(k),
          answers: [ans("q1", 1), ans("q1", 0, true), ...CANONICAL.slice(1)],
          score: 3,
          totalQuestions: 5,
          timeSpentS: 30,
        },
      });
      try {
        const all = (await prisma.$queryRawUnsafe(SQL)) as Row[];
        const row = all.find((r) => r.attempt_id === ids.attempt(k));
        expect(row?.reasons.split(", ")).toEqual(["duplicate answers"]);
        expect(row?.repair_first_answer_score).toBe(2);
      } finally {
        await prisma.benchmarkAttempt.delete({ where: { id: ids.attempt(k) } });
        await prisma.user.delete({ where: { id: ids.student(k) } });
      }
    });
  },
);
