import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * #875 (SEC-05) — class-code sign-in is sized for a classroom, and its abuse
 * bounds follow the child rather than the address.
 *
 * Before this fix `GET /api/classes/by-code/:code` and
 * `POST /api/auth/class-login` shared `authLimiter`: 20 requests per 15
 * minutes per IP, counting successes. A class signs in from one school
 * address at two requests per child, so the eleventh child onwards was
 * refused while holding valid credentials, and teacher `/login` drew on the
 * same 20.
 *
 * The suite exercises the limits that ship — 60 failed lookups and 60 failed
 * sign-ins per address, 8 failed sign-ins per child — with no test-only
 * override, because the ratio between the address budget and the per-child
 * budget is itself part of the behaviour (CL-5).
 *
 * Two devices keep the cases independent of each other and of their order:
 *   - every request carries an explicit `X-Forwarded-For` (the app sets
 *     `trust proxy`, 1), so each case picks its own client address;
 *   - the per-child bucket is keyed by course *and* student and is therefore
 *     deliberately blind to the address, so each case that exhausts one uses
 *     its own course id.
 * Addresses are from TEST-NET-3 (203.0.113.0/24).
 *
 * RED evidence — this suite against main fc75512f, both routes sharing
 * `authLimiter` (20 per address per 15 minutes, successes counted):
 * **all 7 fail**.
 *   - CL-1: not every one of the 60 requests returned 200. The budget is
 *     spent after ten children, so children 11 to 30 were refused while
 *     holding valid credentials — the defect this ticket describes.
 *   - CL-2, CL-3, CL-5: the wrong PINs all returned 401 and were never cut
 *     off. No per-child bound existed, so one child's 4-digit PIN could be
 *     guessed at the address budget's rate, and from any number of addresses.
 *   - CL-4: the address bound fires at 20, not 60, so the first 60 answers
 *     were not all 401.
 *   - CL-6: the 21st *valid* lookup returned 429. Successful discovery was
 *     charged to the same bucket, which is what made a class of 30 impossible.
 *   - CL-7: teacher `/login` returned 429 once the class had signed in — the
 *     shared bucket at its plainest.
 */

const prismaMock = vi.hoisted(() => ({
  course: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
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

// Real bcrypt spends ~100ms per comparison and this suite makes several
// hundred. The PIN comparison itself is not what is under test.
const PIN_HASH = "hash-of-1234";
const RIGHT_PIN = "1234";
const WRONG_PIN = "0000";
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(
      async (plain: string, hash: string) =>
        hash === PIN_HASH && plain === RIGHT_PIN,
    ),
  },
}));

import app from "../../server";

const JOIN_CODE = "ABC234";
const CLASS_COURSE = "course-room-3";

/**
 * Thirty children, as a real K-2 class. Every third signs in with an icon
 * alone, the rest have a PIN — both are supported sign-in shapes, and only
 * the PIN holders can produce a *failed* sign-in.
 */
const ROSTER = Array.from({ length: 30 }, (_, i) => ({
  id: `student-${i + 1}`,
  name: `Child ${i + 1}`,
  role: "student",
  loginIcon: "star",
  loginPin: i % 3 === 2 ? null : PIN_HASH,
  level: 1,
  xp: 0,
  streak: 0,
  avatarUrl: null,
  preferredLanguage: "en",
  homeAccessEnabled: false,
}));

/** Only these can answer a PIN wrongly; an icon-only child is let in regardless. */
const PIN_CHILDREN = ROSTER.filter((s) => s.loginPin !== null);

const findStudent = (id: string) => ROSTER.find((s) => s.id === id);

const lookup = (ip: string, code = JOIN_CODE) =>
  request(app).get(`/api/classes/by-code/${code}`).set("X-Forwarded-For", ip);

const signIn = (
  ip: string,
  studentId: string,
  pin?: string,
  courseId = CLASS_COURSE,
) =>
  request(app)
    .post("/api/auth/class-login")
    .set("X-Forwarded-For", ip)
    .send({ courseId, studentId, ...(pin ? { pin } : {}) });

/** The PIN a child actually needs, so a "correct" sign-in is genuinely correct. */
const correctPin = (studentId: string) =>
  findStudent(studentId)?.loginPin ? RIGHT_PIN : undefined;

