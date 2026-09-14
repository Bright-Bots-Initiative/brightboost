import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #876 (PROG-01) — the audit's reproduction, against a real PostgreSQL.
 *
 * The audit checkpointed the five Set 3 ids (three of which are reserved
 * placeholders with no Activity row) as `completed: true`, then read the
 * specialty status as unlocked 5/5 and selected BIOTECH. Pre-fix main answers
 * 200 five times and the specialty gate opens; post-fix nothing is written,
 * the gate stays closed and specialization is refused.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database (see
 * helpers/testDb.ts). Locally:
 *   TEST_DATABASE_URL=postgresql://postgres:brightboostpass@127.0.0.1:5435/brightboost_test
 */
const dbUrl = bindTestDatabase();

describe.skipIf(!dbUrl)("#876 checkpoint integrity (real PostgreSQL)", () => {
  const tag = runTag();
  const ids = {
    teacher: `t-876-${tag}`,
    student: `s-876-${tag}`,
    module: `m-876-${tag}`,
    slug: `k2-test-${tag}`,
    unit: `u-876-${tag}`,
    lesson: `l-876-${tag}`,
    activity: `a-876-${tag}`,
    otherModule: `m2-876-${tag}`,
    otherSlug: `k2-other-${tag}`,
    otherUnit: `u2-876-${tag}`,
    otherLesson: `l2-876-${tag}`,
  };

  let app: typeof import("../../server").default;
  let prisma: typeof import("../../utils/prisma").default;

  let ipSeq = 0;
  const asStudent = () => {
    ipSeq += 1;
    return {
      "x-user-id": ids.student,
      "x-role": "student",
      "X-Forwarded-For": `198.51.100.${(ipSeq % 250) + 1}`,
    };
  };

  beforeAll(async () => {
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    app = (await import("../../server")).default;
    prisma = (await import("../../utils/prisma")).default;
    expect(process.env.DATABASE_URL).toBe(dbUrl);

    await prisma.user.createMany({
      data: [
        {
          id: ids.teacher,
          name: "Teacher",
          role: "teacher",
          email: `${ids.teacher}@t.test`,
        },
        {
          id: ids.student,
          name: "Ada",
          role: "student",
          email: `${ids.student}@s.test`,
        },
      ],
    });
    // Two real curriculum chains so a cross-module checkpoint can be refused.
    for (const c of [
      {
        module: ids.module,
        slug: ids.slug,
        unit: ids.unit,
        lesson: ids.lesson,
      },
      {
        module: ids.otherModule,
        slug: ids.otherSlug,
        unit: ids.otherUnit,
        lesson: ids.otherLesson,
      },
    ]) {
      await prisma.module.create({
        data: {
          id: c.module,
          slug: c.slug,
          title: "Test module",
          description: "#876",
          level: "K-2",
          published: true,
        },
      });
      await prisma.unit.create({
        data: {
          id: c.unit,
          moduleId: c.module,
          title: "Unit",
          order: 1,
          teacherId: ids.teacher,
        },
      });
      await prisma.lesson.create({
        data: { id: c.lesson, unitId: c.unit, title: "Lesson", order: 1 },
      });
    }
    await prisma.activity.create({
      data: {
        id: ids.activity,
        lessonId: ids.lesson,
        title: "Game",
        kind: "INTERACT",
        order: 1,
        content: JSON.stringify({ gameKey: "move_measure" }),
      },
    });
  });

  afterAll(async () => {
    // GamePersonalBest → User is RESTRICT (see #831), so the record the
    // completion wrote must go before the user can.
    await prisma.gamePersonalBest.deleteMany({
      where: { studentId: ids.student },
    });
    await prisma.progress.deleteMany({ where: { studentId: ids.student } });
    await prisma.activity.deleteMany({
      where: { lessonId: { in: [ids.lesson, ids.otherLesson] } },
    });
    await prisma.lesson.deleteMany({
      where: { id: { in: [ids.lesson, ids.otherLesson] } },
    });
    await prisma.unit.deleteMany({
      where: { id: { in: [ids.unit, ids.otherUnit] } },
    });
    await prisma.module.deleteMany({
      where: { id: { in: [ids.module, ids.otherModule] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ids.teacher, ids.student] } },
    });
    await prisma.$disconnect();
  });

  it("DB-876-1: checkpointing the five Set 3 ids as completed writes nothing and the specialty gate stays closed", async () => {
    for (const activityId of STEM_SET_3_IDS) {
      const res = await request(app)
        .post("/api/progress/checkpoint")
        .set(asStudent())
        .send({
          studentId: ids.student,
          moduleSlug: "stem-1",
          lessonId: "any",
          activityId,
          timeSpentS: 1,
          completed: true,
        });
      expect(res.status, activityId).toBe(400);
    }
    // Without the flag the placeholders are still not activities.
    for (const activityId of STEM_SET_3_IDS) {
      const res = await request(app)
        .post("/api/progress/checkpoint")
        .set(asStudent())
        .send({
          studentId: ids.student,
          moduleSlug: "stem-1",
          lessonId: "any",
          activityId,
          timeSpentS: 1,
        });
      expect(res.status, activityId).toBe(404);
    }
    expect(
      await prisma.progress.count({ where: { studentId: ids.student } }),
    ).toBe(0);

    const status = await request(app)
      .get("/api/avatar/specialty-status")
      .set(asStudent());
    expect(status.status).toBe(200);
    expect(status.body.unlocked).toBe(false);
    expect(status.body.completed).toBe(0);

    const select = await request(app)
      .post("/api/avatar/select-archetype")
      .set(asStudent())
      .send({ archetype: "BIOTECH" });
    expect(select.status).toBe(403);
  });

  it("DB-876-2: a checkpoint on the wrong module or lesson is refused and leaves no row", async () => {
    const wrongModule = await request(app)
      .post("/api/progress/checkpoint")
      .set(asStudent())
      .send({
        studentId: ids.student,
        moduleSlug: ids.otherSlug,
        lessonId: ids.lesson,
        activityId: ids.activity,
        timeSpentS: 5,
      });
    expect(wrongModule.status).toBe(400);
    const wrongLesson = await request(app)
      .post("/api/progress/checkpoint")
      .set(asStudent())
      .send({
        studentId: ids.student,
        moduleSlug: ids.slug,
        lessonId: ids.otherLesson,
        activityId: ids.activity,
        timeSpentS: 5,
      });
    expect(wrongLesson.status).toBe(400);
    expect(
      await prisma.progress.count({
        where: { studentId: ids.student, activityId: ids.activity },
      }),
    ).toBe(0);
  });

  it("DB-876-3: checkpoints accumulate time as IN_PROGRESS, completion is the only writer of COMPLETED, and later checkpoints keep it", async () => {
    const first = await request(app)
      .post("/api/progress/checkpoint")
      .set(asStudent())
      .send({
        studentId: ids.student,
        moduleSlug: ids.slug,
        lessonId: ids.lesson,
        activityId: ids.activity,
        timeSpentS: 20,
      });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("IN_PROGRESS");

    const second = await request(app)
      .post("/api/progress/checkpoint")
      .set(asStudent())
      .send({
        studentId: ids.student,
        moduleSlug: ids.slug,
        lessonId: ids.lesson,
        activityId: ids.activity,
        timeSpentS: 15,
      });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("IN_PROGRESS");
    expect(second.body.timeSpentS).toBe(35);

    // The completion writer persists the chain's identifiers even when the
    // lesson is omitted, and the canonical module slug when it is given.
    const done = await request(app)
      .post("/api/progress/complete-activity")
      .set(asStudent())
      .send({
        moduleSlug: ids.slug,
        activityId: ids.activity,
        timeSpentS: 10,
        result: { gameKey: "move_measure", score: 4, total: 5 },
      });
    expect(done.status).toBe(200);
    expect(done.body.progress.status).toBe("COMPLETED");

    const after = await request(app)
      .post("/api/progress/checkpoint")
      .set(asStudent())
      .send({
        studentId: ids.student,
        moduleSlug: ids.slug,
        lessonId: ids.lesson,
        activityId: ids.activity,
        timeSpentS: 5,
      });
    expect(after.status).toBe(200);
    expect(after.body.status).toBe("COMPLETED");

    const row = await prisma.progress.findUnique({
      where: {
        studentId_activityId: {
          studentId: ids.student,
          activityId: ids.activity,
        },
      },
    });
    expect(row?.status).toBe("COMPLETED");
    expect(row?.moduleSlug).toBe(ids.slug);
    expect(row?.lessonId).toBe(ids.lesson);
    expect(row?.timeSpentS).toBe(50);
  });
});
