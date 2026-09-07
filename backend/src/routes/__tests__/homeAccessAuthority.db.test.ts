import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #872 — first-time binding against a real PostgreSQL: uniqueness and
 * transaction behaviour that mocks cannot prove.
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
    signup: `signup-${tag}`,
    course: `c-${tag}`,
  };
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

  const invite = (studentId: string, adultEmail: string) =>
    request(app)
      .post(
        `/api/teacher/courses/${ids.course}/students/${studentId}/home-access/invite`,
      )
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ adultEmail, currentPassword: TEACHER_PASSWORD });

  const accept = (token: string, email: string, password = "HomePass123") =>
    request(app)
      .post("/api/auth/home-access/accept")
      .set(newIp())
      .send({ token, email, password });

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
    await prisma.course.create({
      data: {
        id: ids.course,
        name: "Class",
        teacherId: ids.teacher,
        joinCode: `HA${tag}`,
        kind: "class",
      },
    });
    await prisma.enrollment.createMany({
      data: [ids.kid, ids.kid2, ids.signup].map((studentId) => ({
        studentId,
        courseId: ids.course,
      })),
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
    await prisma.homeAccessInvite.deleteMany({
      where: { studentId: { in: [ids.kid, ids.kid2, ids.signup] } },
    });
    await prisma.enrollment.deleteMany({ where: { courseId: ids.course } });
    await prisma.course.deleteMany({ where: { id: ids.course } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
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

  it("DB-872-3: two simultaneous first bindings — exactly one wins, the loser's token stays unused", async () => {
    expect((await invite(ids.kid, `mom-${tag}@home.test`)).status).toBe(202);
    const tokenA = lastEmailedToken();
    expect((await invite(ids.kid, `dad-${tag}@home.test`)).status).toBe(202);
    const tokenB = lastEmailedToken();
    expect(tokenA).not.toBe(tokenB);

    const [a, b] = await Promise.all([
      accept(tokenA, `mom-${tag}@home.test`),
      accept(tokenB, `dad-${tag}@home.test`),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);

    const kid = await prisma.user.findUnique({ where: { id: ids.kid } });
    expect(kid?.homeAccessEnabled).toBe(true);
    expect(kid?.managedByParent).toBe(true);
    const winnerEmail =
      a.status === 200 ? `mom-${tag}@home.test` : `dad-${tag}@home.test`;
    expect(kid?.email).toBe(winnerEmail);
    expect(kid?.parentEmail).toBe(winnerEmail);
    expect(kid?.password).toMatch(/^\$2[aby]\$/);
    expect(kid?.accountMode).toBe("CLASS_CODE_PLUS_HOME_ACCESS");

    const invites = await prisma.homeAccessInvite.findMany({
      where: { studentId: ids.kid },
      orderBy: { createdAt: "asc" },
    });
    expect(invites.filter((i) => i.usedAt !== null)).toHaveLength(1);
    expect(invites.filter((i) => i.usedAt === null)).toHaveLength(1);
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
});