describe("#875 classroom sign-in limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.course.findUnique.mockImplementation(
      async ({ where }: { where: { joinCode: string } }) =>
        where.joinCode === JOIN_CODE
          ? {
              id: CLASS_COURSE,
              name: "Room 3",
              defaultLanguage: "en",
              teacher: { name: "Ms. Ruiz" },
              enrollments: ROSTER.map((student) => ({ student })),
            }
          : null,
    );

    // Enrollment is looked up by student; every case's course id names the
    // same class, so the roster answers for all of them.
    prismaMock.enrollment.findUnique.mockImplementation(
      async ({
        where,
      }: {
        where: { studentId_courseId: { studentId: string } };
      }) => {
        const student = findStudent(where.studentId_courseId.studentId);
        return student ? { student } : null;
      },
    );

    // Teacher login: no such account, so the route answers 401 whenever its
    // own bucket still has room — and 429 when it does not.
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  // ---- The acceptance case the ticket names ----

  it("CL-1 lets a whole class of 30 sign in through one school address", async () => {
    const ip = "203.0.113.1";
    const statuses: number[] = [];

    for (const student of ROSTER) {
      statuses.push((await lookup(ip)).status);
      statuses.push(
        (await signIn(ip, student.id, correctPin(student.id))).status,
      );
    }

    expect(statuses).toHaveLength(60);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  // ---- Wrong answers stay bounded, per child and per address ----

  it("CL-2 stops repeated wrong PINs for one child from one address", async () => {
    const ip = "203.0.113.2";
    const child = PIN_CHILDREN[0].id;
    const course = "course-cl2";
    const seen: number[] = [];

    for (let i = 0; i < 9; i += 1) {
      seen.push((await signIn(ip, child, WRONG_PIN, course)).status);
    }

    // Eight wrong answers are allowed for one child; the ninth is refused.
    expect(seen.slice(0, 8)).toEqual(Array(8).fill(401));
    expect(seen[8]).toBe(429);

    const blocked = await signIn(ip, child, WRONG_PIN, course);
    expect(blocked.body.error).toMatch(/for this student/i);
  });

  it("CL-3 stops wrong PINs for one child spread across many addresses", async () => {
    const child = PIN_CHILDREN[1].id;
    const course = "course-cl3";
    const seen: number[] = [];

    // A different address every time, so only a child-keyed bucket can see it.
    for (let i = 0; i < 9; i += 1) {
      seen.push(
        (await signIn(`203.0.113.${30 + i}`, child, WRONG_PIN, course)).status,
      );
    }

    expect(seen.slice(0, 8)).toEqual(Array(8).fill(401));
    expect(seen[8]).toBe(429);
  });

  it("CL-4 stops wrong PINs sprayed across many children from one address", async () => {
    const ip = "203.0.113.4";
    const course = "course-cl4";
    const seen: number[] = [];

    // Three wrong answers against each of the twenty PIN-holding children
    // leaves every child-keyed bucket at 3 of 8, so only the address-keyed
    // one can stop this. The 61st wrong answer exhausts the address budget.
    for (let round = 0; round < 3; round += 1) {
      for (const student of PIN_CHILDREN) {
        seen.push((await signIn(ip, student.id, WRONG_PIN, course)).status);
      }
    }
    seen.push((await signIn(ip, PIN_CHILDREN[0].id, WRONG_PIN, course)).status);

    expect(PIN_CHILDREN).toHaveLength(20);
    expect(seen).toHaveLength(61);
    expect(seen.slice(0, 60)).toEqual(Array(60).fill(401));
    expect(seen[60]).toBe(429);
  });

  it("CL-5 keeps one child's lockout off their classmates", async () => {
    const ip = "203.0.113.5";
    const course = "course-cl5";
    const blockedChild = PIN_CHILDREN[2].id;
    const classmate = PIN_CHILDREN[3].id;

    for (let i = 0; i < 8; i += 1) {
      await signIn(ip, blockedChild, WRONG_PIN, course);
    }
    expect((await signIn(ip, blockedChild, WRONG_PIN, course)).status).toBe(
      429,
    );

    // The address has spent 9 of its 60, so nothing here is address-wide.
    const ok = await signIn(ip, classmate, correctPin(classmate), course);
    expect(ok.status).toBe(200);
    expect(ok.body.user.id).toBe(classmate);
  });

  // ---- Discovery is bounded separately from authentication ----

  it("CL-6 charges nothing for valid lookups and bounds code scanning", async () => {
    const ip = "203.0.113.6";

    // Sixty valid lookups — the whole failure budget over again — all succeed,
    // because only failures are counted.
    for (let i = 0; i < 60; i += 1) {
      expect((await lookup(ip)).status).toBe(200);
    }

    const scans: number[] = [];
    for (let i = 0; i < 61; i += 1) {
      scans.push((await lookup(ip, `ZZ${String(i).padStart(4, "0")}`)).status);
    }

    expect(scans.slice(0, 60)).toEqual(Array(60).fill(404));
    expect(scans[60]).toBe(429);
  });

  // ---- The teacher's bucket is no longer the class's bucket ----

  it("CL-7 leaves teacher sign-in unaffected by a class signing in", async () => {
    const ip = "203.0.113.7";

    for (const student of ROSTER) {
      await lookup(ip);
      await signIn(ip, student.id, correctPin(student.id));
    }

    const teacher = await request(app)
      .post("/api/login")
      .set("X-Forwarded-For", ip)
      .send({ email: "teacher@example.invalid", password: "wrong-password-1" });

    expect(teacher.status).toBe(401);
  });
});
