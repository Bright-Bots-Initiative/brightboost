import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #871 — the same policy, against a real PostgreSQL (no Prisma mocks).
 *
 * Proves the relationship join as the database evaluates it: a teacher who
 * owns a Course (classroom or home group) in which the target is enrolled as a
 * *student* gets access; an unrelated teacher, another student and a teacher
 * target do not; deleting the Enrollment revokes access on the next request.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database (see
 * helpers/testDb.ts). Run locally against a disposable Postgres:
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5436/brightboost_audit_test
 */
// Points DATABASE_URL at the designated test database before the app (and its
// PrismaClient) is imported below via dynamic import in beforeAll.
const dbUrl = bindTestDatabase();

describe.skipIf(!dbUrl)("#871 student access policy (real PostgreSQL)", () => {
  const tag = runTag();
  const ids = {
    owner: `t-owner-${tag}`,
    homeOwner: `t-home-${tag}`,
    stranger: `t-stranger-${tag}`,
    student: `s-a-${tag}`,
    otherStudent: `s-b-${tag}`,
    classCourse: `c-class-${tag}`,
    homeCourse: `c-home-${tag}`,
  };

  let app: typeof import("../../server").default;
  let prisma: typeof import("../../utils/prisma").default;

  const as = (id: string, role: string) => ({
    "x-user-id": id,
    "x-role": role,
  });

  beforeAll(async () => {
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    app = (await import("../../server")).default;
    prisma = (await import("../../utils/prisma")).default;
    // The harness must have pointed the client at the test database.
    expect(process.env.DATABASE_URL).toBe(dbUrl);

    await prisma.user.createMany({
      data: [
        {
          id: ids.owner,
          name: "Owner",
          role: "teacher",
          email: `${ids.owner}@t.test`,
        },
        {
          id: ids.homeOwner,
          name: "Parent",
          role: "teacher",
          email: `${ids.homeOwner}@t.test`,
        },
        {
          id: ids.stranger,
          name: "Stranger",
          role: "teacher",
          email: `${ids.stranger}@t.test`,
        },
        {
          id: ids.student,
          name: "Ada",
          role: "student",
          email: `${ids.student}@s.test`,
        },
        {
          id: ids.otherStudent,
          name: "Ben",
          role: "student",
          email: `${ids.otherStudent}@s.test`,
        },
      ],
    });
    await prisma.course.createMany({
      data: [
        {
          id: ids.classCourse,
          name: "Class",
          teacherId: ids.owner,
          joinCode: `JC${tag}A`,
          kind: "class",
        },
        {
          id: ids.homeCourse,
          name: "Home",
          teacherId: ids.homeOwner,
          joinCode: `JC${tag}B`,
          kind: "home",
        },
      ],
    });
    await prisma.enrollment.createMany({
      data: [
        { studentId: ids.student, courseId: ids.classCourse },
        { studentId: ids.student, courseId: ids.homeCourse },
        // A stray row enrolling a *teacher* account must not grant access to it.
        { studentId: ids.stranger, courseId: ids.classCourse },
      ],
    });
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({
      where: { courseId: { in: [ids.classCourse, ids.homeCourse] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [ids.classCourse, ids.homeCourse] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.$disconnect();
  });

  it("DB-871-1: the classroom owner and the home-group owner read the student's profile", async () => {
    const byOwner = await request(app)
      .get(`/api/users/${ids.student}`)
      .set(as(ids.owner, "teacher"));
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.id).toBe(ids.student);

    const byParent = await request(app)
      .get(`/api/users/${ids.student}`)
      .set(as(ids.homeOwner, "teacher"));
    expect(byParent.status).toBe(200);
  });

  it("DB-871-2: an unrelated teacher and another student are denied", async () => {
    const stranger = await request(app)
      .get(`/api/users/${ids.student}`)
      .set(as(ids.stranger, "teacher"));
    expect(stranger.status).toBe(403);
    expect(JSON.stringify(stranger.body)).not.toContain("@s.test");

    const peer = await request(app)
      .get(`/api/progress/${ids.student}`)
      .set(as(ids.otherStudent, "student"));
    expect(peer.status).toBe(403);
  });

  it("DB-871-3: a stray enrollment of a teacher account grants nothing", async () => {
    const res = await request(app)
      .get(`/api/users/${ids.stranger}`)
      .set(as(ids.owner, "teacher"));
    expect(res.status).toBe(403);
  });

  it("DB-871-4: removing the enrollment revokes the owner's access", async () => {
    await prisma.enrollment.delete({
      where: {
        studentId_courseId: {
          studentId: ids.student,
          courseId: ids.classCourse,
        },
      },
    });
    const res = await request(app)
      .get(`/api/users/${ids.student}`)
      .set(as(ids.owner, "teacher"));
    expect(res.status).toBe(403);

    // The home-group relationship is untouched and still grants access.
    const parent = await request(app)
      .get(`/api/users/${ids.student}`)
      .set(as(ids.homeOwner, "teacher"));
    expect(parent.status).toBe(200);
  });

  it("DB-871-5: a denied checkpoint write leaves no Progress row", async () => {
    const res = await request(app)
      .post("/api/progress/checkpoint")
      .set(as(ids.homeOwner, "teacher"))
      .send({
        studentId: ids.student,
        moduleSlug: "stem-1",
        lessonId: "lesson-x",
        activityId: `act-${tag}`,
        timeSpentS: 10,
      });
    expect(res.status).toBe(403);
    const rows = await prisma.progress.count({
      where: { studentId: ids.student, activityId: `act-${tag}` },
    });
    expect(rows).toBe(0);
  });
});
