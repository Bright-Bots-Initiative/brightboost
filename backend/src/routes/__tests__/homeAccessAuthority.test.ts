import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * #872 — classroom sessions can no longer bind or replace home-access
 * credentials.
 *
 * Runs through the mounted app with the REAL token middleware: every actor is
 * a real signed JWT (or none), so the session-provenance claim is exercised
 * exactly as production reads it. Only Prisma and mail delivery are mocked.
 *
 * RED evidence (pre-fix main 72746e87): the old POST /auth/home-access/enable
 * accepted any student JWT — including a PIN-less class-code session — and
 * replaced email, password, parentEmail and managedByParent (HA-1 fails: 200
 * and a user.update). Nothing distinguished session provenance (HA-22/23).
 */

const SECRET = process.env.SESSION_SECRET || "default_dev_secret";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  course: { findFirst: vi.fn() },
  enrollment: { findUnique: vi.fn(), findFirst: vi.fn() },
  homeAccessInvite: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@prisma/client")>()),
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

const mailMock = vi.hoisted(() => ({
  sendHomeAccessInviteEmail: vi.fn(),
}));
vi.mock("../../utils/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/mail")>()),
  sendHomeAccessInviteEmail: mailMock.sendHomeAccessInviteEmail,
}));

import app from "../../server";
import { Prisma } from "@prisma/client";
import { hashInviteToken } from "../../services/homeAccess";

type Claims = { id: string; role: string; auth?: string };
const sign = (claims: Claims) => jwt.sign(claims, SECRET, { expiresIn: "1h" });
const bearer = (claims: Claims) => ({
  Authorization: `Bearer ${sign(claims)}`,
});

const STUDENT_ID = "student-home";
const TEACHER_ID = "teacher-owner";
const COURSE_ID = "course-1";

const TEACHER_PASSWORD = "TeacherPass1";
const STUDENT_PASSWORD = "HomePass123";
let teacherHash = "";
let studentHash = "";

const classroom = { id: STUDENT_ID, role: "student", auth: "class_code" };
const classroomPin = {
  id: STUDENT_ID,
  role: "student",
  auth: "class_code_pin",
};
const legacyStudent = { id: STUDENT_ID, role: "student" }; // no claim
const homeStudent = { id: STUDENT_ID, role: "student", auth: "password" };
const teacher = { id: TEACHER_ID, role: "teacher", auth: "password" };
const legacyTeacher = { id: TEACHER_ID, role: "teacher" };
const admin = { id: "staff-1", role: "admin", auth: "password" };

const boundStudentRow = () => ({
  id: STUDENT_ID,
  role: "student",
  password: studentHash,
  homeAccessEnabled: true,
});

const neverBoundStudent = () => ({
  id: STUDENT_ID,
  name: "Ada Lovelace",
  role: "student",
  email: null,
  password: null,
  homeAccessEnabled: false,
  loginIcon: "🐱",
});

/** Distinct client IPs keep the public-route auth limiter out of the way. */
let ipCounter = 0;
const fromNewIp = () => ({ "X-Forwarded-For": `10.0.${++ipCounter}.1` });

beforeEach(async () => {
  vi.clearAllMocks();
  delete process.env.ALLOW_DEV_ROLE_HEADER;
  teacherHash = teacherHash || (await bcrypt.hash(TEACHER_PASSWORD, 4));
  studentHash = studentHash || (await bcrypt.hash(STUDENT_PASSWORD, 4));
  mailMock.sendHomeAccessInviteEmail.mockResolvedValue(true);
  // The interactive-transaction client shares every model mock but has its
  // OWN $queryRaw: the share-locked reads must run on the transaction's
  // connection, so a regression to the global client shows up as a call on
  // `prismaMock.$queryRaw` (unmocked → undefined → the accept path breaks).
  txQueryRaw.mockReset();
  prismaMock.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: typeof txClient) => Promise<unknown>)(txClient)
      : Promise.all(arg as Promise<unknown>[]),
  );
  prismaMock.homeAccessInvite.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
  // The issuing relationship is intact unless a test says otherwise: the
  // unlocked pre-check and each of the three share-locked reads find a row.
  prismaMock.enrollment.findFirst.mockResolvedValue({ id: "enr-1" });
  txQueryRaw.mockResolvedValue([{ id: "row" }]);
});

