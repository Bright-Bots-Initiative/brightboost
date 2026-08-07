import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/seed-contract.json",
);

type SeedContract = {
  teacher: { name: string; emailDomain: string };
  students: Array<{ name: string }>;
  activity: {
    title: string;
    kind: string;
    questions: unknown[];
  };
  counts: {
    teachers: number;
    students: number;
    activities: number;
    questions: number;
  };
};

function loadContract(): SeedContract {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as SeedContract;
}

describe("seed-contract.json (§6.1 / U2-05)", () => {
  const contract = loadContract();

  it("defines exactly 3 seeded students (G-015)", () => {
    expect(contract.students.length, "expected exactly 3 seeded students").toBe(
      3,
    );
  });

  it("defines exactly 3 activity questions (G-015)", () => {
    expect(
      contract.activity.questions.length,
      "expected exactly 3 questions",
    ).toBe(3);
  });

  it("counts block matches §6.1 exact totals", () => {
    expect(contract.counts.teachers, "expected exactly 1 teacher").toBe(1);
    expect(contract.counts.students, "expected exactly 3 students").toBe(3);
    expect(contract.counts.activities, "expected exactly 1 activity").toBe(1);
    expect(contract.counts.questions, "expected exactly 3 questions").toBe(3);
  });

  it("student names match the fixed E2E seed names", () => {
    expect(contract.students.map((s) => s.name)).toEqual([
      "E2E Student One",
      "E2E Student Two",
      "E2E Student Three",
    ]);
  });

  it("teacher emailDomain is non-routable @e2e.invalid (G-003)", () => {
    expect(contract.teacher.emailDomain).toBe("@e2e.invalid");
    expect(contract.teacher.name).toBe("E2E Teacher");
  });
});
