import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";
import { hashInviteToken } from "../../services/homeAccess";

/**
 * #872 — first-time binding against a real PostgreSQL: uniqueness, row locks
 * and transaction behaviour that mocks cannot prove — including that an
 * invitation loses authority when the relationship that issued it ends.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database. Mail is
 * mocked to capture the emailed accept link; everything else is real.
 */

const dbUrl = bindTestDatabase();

const mailMock = vi.hoisted(() => ({
  sendHomeAccessInviteEmail: vi.fn(),
}));
vi.mock("../../utils/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/mail")>()),
  sendHomeAccessInviteEmail: mailMock.sendHomeAccessInviteEmail,
}));

describe.skipIf(!dbUrl)("#872 home-access binding (real PostgreSQL)", () => {
  const tag = runTag();
  const ids = {
    teacher: `t-${tag}`,
    stranger: `t2-${tag}`,
    kid: `kid-${tag}`,
    kid2: `kid2-${tag}`,
    kid3: `kid3-${tag}`, // enrollment removed, re-enrolled, re-invited
    kid5: `kid5-${tag}`, // class deleted
    kid6: `kid6-${tag}`, // class changes owner
    kid7: `kid7-${tag}`, // inviter loses the teacher role
    kid8: `kid8-${tag}`, // acceptance racing a rolled-back removal
    kid9: `kid9-${tag}`, // acceptance racing a committed removal
    kid10: `kid10-${tag}`, // accepted first, class deleted after
    kid11: `kid11-${tag}`, // pending invitation without provenance
    signup: `signup-${tag}`,
    course: `c-${tag}`,
    course2: `c2-${tag}`,
    course3: `c3-${tag}`,
    course4: `c4-${tag}`,
  };
  const KIDS = [
    ids.kid,
    ids.kid2,
    ids.kid3,
    ids.kid5,
    ids.kid6,
    ids.kid7,
    ids.kid8,
    ids.kid9,
    ids.kid10,
    ids.kid11,
    ids.signup,
  ];
  const COURSES = [ids.course, ids.course2, ids.course3, ids.course4];
  /** Rows created inside tests (race rounds) that must be cleaned up too. */
  const extraKids: string[] = [];
  const extraCourses: string[] = [];
  const TEACHER_PASSWORD = "TeacherPass1";
  const takenEmail = `taken-${tag}@home.test`;

  let app: typeof import("../../server").default;
  let prisma: typeof import("../../utils/prisma").default;
  let teacherToken = "";
  let ip = 0;
  const newIp = () => ({
    "X-Forwarded-For": `10.9.${++ip % 250}.${tag.length}`,
  });

  /** Capture the raw token the adult would receive by email. */
  const lastEmailedToken = () => {
    const calls = mailMock.sendHomeAccessInviteEmail.mock.calls;
    const url = calls[calls.length - 1][1] as string;
    return new URL(url).searchParams.get("token")!;
  };

  const inviteIn = (
    courseId: string,
    studentId: string,
    adultEmail: string,
    token = teacherToken,
  ) =>
    request(app)
      .post(
        `/api/teacher/courses/${courseId}/students/${studentId}/home-access/invite`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ adultEmail, currentPassword: TEACHER_PASSWORD });
  const invite = (studentId: string, adultEmail: string) =>
    inviteIn(ids.course, studentId, adultEmail);

  const accept = (token: string, email: string, password = "HomePass123") =>
    request(app)
      .post("/api/auth/home-access/accept")
      .set(newIp())
      .send({ token, email, password });

  const preview = (token: string) =>
    request(app).get(`/api/auth/home-access/invite/${token}`).set(newIp());

  const deleteClass = (courseId: string) =>
    request(app)
      .delete(`/api/teacher/courses/${courseId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

  const loginAs = async (email: string) => {
    const res = await request(app)
      .post("/api/login")
      .set(newIp())
      .send({ email, password: TEACHER_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  };

  const unenroll = (studentId: string, courseId = ids.course) =>
    prisma.enrollment.delete({
      where: { studentId_courseId: { studentId, courseId } },
    });

  const user = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });
  const inviteRowOf = (studentId: string) =>
    prisma.homeAccessInvite.findFirstOrThrow({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeAll(async () => {
    delete process.env.ALLOW_DEV_ROLE_HEADER;
    mailMock.sendHomeAccessInviteEmail.mockResolvedValue(true);
    app = (await import("../../server")).default;
    prisma = (await import("../../utils/prisma")).default;
    expect(process.env.DATABASE_URL).toBe(dbUrl);

    const teacherHash = await bcrypt.hash(TEACHER_PASSWORD, 4);
    await prisma.user.createMany({
      data: [
        {
          id: ids.teacher,
          name: "Owner",
          role: "teacher",
          email: `${ids.teacher}@t.test`,
          password: teacherHash,
        },
        {
          id: ids.stranger,
          name: "Stranger",
          role: "teacher",
          email: `${ids.stranger}@t.test`,
          password: teacherHash,
        },
        // Never-bound K-2 students (class-code only).
        { id: ids.kid, name: "Ada Byron", role: "student", loginIcon: "🐱" },
        { id: ids.kid2, name: "Ben Ng", role: "student", loginIcon: "🐶" },
        ...[
          ids.kid3,
          ids.kid5,
          ids.kid6,
          ids.kid7,
          ids.kid8,
          ids.kid9,
          ids.kid10,
          ids.kid11,
        ].map((id, i) => ({
          id,
          name: `Kid ${i + 3}`,
          role: "student",
          loginIcon: "🐭",
        })),
        // An email signup: homeAccessEnabled=false but already credentialed.
        {
          id: ids.signup,
          name: "Cleo",
          role: "student",
          email: takenEmail,
          password: teacherHash,
          accountMode: "EMAIL_ONLY",
        },
      ],
    });
    await prisma.course.createMany({
      data: COURSES.map((id, i) => ({
        id,
        name: `Class ${i}`,
        teacherId: ids.teacher,
        joinCode: `H${i}${tag}`,
        kind: "class",
      })),
    });
    await prisma.enrollment.createMany({
      data: [
        ...[
          ids.kid,
          ids.kid2,
          ids.signup,
          ids.kid3,
          ids.kid7,
          ids.kid8,
          ids.kid9,
          ids.kid11,
        ].map((studentId) => ({ studentId, courseId: ids.course })),
        { studentId: ids.kid5, courseId: ids.course2 },
        { studentId: ids.kid6, courseId: ids.course3 },
        { studentId: ids.kid10, courseId: ids.course4 },
      ],
    });

    // A real password login: the token carries `auth: "password"`.
    const login = await request(app)
      .post("/api/login")
      .set(newIp())
      .send({ email: `${ids.teacher}@t.test`, password: TEACHER_PASSWORD });
    expect(login.status).toBe(200);
    teacherToken = login.body.token;
    expect((jwt.decode(teacherToken) as { auth?: string }).auth).toBe(
      "password",
    );
  });

  afterAll(async () => {
    const kids = [...KIDS, ...extraKids];
    const courses = [...COURSES, ...extraCourses];
    await prisma.homeAccessInvite.deleteMany({
      where: { studentId: { in: kids } },
    });
    await prisma.enrollment.deleteMany({
      where: { courseId: { in: courses } },
    });
    await prisma.course.deleteMany({ where: { id: { in: courses } } });
    await prisma.user.deleteMany({
      where: { id: { in: [...Object.values(ids), ...extraKids] } },
    });
    await prisma.$disconnect();
  });

  it("DB-872-1: an already-credentialed student cannot be invited (flag alone is not enough)", async () => {
    const res = await invite(ids.signup, `adult-${tag}@home.test`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "home_access_already_configured" });
    expect(
      await prisma.homeAccessInvite.count({ where: { studentId: ids.signup } }),
    ).toBe(0);
    const row = await prisma.user.findUnique({ where: { id: ids.signup } });
    expect(row?.email).toBe(takenEmail);
  });

  it("DB-872-2: a stranger teacher gets 404 and no invite row exists", async () => {
    const login = await request(app)
      .post("/api/login")
      .set(newIp())
      .send({ email: `${ids.stranger}@t.test`, password: TEACHER_PASSWORD });
    const res = await request(app)
      .post(
        `/api/teacher/courses/${ids.course}/students/${ids.kid}/home-access/invite`,
      )
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        adultEmail: `x-${tag}@home.test`,
        currentPassword: TEACHER_PASSWORD,
      });
    expect(res.status).toBe(404);
    expect(
      await prisma.homeAccessInvite.count({ where: { studentId: ids.kid } }),
    ).toBe(0);
  });

  it("DB-872-3: a fresh invitation supersedes the earlier token; two simultaneous acceptances of the live token bind exactly once", async () => {
    expect((await invite(ids.kid, `mom-${tag}@home.test`)).status).toBe(202);
    const tokenA = lastEmailedToken();
    expect((await invite(ids.kid, `dad-${tag}@home.test`)).status).toBe(202);
    const tokenB = lastEmailedToken();
    expect(tokenA).not.toBe(tokenB);

    // The earlier (possibly mis-addressed) token died when the new one was issued.
    const stale = await preview(tokenA);
    expect(stale.status).toBe(410);
    expect(stale.body).toEqual({ error: "invite_revoked" });
    expect((await accept(tokenA, `mom-${tag}@home.test`)).status).toBe(410);

    const [a, b] = await Promise.all([
      accept(tokenB, `mom-${tag}@home.test`),
      accept(tokenB, `dad-${tag}@home.test`),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);

    const kid = await user(ids.kid);
    expect(kid.homeAccessEnabled).toBe(true);
    expect(kid.managedByParent).toBe(true);
    const winnerEmail =
      a.status === 200 ? `mom-${tag}@home.test` : `dad-${tag}@home.test`;
    expect(kid.email).toBe(winnerEmail);
    expect(kid.parentEmail).toBe(`dad-${tag}@home.test`); // the live token's adult
    expect(kid.password).toMatch(/^\$2[aby]\$/);
    expect(kid.accountMode).toBe("CLASS_CODE_PLUS_HOME_ACCESS");

    const invites = await prisma.homeAccessInvite.findMany({
      where: { studentId: ids.kid },
      orderBy: { createdAt: "asc" },
    });
    expect(invites).toHaveLength(2);
    expect(invites[0].revokedAt).not.toBeNull();
    expect(invites[0].usedAt).toBeNull();
    expect(invites[1].revokedAt).toBeNull();
    expect(invites[1].usedAt).not.toBeNull();
    expect(invites[1].enrollmentId).not.toBeNull();
    expect(invites[1].courseId).toBe(ids.course);
  });

  it("DB-872-4: replaying the winning token changes nothing", async () => {
    const used = await prisma.homeAccessInvite.findFirst({
      where: { studentId: ids.kid, usedAt: { not: null } },
    });
    expect(used).not.toBeNull();
    const before = await prisma.user.findUnique({ where: { id: ids.kid } });

    // We no longer hold the raw winning token in a variable that is
    // guaranteed to be the winner, so drive the replay through the loser
    // path as well: BOTH tokens must now be dead.
    const calls = mailMock.sendHomeAccessInviteEmail.mock.calls;
    const tokens = calls
      .slice(-2)
      .map((c) => new URL(c[1] as string).searchParams.get("token")!);
    for (const tok of tokens) {
      const res = await accept(tok, `again-${tag}@home.test`);
      expect([409, 410]).toContain(res.status);
    }
    const after = await prisma.user.findUnique({ where: { id: ids.kid } });
    expect(after).toEqual(before);
  });

  it("DB-872-5: an email collision rolls back — token unused, student unbound", async () => {
    expect((await invite(ids.kid2, `aunt-${tag}@home.test`)).status).toBe(202);
    const token = lastEmailedToken();

    const res = await accept(token, takenEmail); // belongs to the signup account
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "email_in_use" });

    const kid2 = await prisma.user.findUnique({ where: { id: ids.kid2 } });
    expect(kid2?.email).toBeNull();
    expect(kid2?.password).toBeNull();
    expect(kid2?.homeAccessEnabled).toBe(false);
    expect(kid2?.parentEmail).toBeNull();
    const inv = await prisma.homeAccessInvite.findFirst({
      where: { studentId: ids.kid2 },
    });
    expect(inv?.usedAt).toBeNull();
  });

  it("DB-872-6: an expired token is refused and stays unused", async () => {
    const inv = await prisma.homeAccessInvite.findFirst({
      where: { studentId: ids.kid2 },
    });
    await prisma.homeAccessInvite.update({
      where: { id: inv!.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const token = lastEmailedToken();
    const info = await request(app)
      .get(`/api/auth/home-access/invite/${token}`)
      .set(newIp());
    expect(info.status).toBe(410);
    const res = await accept(token, `late-${tag}@home.test`);
    expect(res.status).toBe(410);
    const again = await prisma.homeAccessInvite.findUnique({
      where: { id: inv!.id },
    });
    expect(again?.usedAt).toBeNull();
  });

  it("DB-872-7: after binding, only the home (password) session can change credentials", async () => {
    const kid = await prisma.user.findUnique({ where: { id: ids.kid } });
    const login = await request(app)
      .post("/api/login")
      .set(newIp())
      .send({ email: kid!.email, password: "HomePass123" });
    expect(login.status).toBe(200);
    const homeToken = login.body.token as string;

    const classLogin = await request(app)
      .post("/api/auth/class-login")
      .set(newIp())
      .send({ courseId: ids.course, studentId: ids.kid });
    expect(classLogin.status).toBe(200);
    const classroomToken = classLogin.body.token as string;
    expect((jwt.decode(classroomToken) as { auth?: string }).auth).toBe(
      "class_code",
    );

    const denied = await request(app)
      .post("/api/auth/home-access/credentials")
      .set("Authorization", `Bearer ${classroomToken}`)
      .send({ currentPassword: "HomePass123", password: "Hijacked123" });
    expect(denied.status).toBe(403);
    expect(denied.body).toEqual({ error: "reauthentication_required" });

    const changed = await request(app)
      .post("/api/auth/home-access/credentials")
      .set("Authorization", `Bearer ${homeToken}`)
      .send({
        currentPassword: "HomePass123",
        password: "Rotated456",
        parentEmail: `guardian-${tag}@home.test`,
      });
    expect(changed.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: ids.kid } });
    expect(await bcrypt.compare("Rotated456", after!.password!)).toBe(true);
    expect(await bcrypt.compare("Hijacked123", after!.password!)).toBe(false);
    expect(after?.parentEmail).toBe(`guardian-${tag}@home.test`);
  });

  it("DB-872-8: an invitation dies with its enrollment, never revives on re-enrolment, and established credentials outlive the enrollment", async () => {
    const adult = `g3-${tag}@home.test`;
    expect((await invite(ids.kid3, adult)).status).toBe(202);
    const token = lastEmailedToken();
    expect((await preview(token)).status).toBe(200);

    await unenroll(ids.kid3);
    expect((await preview(token)).status).toBe(410);
    const gone = await accept(token, adult);
    expect(gone.status).toBe(410);
    expect(gone.body).toEqual({ error: "invite_revoked" });
    let row = await inviteRowOf(ids.kid3);
    expect(row.enrollmentId).toBeNull(); // the FK nulled the provenance
    expect(row.usedAt).toBeNull();

    // Re-enrolling is a new relationship row: the old token stays dead.
    await prisma.enrollment.create({
      data: { studentId: ids.kid3, courseId: ids.course },
    });
    expect((await preview(token)).status).toBe(410);
    expect((await accept(token, adult)).status).toBe(410);
    let kid3 = await user(ids.kid3);
    expect(kid3.email).toBeNull();
    expect(kid3.homeAccessEnabled).toBe(false);

    // The current owner issues a fresh invitation for the new relationship.
    expect((await invite(ids.kid3, adult)).status).toBe(202);
    const fresh = lastEmailedToken();
    expect((await accept(fresh, adult)).status).toBe(200);
    kid3 = await user(ids.kid3);
    expect(kid3.homeAccessEnabled).toBe(true);
    expect(kid3.email).toBe(adult);

    // Ending the relationship afterwards never deletes established credentials.
    await unenroll(ids.kid3);
    const after = await user(ids.kid3);
    expect(after.email).toBe(adult);
    expect(after.homeAccessEnabled).toBe(true);
    expect(after.password).toMatch(/^\$2[aby]\$/);
    row = await inviteRowOf(ids.kid3);
    expect(row.usedAt).not.toBeNull();
    expect(row.enrollmentId).toBeNull(); // provenance gone, binding stands
  });

  it("DB-872-9: deleting the class revokes every unused invitation it issued", async () => {
    const adult = `g5-${tag}@home.test`;
    expect((await inviteIn(ids.course2, ids.kid5, adult)).status).toBe(202);
    const token = lastEmailedToken();
    const del = await deleteClass(ids.course2);
    expect(del.status).toBe(200);

    const row = await inviteRowOf(ids.kid5);
    expect(row.revokedAt).not.toBeNull();
    expect(row.enrollmentId).toBeNull();
    expect(row.usedAt).toBeNull();
    const info = await preview(token);
    expect(info.status).toBe(410);
    expect(info.body).toEqual({ error: "invite_revoked" });
    expect((await accept(token, adult)).status).toBe(410);
    const kid5 = await user(ids.kid5);
    expect(kid5.email).toBeNull();
    expect(kid5.homeAccessEnabled).toBe(false);
  });

  it("DB-872-10: when the class changes owner the old invitation is dead; the current owner may issue a new one", async () => {
    const adult = `g6-${tag}@home.test`;
    expect((await inviteIn(ids.course3, ids.kid6, adult)).status).toBe(202);
    const token = lastEmailedToken();

    await prisma.course.update({
      where: { id: ids.course3 },
      data: { teacherId: ids.stranger },
    });
    expect((await preview(token)).status).toBe(410);
    const res = await accept(token, adult);
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    expect((await inviteRowOf(ids.kid6)).usedAt).toBeNull();
    expect((await user(ids.kid6)).email).toBeNull();

    // The former owner can no longer invite here; the current owner can.
    expect((await inviteIn(ids.course3, ids.kid6, adult)).status).toBe(404);
    const ownerToken = await loginAs(`${ids.stranger}@t.test`);
    expect(
      (await inviteIn(ids.course3, ids.kid6, adult, ownerToken)).status,
    ).toBe(202);
    const fresh = lastEmailedToken();
    expect((await accept(fresh, adult)).status).toBe(200);
    expect((await user(ids.kid6)).email).toBe(adult);
    // The former owner's token is dead in every state.
    expect((await accept(token, `other6-${tag}@home.test`)).status).toBe(410);
  });

  it("DB-872-11: an invitation from someone who is no longer a teacher is dead (either direction of role change)", async () => {
    const adult = `g7-${tag}@home.test`;
    expect((await invite(ids.kid7, adult)).status).toBe(202);
    const token = lastEmailedToken();

    await prisma.user.update({
      where: { id: ids.teacher },
      data: { role: "admin" },
    });
    try {
      expect((await preview(token)).status).toBe(410);
      const res = await accept(token, adult);
      expect(res.status).toBe(410);
      expect(res.body).toEqual({ error: "invite_revoked" });
    } finally {
      await prisma.user.update({
        where: { id: ids.teacher },
        data: { role: "teacher" },
      });
    }
    expect((await inviteRowOf(ids.kid7)).usedAt).toBeNull();
    const kid7 = await user(ids.kid7);
    expect(kid7.email).toBeNull();
    expect(kid7.homeAccessEnabled).toBe(false);
  });

  it("DB-872-12: an acceptance blocked behind an uncommitted removal binds after ROLLBACK and is refused after COMMIT", async () => {
    // ROLLBACK: the removal is abandoned, so the waiting acceptance binds.
    const adult8 = `g8-${tag}@home.test`;
    expect((await invite(ids.kid8, adult8)).status).toBe(202);
    const token8 = lastEmailedToken();
    const pending8: { res?: Promise<request.Response> } = {};
    await prisma
      .$transaction(async (tx) => {
        await tx.enrollment.delete({
          where: {
            studentId_courseId: { studentId: ids.kid8, courseId: ids.course },
          },
        });
        pending8.res = accept(token8, adult8); // waits on the share lock
        await sleep(500);
        throw new Error("abandon removal");
      })
      .catch((e: Error) => expect(e.message).toBe("abandon removal"));
    const bound = await pending8.res!;
    expect(bound.status).toBe(200);
    const kid8 = await user(ids.kid8);
    expect(kid8.email).toBe(adult8);
    expect(kid8.homeAccessEnabled).toBe(true);
    expect((await inviteRowOf(ids.kid8)).usedAt).not.toBeNull();

    // COMMIT: the removal wins; the acceptance is refused and consumes nothing.
    const adult9 = `g9-${tag}@home.test`;
    expect((await invite(ids.kid9, adult9)).status).toBe(202);
    const token9 = lastEmailedToken();
    const pending9: { res?: Promise<request.Response> } = {};
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.delete({
        where: {
          studentId_courseId: { studentId: ids.kid9, courseId: ids.course },
        },
      });
      pending9.res = accept(token9, adult9);
      await sleep(500);
    });
    const refused = await pending9.res!;
    expect(refused.status).toBe(410);
    expect(refused.body).toEqual({ error: "invite_revoked" });
    const kid9 = await user(ids.kid9);
    expect(kid9.email).toBeNull();
    expect(kid9.password).toBeNull();
    expect(kid9.homeAccessEnabled).toBe(false);
    const row9 = await inviteRowOf(ids.kid9);
    expect(row9.usedAt).toBeNull();
    expect(row9.enrollmentId).toBeNull();
  });

  it("DB-872-13: an acceptance that commits first is never undone by deleting the class afterwards", async () => {
    const adult = `g10-${tag}@home.test`;
    expect((await inviteIn(ids.course4, ids.kid10, adult)).status).toBe(202);
    const token = lastEmailedToken();
    expect((await accept(token, adult)).status).toBe(200);
    expect((await deleteClass(ids.course4)).status).toBe(200);

    const kid10 = await user(ids.kid10);
    expect(kid10.email).toBe(adult);
    expect(kid10.homeAccessEnabled).toBe(true);
    expect(kid10.password).toMatch(/^\$2[aby]\$/);
    const row = await inviteRowOf(ids.kid10);
    expect(row.usedAt).not.toBeNull();
    expect(row.revokedAt).toBeNull(); // a used token is not "revoked"
    expect(row.enrollmentId).toBeNull();
    // The home login still works after the class is gone.
    const login = await request(app)
      .post("/api/login")
      .set(newIp())
      .send({ email: adult, password: "HomePass123" });
    expect(login.status).toBe(200);
  });

  it("DB-872-14: acceptance racing class deletion ends in exactly one consistent state — never an error", async () => {
    for (let i = 0; i < 4; i++) {
      const courseId = `rc${i}-${tag}`;
      const kidId = `rk${i}-${tag}`;
      const adult = `r${i}-${tag}@home.test`;
      extraCourses.push(courseId);
      extraKids.push(kidId);
      await prisma.user.create({
        data: {
          id: kidId,
          name: `Race ${i}`,
          role: "student",
          loginIcon: "🐭",
        },
      });
      await prisma.course.create({
        data: {
          id: courseId,
          name: `Race ${i}`,
          teacherId: ids.teacher,
          joinCode: `R${i}${tag}`,
          kind: "class",
        },
      });
      await prisma.enrollment.create({
        data: { studentId: kidId, courseId },
      });
      expect((await inviteIn(courseId, kidId, adult)).status).toBe(202);
      const token = lastEmailedToken();

      const [acc, del] = await Promise.all([
        accept(token, adult),
        deleteClass(courseId),
      ]);
      expect(del.status, `round ${i}: delete`).toBe(200);
      expect([200, 410], `round ${i}: accept`).toContain(acc.status);

      const kid = await user(kidId);
      const row = await inviteRowOf(kidId);
      if (acc.status === 200) {
        expect(kid.homeAccessEnabled, `round ${i}`).toBe(true);
        expect(kid.email, `round ${i}`).toBe(adult);
        expect(row.usedAt, `round ${i}`).not.toBeNull();
        expect(row.revokedAt, `round ${i}`).toBeNull();
      } else {
        expect(kid.homeAccessEnabled, `round ${i}`).toBe(false);
        expect(kid.email, `round ${i}`).toBeNull();
        expect(kid.password, `round ${i}`).toBeNull();
        expect(row.usedAt, `round ${i}`).toBeNull();
        expect(row.revokedAt, `round ${i}`).not.toBeNull();
      }
      expect(
        await prisma.course.count({ where: { id: courseId } }),
        `round ${i}`,
      ).toBe(0);
    }
  });

  it("DB-872-15: a pending invitation without relationship provenance is never claimable", async () => {
    const raw = crypto.randomBytes(32).toString("hex");
    const adult = `legacy-${tag}@home.test`;
    await prisma.homeAccessInvite.create({
      data: {
        studentId: ids.kid11,
        invitedById: ids.teacher,
        adultEmail: adult,
        tokenHash: hashInviteToken(raw),
        expiresAt: new Date(Date.now() + 3600_000),
        // no courseId / enrollmentId — the pre-#872-correction row shape
      },
    });
    const info = await preview(raw);
    expect(info.status).toBe(410);
    expect(info.body).toEqual({ error: "invite_revoked" });
    const res = await accept(raw, adult);
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    expect((await inviteRowOf(ids.kid11)).usedAt).toBeNull();
    const kid11 = await user(ids.kid11);
    expect(kid11.email).toBeNull();
    expect(kid11.homeAccessEnabled).toBe(false);
  });

  it("DB-872-16: the correction migration's fail-closed UPDATE revokes provenance-less pending rows and nothing else", async () => {
    // The statement as shipped in the migration (the backend tree; CI proves
    // both trees identical), applied to rows that already exist:
    // kid11's pending row has no provenance, kid10's used row lost its
    // provenance to the class deletion.
    const rel =
      "prisma/migrations/20260907090000_home_access_invite_relationship/migration.sql";
    const file = [
      path.resolve(process.cwd(), rel),
      path.resolve(process.cwd(), "backend", rel),
    ].find((p) => fs.existsSync(p));
    expect(file).toBeDefined();
    const update = fs
      .readFileSync(file!, "utf8")
      .match(/UPDATE "HomeAccessInvite"[\s\S]*?;/)?.[0];
    expect(update).toBeDefined();
    const pendingBefore = await inviteRowOf(ids.kid11);
    expect(pendingBefore.revokedAt).toBeNull();
    const usedBefore = await inviteRowOf(ids.kid10);
    expect(usedBefore.usedAt).not.toBeNull();
    expect(usedBefore.enrollmentId).toBeNull();
    // kid2's expired-but-unused invitation still carries its provenance.
    const provenancedBefore = await inviteRowOf(ids.kid2);
    expect(provenancedBefore.usedAt).toBeNull();
    expect(provenancedBefore.revokedAt).toBeNull();
    expect(provenancedBefore.enrollmentId).not.toBeNull();

    await prisma.$executeRawUnsafe(update!);

    expect((await inviteRowOf(ids.kid11)).revokedAt).not.toBeNull();
    const usedAfter = await inviteRowOf(ids.kid10);
    expect(usedAfter.revokedAt).toBeNull();
    expect(usedAfter.usedAt?.getTime()).toBe(usedBefore.usedAt?.getTime());
    // Rows that still carry provenance are untouched: the pending one (the
    // enrollmentId guard) and a used one (the usedAt guard).
    expect((await inviteRowOf(ids.kid2)).revokedAt).toBeNull();
    const withProvenance = await prisma.homeAccessInvite.findFirst({
      where: { studentId: ids.kid6, usedAt: { not: null } },
    });
    expect(withProvenance?.enrollmentId).not.toBeNull();
    expect(withProvenance?.revokedAt).toBeNull();
  });
});