const txQueryRaw = vi.fn();
const txClient = { ...prismaMock, $queryRaw: txQueryRaw };

/** The SQL text of the n-th locked read (tagged-template form). */
const rawSql = (n: number) =>
  (txQueryRaw.mock.calls[n][0] as readonly string[]).join("?");

describe("#872 the old self-service binding route is gone", () => {
  it("HA-1: a classroom session posting replacement credentials gets 410 and writes nothing", async () => {
    const res = await request(app)
      .post("/api/auth/home-access/enable")
      .set(bearer(classroom))
      .send({
        email: "attacker@example.com",
        password: "Attacker123",
        parentEmail: "attacker@example.com",
        managedByParent: true,
      });
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "home_access_enable_removed" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
});

describe("#872 credential changes — POST /api/auth/home-access/credentials", () => {
  const change = {
    currentPassword: STUDENT_PASSWORD,
    email: "new@example.com",
  };

  it("HA-2: a PIN-less classroom session is refused before any lookup", async () => {
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(classroom))
      .send(change);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "reauthentication_required" });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("HA-3: a PIN-verified classroom session is refused the same way", async () => {
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(classroomPin))
      .send(change);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "reauthentication_required" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("HA-4: a legacy token (no provenance claim) fails closed here but still learns", async () => {
    const denied = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(legacyStudent))
      .send(change);
    expect(denied.status).toBe(403);
    expect(denied.body).toEqual({ error: "reauthentication_required" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();

    // Ordinary learning is untouched: the same token reads its own profile.
    prismaMock.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: null,
      school: null,
      subject: null,
      role: "student",
      avatarUrl: null,
      createdAt: new Date("2026-01-01"),
      homeAccessEnabled: true,
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });
    const ok = await request(app)
      .get("/api/profile")
      .set(bearer(legacyStudent));
    expect(ok.status).toBe(200);
    expect(ok.body.id).toBe(STUDENT_ID);
  });

  it("HA-5: the home (password) session changes the login after re-entering the password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(boundStudentRow());
    prismaMock.user.update.mockResolvedValue({
      id: STUDENT_ID,
      email: "new@example.com",
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: "parent@example.com",
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });

    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(homeStudent))
      .send({ ...change, password: "Another123" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.email).toBe("new@example.com");

    const call = prismaMock.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: STUDENT_ID });
    expect(call.data.email).toBe("new@example.com");
    // Stored as a bcrypt hash, never the plaintext.
    expect(call.data.password).toMatch(/^\$2[aby]\$/);
    expect(call.data.password).not.toBe("Another123");
  });

  it("HA-6: a wrong current password is refused and nothing changes", async () => {
    prismaMock.user.findUnique.mockResolvedValue(boundStudentRow());
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(homeStudent))
      .send({ currentPassword: "not-it", email: "new@example.com" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "invalid_current_password" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "HOME_ACCESS_CREDENTIALS_DENIED",
        }),
      }),
    );
  });

  it("HA-7: an account without home access cannot use the route", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...boundStudentRow(),
      homeAccessEnabled: false,
    });
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(homeStudent))
      .send(change);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "home_access_not_enabled" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("HA-8: staff and teachers are not credential holders (exact role check)", async () => {
    for (const actor of [admin, teacher]) {
      const res = await request(app)
        .post("/api/auth/home-access/credentials")
        .set(bearer(actor))
        .send(change);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "forbidden" });
    }
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("HA-9: request fields cannot widen a classroom session", async () => {
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(classroom))
      .set("x-role", "student")
      .set("x-auth", "password")
      .send({
        ...change,
        auth: "password",
        role: "teacher",
        managedByParent: false,
      });
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("HA-9b: a body with nothing to change is a 400, not a silent no-op write", async () => {
    prismaMock.user.findUnique.mockResolvedValue(boundStudentRow());
    const res = await request(app)
      .post("/api/auth/home-access/credentials")
      .set(bearer(homeStudent))
      .send({ currentPassword: STUDENT_PASSWORD });
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("#872 first-time binding — invite", () => {
  const inviteUrl = `/api/teacher/courses/${COURSE_ID}/students/${STUDENT_ID}/home-access/invite`;
  const body = {
    adultEmail: "Parent@Example.com",
    currentPassword: TEACHER_PASSWORD,
  };

  const teacherRow = () => ({ role: "teacher", password: teacherHash });

  it("HA-10: a student session (even a password one) cannot invite", async () => {
    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(homeStudent))
      .send(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
    expect(prismaMock.homeAccessInvite.create).not.toHaveBeenCalled();
  });

  it("HA-11: a legacy teacher token fails closed before any lookup", async () => {
    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(legacyTeacher))
      .send(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "reauthentication_required" });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.course.findFirst).not.toHaveBeenCalled();
  });

  it("HA-12: the teacher must re-enter their own password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(teacherRow());
    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(teacher))
      .send({ ...body, currentPassword: "nope" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "invalid_current_password" });
    expect(prismaMock.course.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.homeAccessInvite.create).not.toHaveBeenCalled();
    expect(mailMock.sendHomeAccessInviteEmail).not.toHaveBeenCalled();
  });

  it("HA-13: a teacher who does not own the course gets 404 and creates nothing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(teacherRow());
    prismaMock.course.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(teacher))
      .send(body);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "course_not_found" });
    expect(prismaMock.homeAccessInvite.create).not.toHaveBeenCalled();
    expect(mailMock.sendHomeAccessInviteEmail).not.toHaveBeenCalled();
  });

  it("HA-14: a student who already has a login of their own cannot be rebound", async () => {
    prismaMock.user.findUnique.mockResolvedValue(teacherRow());
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE_ID });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enr-1",
      student: {
        ...neverBoundStudent(),
        email: "kid@example.com",
        password: "$2b$10$existinghash",
        homeAccessEnabled: false, // an email signup: flag alone would have allowed this
      },
    });
    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(teacher))
      .send(body);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "home_access_already_configured" });
    expect(prismaMock.homeAccessInvite.create).not.toHaveBeenCalled();
    expect(mailMock.sendHomeAccessInviteEmail).not.toHaveBeenCalled();
  });

  it("HA-15: the owning teacher invites an adult; only the token hash is stored", async () => {
    prismaMock.user.findUnique.mockResolvedValue(teacherRow());
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE_ID });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enr-1",
      student: neverBoundStudent(),
    });
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);
    prismaMock.homeAccessInvite.create.mockResolvedValue({
      id: "inv-1",
      expiresAt,
    });

    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(teacher))
      .send(body);
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    // The response never says whether the adult email belongs to an account.
    expect(Object.keys(res.body).sort()).toEqual(["expiresAt", "ok"]);

    const created = prismaMock.homeAccessInvite.create.mock.calls[0][0].data;
    expect(created.studentId).toBe(STUDENT_ID);
    expect(created.invitedById).toBe(TEACHER_ID);
    expect(created.adultEmail).toBe("parent@example.com"); // normalised
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    // Bound to the exact relationship instance that authorized it.
    expect(created.courseId).toBe(COURSE_ID);
    expect(created.enrollmentId).toBe("enr-1");
    // A fresh invitation supersedes every earlier unused one, in one transaction.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const supersede = prismaMock.homeAccessInvite.updateMany.mock.calls[0][0];
    expect(supersede.where).toEqual({
      studentId: STUDENT_ID,
      usedAt: null,
      revokedAt: null,
    });
    expect(supersede.data.revokedAt).toBeInstanceOf(Date);

    const [to, acceptUrl, firstName] =
      mailMock.sendHomeAccessInviteEmail.mock.calls[0];
    expect(to).toBe("parent@example.com");
    expect(firstName).toBe("Ada");
    const rawToken = new URL(acceptUrl).searchParams.get("token")!;
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(rawToken)).toBe(created.tokenHash);
    expect(acceptUrl).not.toContain(created.tokenHash);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "HOME_ACCESS_INVITE_SENT" }),
      }),
    );
  });

  it("HA-16: undeliverable mail rolls the invite back and reports 503", async () => {
    prismaMock.user.findUnique.mockResolvedValue(teacherRow());
    prismaMock.course.findFirst.mockResolvedValue({ id: COURSE_ID });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enr-1",
      student: neverBoundStudent(),
    });
    prismaMock.homeAccessInvite.create.mockResolvedValue({
      id: "inv-2",
      expiresAt: new Date(),
    });
    mailMock.sendHomeAccessInviteEmail.mockResolvedValue(false);

    const res = await request(app)
      .post(inviteUrl)
      .set(bearer(teacher))
      .send(body);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "mail_unavailable" });
    expect(prismaMock.homeAccessInvite.deleteMany).toHaveBeenCalledWith({
      where: { id: "inv-2", usedAt: null },
    });
  });
});

