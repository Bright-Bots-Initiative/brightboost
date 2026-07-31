import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

// Prisma mock (hoisted) so creations.ts / app can load under vitest.
const prismaMock = vi.hoisted(() => ({
  enrollment: {
    findUnique: vi.fn(),
  },
  course: {
    findFirst: vi.fn(),
  },
  creation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

vi.mock("../../utils/prisma", () => ({
  default: new PrismaClient(),
}));

import app from "../../server";
import { VISIBLE_STATUSES, isVisibleTo, visibleToWhere } from "../creations";

const AUTHOR = "author-1";
const OTHER = "other-1";
const COURSE = "course-1";
const OTHER_COURSE = "course-2";
const ALL_STATUSES = ["IN_PROGRESS", ...VISIBLE_STATUSES] as const;

function legacyIsVisibleTo(
  creation: { status: string; authorId: string },
  userId: string,
): boolean {
  return (
    creation.status === "SHARED" ||
    creation.status === "COMPLETE" ||
    creation.authorId === userId
  );
}

function legacyListWhere(userId: string, courseId: string) {
  return {
    courseId,
    OR: [{ status: { in: [...VISIBLE_STATUSES] } }, { authorId: userId }],
  } as ReturnType<typeof visibleToWhere> & { courseId: string };
}

function asStudent(id: string) {
  return { "x-user-id": id, "x-role": "student" } as Record<string, string>;
}

function whereMatchesCreation(
  where: ReturnType<typeof visibleToWhere> & { courseId?: string },
  creation: { status: string; authorId: string; courseId: string },
): boolean {
  const statusClause = where.OR[0] as { status?: { in?: readonly string[] } };
  const authorClause = where.OR[1] as { authorId?: string };
  const statusList = statusClause.status?.in ?? [];
  const statusMatch = statusList.includes(creation.status);
  const authorMatch = authorClause.authorId === creation.authorId;
  const courseMatch = where.courseId
    ? where.courseId === creation.courseId
    : true;
  return courseMatch && (statusMatch || authorMatch);
}

describe("creations visibility helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
  });

  describe("isVisibleTo truth table", () => {
    it("V-1: IN_PROGRESS is visible to the author", () => {
      expect(
        isVisibleTo({ status: "IN_PROGRESS", authorId: AUTHOR }, AUTHOR),
      ).toBe(true);
    });

    it("V-2: IN_PROGRESS is not visible to a non-author", () => {
      expect(
        isVisibleTo({ status: "IN_PROGRESS", authorId: AUTHOR }, OTHER),
      ).toBe(false);
    });

    it("V-3: SHARED is visible to the author", () => {
      expect(isVisibleTo({ status: "SHARED", authorId: AUTHOR }, AUTHOR)).toBe(
        true,
      );
    });

    it("V-4: SHARED is visible to a non-author", () => {
      expect(isVisibleTo({ status: "SHARED", authorId: AUTHOR }, OTHER)).toBe(
        true,
      );
    });

    it("V-5: COMPLETE is visible to the author", () => {
      expect(
        isVisibleTo({ status: "COMPLETE", authorId: AUTHOR }, AUTHOR),
      ).toBe(true);
    });

    it("V-6: COMPLETE is visible to a non-author", () => {
      expect(isVisibleTo({ status: "COMPLETE", authorId: AUTHOR }, OTHER)).toBe(
        true,
      );
    });

    it("V-7 / E-6 / E-7: isVisibleTo matches visibleToWhere for every status x viewer row", () => {
      const viewers = [
        { userId: AUTHOR, label: "author" },
        { userId: OTHER, label: "non-author" },
      ] as const;

      for (const status of ALL_STATUSES) {
        for (const viewer of viewers) {
          const rowLabel = `${status} / ${viewer.label}`;
          const creation = {
            status,
            authorId: AUTHOR,
            courseId: COURSE,
          };
          const fromPredicate = isVisibleTo(creation, viewer.userId);
          const fromWhere = whereMatchesCreation(
            { courseId: COURSE, ...visibleToWhere(viewer.userId) },
            creation,
          );
          expect(fromPredicate, `V-7 parity failed for row: ${rowLabel}`).toBe(
            fromWhere,
          );
        }
      }
    });

    it("T2-1-05 / G-202: a broken isVisibleTo would fail parity for author draft visibility", () => {
      const brokenIsVisibleTo = (
        creation: { status: string; authorId: string },
        _userId: string,
      ) =>
        VISIBLE_STATUSES.includes(
          creation.status as (typeof VISIBLE_STATUSES)[number],
        );

      const creation = {
        status: "IN_PROGRESS",
        authorId: AUTHOR,
        courseId: COURSE,
      };
      const fromBroken = brokenIsVisibleTo(creation, AUTHOR);
      const fromWhere = whereMatchesCreation(
        { courseId: COURSE, ...visibleToWhere(AUTHOR) },
        creation,
      );
      expect(fromBroken).toBe(false);
      expect(fromWhere).toBe(true);
      expect(fromBroken).not.toBe(fromWhere);
    });
  });

  it("V-8: E-5 list where ANDs courseId with visibleToWhere (no group leak)", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });
    prismaMock.creation.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/creations?courseId=${COURSE}`)
      .set(asStudent(OTHER));

    expect(res.status).toBe(200);
    expect(prismaMock.creation.findMany).toHaveBeenCalledTimes(1);
    const arg = prismaMock.creation.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({
      courseId: COURSE,
      ...visibleToWhere(OTHER),
    });
    // Explicitly: OR must not replace courseId (E-5).
    expect(arg.where.courseId).toBe(COURSE);
    expect(arg.where.OR).toEqual(visibleToWhere(OTHER).OR);

    const sameCourseShared = {
      status: "SHARED",
      authorId: AUTHOR,
      courseId: COURSE,
    };
    const otherCourseShared = {
      status: "SHARED",
      authorId: AUTHOR,
      courseId: OTHER_COURSE,
    };
    expect(whereMatchesCreation(arg.where, sameCourseShared)).toBe(true);
    expect(whereMatchesCreation(arg.where, otherCourseShared)).toBe(false);
  });

  it("T2-1-06 / G-202: replacing where (dropping courseId) would leak across groups", () => {
    const mergedWhere = { courseId: COURSE, ...visibleToWhere(OTHER) };
    const replacedWhere = visibleToWhere(OTHER);
    const otherCourseShared = {
      status: "SHARED",
      authorId: AUTHOR,
      courseId: OTHER_COURSE,
    };

    expect(whereMatchesCreation(mergedWhere, otherCourseShared)).toBe(false);
    expect(whereMatchesCreation(replacedWhere, otherCourseShared)).toBe(true);
  });

  it("T3-1-03: list visibility matches the legacy inline OR semantics", () => {
    const viewers = [AUTHOR, OTHER] as const;
    const courses = [COURSE, OTHER_COURSE] as const;

    for (const viewer of viewers) {
      for (const status of ALL_STATUSES) {
        for (const creationCourse of courses) {
          const creation = {
            status,
            authorId: AUTHOR,
            courseId: creationCourse,
          };
          const currentResult = whereMatchesCreation(
            { courseId: COURSE, ...visibleToWhere(viewer) },
            creation,
          );
          const legacyResult = whereMatchesCreation(
            legacyListWhere(viewer, COURSE),
            creation,
          );
          expect(
            currentResult,
            `T3-1-03 mismatch for ${status}/${viewer}/${creationCourse}`,
          ).toBe(legacyResult);
        }
      }
    }
  });

  it("T3-1-04: detail visibility matches the legacy inline boolean semantics", () => {
    const viewers = [AUTHOR, OTHER] as const;

    for (const viewer of viewers) {
      for (const status of ALL_STATUSES) {
        const creation = { status, authorId: AUTHOR };
        const currentResult = isVisibleTo(creation, viewer);
        const legacyResult = legacyIsVisibleTo(creation, viewer);
        expect(currentResult, `T3-1-04 mismatch for ${status}/${viewer}`).toBe(
          legacyResult,
        );
      }
    }
  });
});