describe("#872 first-time binding — accept with the emailed token (public)", () => {
  const RAW = "a".repeat(64);
  const inviteRow = (over: Record<string, unknown> = {}) => ({
    id: "inv-9",
    studentId: STUDENT_ID,
    invitedById: TEACHER_ID,
    adultEmail: "parent@example.com",
    tokenHash: hashInviteToken(RAW),
    expiresAt: new Date(Date.now() + 3600 * 1000),
    usedAt: null,
    revokedAt: null,
    courseId: COURSE_ID,
    enrollmentId: "enr-1",
    createdAt: new Date(),
    student: { id: STUDENT_ID, name: "Ada Lovelace", loginIcon: "🐱" },
    ...over,
  });

  const acceptWith = (token = RAW) =>
    request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({ token, email: "home@example.com", password: "HomePass123" });
  const preview = (token = RAW) =>
    request(app).get(`/api/auth/home-access/invite/${token}`).set(fromNewIp());

  it("HA-17: unknown, expired and used tokens are refused with no write", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(null);
    const unknown = await request(app)
      .get(`/api/auth/home-access/invite/${RAW}`)
      .set(fromNewIp());
    expect(unknown.status).toBe(404);

    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(
      inviteRow({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const expired = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({ token: RAW, email: "home@example.com", password: "HomePass123" });
    expect(expired.status).toBe(410);
    expect(expired.body).toEqual({ error: "invite_expired" });

    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(
      inviteRow({ usedAt: new Date() }),
    );
    const replayed = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({ token: RAW, email: "home@example.com", password: "HomePass123" });
    expect(replayed.status).toBe(409);
    expect(replayed.body).toEqual({ error: "invite_used" });

    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(
      inviteRow({ revokedAt: new Date() }),
    );
    expect((await preview()).status).toBe(410);
    const revoked = await acceptWith();
    expect(revoked.status).toBe(410);
    expect(revoked.body).toEqual({ error: "invite_revoked" });

    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.homeAccessInvite.updateMany).not.toHaveBeenCalled();
  });

  it("HA-17c: an invitation without relationship provenance fails closed, before any lookup", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(
      inviteRow({ enrollmentId: null, courseId: null }),
    );
    expect((await preview()).status).toBe(410);
    const res = await acceptWith();
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    expect(prismaMock.enrollment.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("HA-17d: preview and accept require the exact issuing relationship, still owned by the inviting teacher", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    expect((await preview()).status).toBe(410);
    const res = await acceptWith();
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    // The predicate names the row, the pair, the course owner and the role.
    expect(prismaMock.enrollment.findFirst.mock.calls[0][0].where).toEqual({
      id: "enr-1",
      studentId: STUDENT_ID,
      courseId: COURSE_ID,
      course: { teacherId: TEACHER_ID, teacher: { role: "teacher" } },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.homeAccessInvite.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("HA-17e: the relationship is re-verified under lock inside the accepting transaction", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());
    // Pre-check passes; under lock the course is no longer the inviter's.
    txQueryRaw
      .mockResolvedValueOnce([{ id: "enr-1" }])
      .mockResolvedValueOnce([]);
    const res = await acceptWith();
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txQueryRaw).toHaveBeenCalledTimes(2);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled(); // never the global client
    expect(rawSql(0)).toMatch(/FROM "Enrollment"[\s\S]*FOR SHARE/);
    expect(rawSql(1)).toMatch(/FROM "Course"[\s\S]*FOR SHARE/);
    // Nothing was claimed or bound: the transaction threw before both writes.
    expect(prismaMock.homeAccessInvite.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    await expect(
      prismaMock.$transaction.mock.results[0].value,
    ).rejects.toThrow();
  });

  it("HA-17b: the accept page sees only the student's first name and the invited email", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());
    const res = await request(app)
      .get(`/api/auth/home-access/invite/${RAW}`)
      .set(fromNewIp());
    expect(res.status).toBe(200);
    expect(res.body.studentFirstName).toBe("Ada");
    expect(res.body.adultEmail).toBe("parent@example.com");
    expect(res.body).not.toHaveProperty("studentId");
    expect(res.body).not.toHaveProperty("tokenHash");
  });

  it("HA-17f: a lost compare-and-swap re-reads the row and reports the precise reason, binding nothing", async () => {
    prismaMock.homeAccessInvite.findUnique
      .mockResolvedValueOnce(inviteRow()) // pre-check
      .mockResolvedValueOnce(inviteRow({ revokedAt: new Date() })); // re-read under the transaction
    prismaMock.homeAccessInvite.updateMany.mockResolvedValue({ count: 0 });
    const res = await acceptWith();
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: "invite_revoked" });
    expect(prismaMock.homeAccessInvite.findUnique).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    await expect(
      prismaMock.$transaction.mock.results[0].value,
    ).rejects.toThrow();
  });

  it("HA-18: a valid token binds exactly the invited student, never a body-supplied one", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());

    const res = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({
        token: RAW,
        email: "Home@Example.com",
        password: "HomePass123",
        studentId: "someone-else",
        userId: "someone-else",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Enrollment, Course and inviter are share-locked, in that order, first —
    // on the transaction's connection, never the global client.
    expect(txQueryRaw).toHaveBeenCalledTimes(3);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(rawSql(0)).toMatch(/FROM "Enrollment"[\s\S]*FOR SHARE/);
    expect(rawSql(1)).toMatch(/FROM "Course"[\s\S]*FOR SHARE/);
    expect(rawSql(2)).toMatch(/FROM "User"[\s\S]*'teacher'[\s\S]*FOR SHARE/);
    // The claim is a compare-and-swap against the verified provenance.
    const claim = prismaMock.homeAccessInvite.updateMany.mock.calls[0][0];
    expect(claim.where).toMatchObject({
      id: "inv-9",
      enrollmentId: "enr-1",
      courseId: COURSE_ID,
      usedAt: null,
      revokedAt: null,
    });
    expect(claim.data.usedAt).toBeInstanceOf(Date);

    const bind = prismaMock.user.updateMany.mock.calls[0][0];
    expect(bind.where).toEqual({
      id: STUDENT_ID,
      role: "student",
      email: null,
      password: null,
      homeAccessEnabled: false,
    });
    expect(bind.data).toMatchObject({
      email: "home@example.com",
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: "parent@example.com",
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });
    expect(bind.data.password).toMatch(/^\$2[aby]\$/);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "HOME_ACCESS_ENABLED" }),
      }),
    );
  });

  it("HA-19: a student who was bound meanwhile is not rebound (guarded update matched 0 rows)", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({ token: RAW, email: "home@example.com", password: "HomePass123" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "home_access_already_configured" });
    // The transaction callback threw, so the invite claim rolls back with it.
    await expect(
      prismaMock.$transaction.mock.results[0].value,
    ).rejects.toThrow();
  });

  it("HA-20: a login email already in use is a clean 409 after rollback", async () => {
    prismaMock.homeAccessInvite.findUnique.mockResolvedValue(inviteRow());
    prismaMock.user.updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({
        token: RAW,
        email: "taken@example.com",
        password: "HomePass123",
      });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "email_in_use" });
  });

  it("HA-21: a weak password is rejected before any lookup", async () => {
    const res = await request(app)
      .post("/api/auth/home-access/accept")
      .set(fromNewIp())
      .send({ token: RAW, email: "home@example.com", password: "short" });
    expect(res.status).toBe(400);
    expect(prismaMock.homeAccessInvite.findUnique).not.toHaveBeenCalled();
  });
});

describe("#872 session provenance is server-issued", () => {
  const decode = (token: string) =>
    jwt.verify(token, SECRET) as { id: string; role: string; auth?: string };

  it("HA-22: class-code login records class_code / class_code_pin", async () => {
    const pinHash = await bcrypt.hash("1234", 4);
    const student = (loginPin: string | null) => ({
      id: STUDENT_ID,
      name: "Ada",
      email: null,
      role: "student",
      loginIcon: "🐱",
      loginPin,
      level: "Explorer",
      xp: 0,
      streak: 0,
      avatarUrl: null,
      preferredLanguage: "en",
    });

    prismaMock.enrollment.findUnique.mockResolvedValue({
      student: student(null),
    });
    const noPin = await request(app)
      .post("/api/auth/class-login")
      .set(fromNewIp())
      .send({ courseId: COURSE_ID, studentId: STUDENT_ID });
    expect(noPin.status).toBe(200);
    expect(decode(noPin.body.token).auth).toBe("class_code");

    prismaMock.enrollment.findUnique.mockResolvedValue({
      student: student(pinHash),
    });
    const withPin = await request(app)
      .post("/api/auth/class-login")
      .set(fromNewIp())
      .send({ courseId: COURSE_ID, studentId: STUDENT_ID, pin: "1234" });
    expect(withPin.status).toBe(200);
    expect(decode(withPin.body.token).auth).toBe("class_code_pin");
  });

  it("HA-23: email + password login records password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      password: studentHash,
      role: "student",
    });
    const res = await request(app)
      .post("/api/login")
      .set(fromNewIp())
      .send({ email: "home@example.com", password: STUDENT_PASSWORD });
    expect(res.status).toBe(200);
    expect(decode(res.body.token).auth).toBe("password");
  });

  it("HA-24: the session re-hydration payload carries the home-access state", async () => {
    // AuthContext refreshes `user` from GET /get-progress; without the flag a
    // reload would show a bound student the "ask your teacher" guidance.
    prismaMock.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      role: "student",
      homeAccessEnabled: true,
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });
    const res = await request(app)
      .get("/api/get-progress?excludeProgress=true")
      .set(bearer(homeStudent));
    expect(res.status).toBe(200);
    expect(res.body.user.homeAccessEnabled).toBe(true);
    const select = prismaMock.user.findUnique.mock.calls[0][0].select;
    expect(select.homeAccessEnabled).toBe(true);
    expect(select).not.toHaveProperty("password");
  });

  it("HA-25: class-login never echoes the account email", async () => {
    // Anyone holding the class code reaches this route without a PIN; after
    // binding, `email` would be half of the family's home credential pair.
    prismaMock.enrollment.findUnique.mockResolvedValue({
      student: {
        id: STUDENT_ID,
        name: "Ada",
        role: "student",
        loginIcon: "🐱",
        loginPin: null,
        level: "Explorer",
        xp: 0,
        streak: 0,
        avatarUrl: null,
        preferredLanguage: "en",
        homeAccessEnabled: true,
      },
    });
    const res = await request(app)
      .post("/api/auth/class-login")
      .set(fromNewIp())
      .send({ courseId: COURSE_ID, studentId: STUDENT_ID });
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("email");
    expect(res.body.user).not.toHaveProperty("loginPin");
    expect(res.body.user.homeAccessEnabled).toBe(true);
    const select =
      prismaMock.enrollment.findUnique.mock.calls[0][0].include.student.select;
    expect(select).not.toHaveProperty("email");
  });

  it("HA-26: a classroom session cannot read the home email through /profile or /get-progress", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      role: "student",
      school: null,
      subject: null,
      avatarUrl: null,
      createdAt: new Date("2026-01-01"),
      homeAccessEnabled: true,
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });
    for (const session of [classroom, classroomPin]) {
      const profile = await request(app)
        .get("/api/profile")
        .set(bearer(session));
      expect(profile.status).toBe(200);
      expect(profile.body.email).toBeNull();
      expect(profile.body.homeAccessEnabled).toBe(true);

      const hydrate = await request(app)
        .get("/api/get-progress?excludeProgress=true")
        .set(bearer(session));
      expect(hydrate.status).toBe(200);
      expect(hydrate.body.user.email).toBeNull();
      expect(JSON.stringify(hydrate.body)).not.toContain("home@example.com");
    }
  });

  it("HA-27: the home (password) session still sees its own email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      role: "student",
      school: null,
      subject: null,
      avatarUrl: null,
      createdAt: new Date("2026-01-01"),
      homeAccessEnabled: true,
      accountMode: "CLASS_CODE_PLUS_HOME_ACCESS",
    });
    const profile = await request(app)
      .get("/api/profile")
      .set(bearer(homeStudent));
    expect(profile.body.email).toBe("home@example.com");
    const hydrate = await request(app)
      .get("/api/get-progress?excludeProgress=true")
      .set(bearer(homeStudent));
    expect(hydrate.body.user.email).toBe("home@example.com");
  });

  it("HA-28: the sibling profile endpoints follow the same rule", async () => {
    const row = {
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      role: "student",
      school: null,
      subject: null,
      avatarUrl: null,
      createdAt: new Date("2026-01-01"),
    };
    prismaMock.user.findUnique.mockResolvedValue(row);
    prismaMock.user.update.mockResolvedValue(row);

    for (const session of [classroom, classroomPin]) {
      const self = await request(app)
        .get(`/api/users/${STUDENT_ID}`)
        .set(bearer(session));
      expect(self.status).toBe(200);
      expect(self.body.email).toBeNull();

      const edited = await request(app)
        .post("/api/edit-profile")
        .set(bearer(session))
        .send({});
      expect(edited.status).toBe(200);
      expect(edited.body.user.email).toBeNull();
      expect(JSON.stringify(edited.body)).not.toContain("home@example.com");
    }

    const home = await request(app)
      .get(`/api/users/${STUDENT_ID}`)
      .set(bearer(homeStudent));
    expect(home.body.email).toBe("home@example.com");
  });

  it("HA-29: the response guard withholds credential fields from every JSON reply to a classroom session", async () => {
    // Avatar changes are ordinary K-2 activity that echo the user row; the
    // structural guard (not a per-route fix) must strip email and parentEmail.
    prismaMock.user.update.mockResolvedValue({
      id: STUDENT_ID,
      name: "Ada",
      email: "home@example.com",
      role: "student",
      avatarUrl: "https://example.com/a.png",
    });
    for (const session of [classroom, classroomPin]) {
      const patched = await request(app)
        .patch("/api/user/avatar")
        .set(bearer(session))
        .send({ avatarUrl: "https://example.com/a.png" });
      expect(patched.status).toBe(200);
      expect(patched.body.user.email).toBeNull();
      expect(patched.text).not.toContain("home@example.com");

      const removed = await request(app)
        .delete("/api/user/avatar")
        .set(bearer(session));
      expect(removed.status).toBe(200);
      expect(removed.body.user.email).toBeNull();
    }

    // The home session is untouched by the guard.
    const home = await request(app)
      .delete("/api/user/avatar")
      .set(bearer(homeStudent));
    expect(home.body.user.email).toBe("home@example.com");
  });
});
