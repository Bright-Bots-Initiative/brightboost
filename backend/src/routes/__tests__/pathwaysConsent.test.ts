import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

/**
 * #874 — unit-level guarantees that do not need a database:
 *
 * - the invite route never looks the address up and answers identically for
 *   any address (no account-existence oracle at the route layer);
 * - the pure history-boundary helpers behave as specified;
 * - accepting as the wrong account / an unknown id is a 404 with no write.
 *
 * The full consent matrix (real join semantics, concurrency, revocation,
 * legacy rows) is in pathwaysConsent.db.test.ts against a real PostgreSQL.
 *
 * RED evidence (pre-fix main 72746e87): INV-1 fails — the baseline route
 * looked the email up (`user.findUnique`) and created an active enrollment
 * for an existing account while answering 404 for an unknown one.
 */

const SECRET = process.env.SESSION_SECRET || "default_dev_secret";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  pathwayCohort: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  pathwayInvite: {
    upsert: vi.fn(),
    findUnique: vi.fn(), // accepted-invite check; unset → not accepted
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  pathwayEnrollment: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
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

import app from "../../server";
import {
  averageVisibleScore,
  boundariesOf,
  isTrustedEnrollment,
  matchableEmail,
  moduleEvidence,
  projectMilestone,
  visibleMilestones,
  withTrackBoundaries,
  type ProvenanceEvent,
} from "../../services/pathwaysAccess";

const bearer = (claims: { id: string; role: string }) => ({
  Authorization: `Bearer ${jwt.sign({ ...claims, auth: "password" }, SECRET, { expiresIn: "1h" })}`,
});
const FAC = { id: "fac-1", role: "teacher" };
const LEARNER = { id: "lrn-1", role: "student" };
const COHORT = { id: "coh-1", name: "Cohort", facilitatorId: FAC.id };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ALLOW_DEV_ROLE_HEADER;
  prismaMock.pathwayCohort.findFirst.mockResolvedValue(COHORT);
  prismaMock.pathwayInvite.upsert.mockImplementation(({ create }: any) =>
    Promise.resolve({
      id: "inv-1",
      email: create.email,
      status: "pending",
      expiresAt: new Date(),
    }),
  );
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
  );
});

describe("#874 invite route", () => {
  it("INV-1: inviting never looks the address up and answers the same for any address", async () => {
    const existing = await request(app)
      .post(`/api/pathways/facilitator/cohorts/${COHORT.id}/learners`)
      .set(bearer(FAC))
      .send({ email: "Known@Example.com" });
    const unknown = await request(app)
      .post(`/api/pathways/facilitator/cohorts/${COHORT.id}/learners`)
      .set(bearer(FAC))
      .send({ email: "nobody@example.com" });

    expect(existing.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(existing.text).toBe(unknown.text);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.pathwayEnrollment.upsert).not.toHaveBeenCalled();
    expect(prismaMock.pathwayEnrollment.create).not.toHaveBeenCalled();
    // Normalised, recorded as an invitation only.
    expect(prismaMock.pathwayInvite.upsert.mock.calls[0][0].create.email).toBe(
      "known@example.com",
    );
    expect(prismaMock.pathwayInvite.upsert.mock.calls[0][0].create.status).toBe(
      "pending",
    );
  });

  it("INV-2: a malformed address is a 400 and a foreign cohort a 404, with no writes", async () => {
    const bad = await request(app)
      .post(`/api/pathways/facilitator/cohorts/${COHORT.id}/learners`)
      .set(bearer(FAC))
      .send({ email: "not-an-email" });
    expect(bad.status).toBe(400);

    prismaMock.pathwayCohort.findFirst.mockResolvedValue(null);
    const foreign = await request(app)
      .post(`/api/pathways/facilitator/cohorts/other/learners`)
      .set(bearer(FAC))
      .send({ email: "someone@example.com" });
    expect(foreign.status).toBe(404);
    expect(prismaMock.pathwayInvite.upsert).not.toHaveBeenCalled();
  });

  it("INV-3: a student cannot use the facilitator invite route", async () => {
    const res = await request(app)
      .post(`/api/pathways/facilitator/cohorts/${COHORT.id}/learners`)
      .set(bearer(LEARNER))
      .send({ email: "someone@example.com" });
    expect(res.status).toBe(403);
    expect(prismaMock.pathwayInvite.upsert).not.toHaveBeenCalled();
  });
});

describe("#874 accept route", () => {
  it("ACC-1: accepting as an account whose email does not match is 404 with no write", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      email: "other@example.com",
    });
    prismaMock.pathwayInvite.findFirst.mockResolvedValue(null); // no invite for that email
    const res = await request(app)
      .post("/api/pathways/student/invitations/inv-1/accept")
      .set(bearer(LEARNER));
    expect(res.status).toBe(404);
    expect(prismaMock.pathwayInvite.findFirst).toHaveBeenCalledWith({
      where: { id: "inv-1", email: "other@example.com" },
    });
    expect(prismaMock.pathwayInvite.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.pathwayEnrollment.upsert).not.toHaveBeenCalled();
  });

  it("ACC-2: an account without an email can accept nothing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: null });
    const res = await request(app)
      .post("/api/pathways/student/invitations/inv-1/accept")
      .set(bearer(LEARNER));
    expect(res.status).toBe(404);
    expect(prismaMock.pathwayInvite.findFirst).not.toHaveBeenCalled();
  });
});

describe("#874 history boundary helpers", () => {
  const since = new Date("2026-06-01");
  type Row = Parameters<typeof projectMilestone>[0];
  const row = (over: Partial<Row> = {}): Row => ({
    id: "m-1",
    userId: "learner-1",
    trackSlug: "cyber-launch",
    moduleSlug: "phishing-101",
    status: "completed",
    score: 91,
    completedAt: new Date("2026-05-02"),
    artifacts: { a: 1 },
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-02"),
    hookCompleted: true,
    readingCompleted: true,
    lessonCompleted: true,
    practiceCompleted: true,
    homeworkSubmitted: true,
    homeworkResponse: "text",
    quizCompleted: true,
    quizScore: 80,
    timeSpentMinutes: 30,
    ...over,
  });
  const ev = (
    source: string,
    section?: string,
    over: Partial<ProvenanceEvent> = {},
  ): ProvenanceEvent => ({
    source,
    sourceRefId: "phishing-101",
    metadata: { trackSlug: "cyber-launch", ...(section ? { section } : {}) },
    createdAt: new Date("2026-06-05"),
    ...over,
  });
  const boundary = [{ trackIds: ["cyber-launch"], since }];

  it("BND-1: only milestones in the cohort's tracks touched since acceptance are admitted", () => {
    const rows = [
      row({ id: "old" }), // old, untouched → hidden
      row({ id: "touched", updatedAt: new Date("2026-06-05") }), // touched after → admitted, projected
      row({
        id: "new",
        createdAt: new Date("2026-06-03"),
        updatedAt: new Date("2026-06-04"),
      }), // new → whole
      row({
        id: "other",
        trackSlug: "other",
        createdAt: new Date("2026-06-03"),
        updatedAt: new Date("2026-06-04"),
      }), // other track → hidden
    ];
    const out = visibleMilestones(rows, boundary, []);
    expect(out.map((m) => m.id)).toEqual(["touched", "new"]);
    expect(out[0].historyWithheld).toBe(true);
    expect(out[1].historyWithheld).toBe(false);
    expect(out[1].score).toBe(91);
    expect(out[1].homeworkResponse).toBe("text");
  });

  it("BND-2: a pre-consent row touched after consent reveals no historical value", () => {
    const [m] = visibleMilestones(
      [row({ updatedAt: new Date("2026-06-05") })],
      boundary,
      [],
    );
    expect(m).toMatchObject({
      status: "in_progress",
      score: null,
      completedAt: null,
      artifacts: null,
      createdAt: null,
      hookCompleted: false,
      readingCompleted: false,
      lessonCompleted: false,
      practiceCompleted: false,
      homeworkSubmitted: false,
      homeworkResponse: null,
      quizCompleted: false,
      quizScore: null,
      timeSpentMinutes: null,
      historyWithheld: true,
    });
    expect(m.updatedAt).toEqual(new Date("2026-06-05"));
  });

  it("BND-3: a post-consent completion shows the completion, never the score", () => {
    const [m] = visibleMilestones(
      [
        row({
          completedAt: new Date("2026-06-07"),
          updatedAt: new Date("2026-06-07"),
        }),
      ],
      boundary,
      [],
    );
    expect(m.status).toBe("completed");
    expect(m.completedAt).toEqual(new Date("2026-06-07"));
    expect(m.score).toBeNull();
    expect(m.artifacts).toBeNull();
  });

  it("BND-4: a flag is shown only when set AND proven by a post-consent event for this track", () => {
    const events = [
      ev("section", "hook"),
      ev("section", "reading", {
        metadata: { trackSlug: "other-track", section: "reading" },
      }), // wrong track
      ev("section", "lesson", { createdAt: new Date("2026-05-20") }), // before consent
      ev("section", "practice", { sourceRefId: "another-module" }), // other module
      ev("quiz", "quiz"),
      ev("section", "homework"),
    ];
    const [m] = visibleMilestones(
      [row({ updatedAt: new Date("2026-06-05") })],
      boundary,
      events,
    );
    expect(m.hookCompleted).toBe(true);
    expect(m.readingCompleted).toBe(false);
    expect(m.lessonCompleted).toBe(false);
    expect(m.practiceCompleted).toBe(false);
    expect(m.quizCompleted).toBe(true);
    expect(m.quizScore).toBeNull();
    expect(m.homeworkSubmitted).toBe(true);
    expect(m.homeworkResponse).toBeNull(); // the flag proves the act, not the text
  });

  it("BND-5: an unset flag stays false despite an event; homework text needs the submission event", () => {
    const [m] = visibleMilestones(
      [row({ updatedAt: new Date("2026-06-05"), hookCompleted: false })],
      boundary,
      [ev("section", "hook"), ev("homework")],
    );
    expect(m.hookCompleted).toBe(false);
    expect(m.homeworkSubmitted).toBe(true);
    expect(m.homeworkResponse).toBe("text");
  });

  it("BND-6: with two relationships the earliest acceptance decides the projection", () => {
    const r = row({
      createdAt: new Date("2026-05-15"),
      updatedAt: new Date("2026-06-10"),
    });
    const out = visibleMilestones(
      [r],
      [
        { trackIds: ["cyber-launch"], since: new Date("2026-06-01") },
        { trackIds: ["cyber-launch"], since: new Date("2026-05-10") },
      ],
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].historyWithheld).toBe(false);
    expect(out[0].homeworkResponse).toBe("text");
  });

  it("BND-7: projection never mutates the input", () => {
    const r = row({ updatedAt: new Date("2026-06-05") });
    const out = projectMilestone(
      r,
      since,
      moduleEvidence([], "cyber-launch", "phishing-101", since),
    );
    expect(out).not.toBe(r);
    expect(r.homeworkResponse).toBe("text");
    expect(r.score).toBe(91);
  });

  it("BND-9: track boundaries keep earlier consent, add new tracks at the act, drop unlisted ones", () => {
    const first = withTrackBoundaries(null, ["a", "b"], new Date("2026-06-01"));
    expect(first).toEqual({
      a: "2026-06-01T00:00:00.000Z",
      b: "2026-06-01T00:00:00.000Z",
    });
    const later = withTrackBoundaries(
      first,
      ["b", "c"],
      new Date("2026-07-01"),
    );
    expect(later).toEqual({
      b: "2026-06-01T00:00:00.000Z",
      c: "2026-07-01T00:00:00.000Z",
    });
    // Editing the cohort's tracks alone yields no boundary for the new track.
    const accepted = new Date("2026-06-01");
    expect(boundariesOf(["a", "b", "c"], accepted, first)).toEqual([
      { trackIds: ["a"], since: accepted },
      { trackIds: ["b"], since: accepted },
    ]);
    // A snapshot can never predate the acceptance; a missing snapshot
    // (operator-written row) falls back to the cohort's tracks at acceptance.
    expect(
      boundariesOf(["a"], new Date("2026-06-15"), {
        a: "2026-06-01T00:00:00.000Z",
      }),
    ).toEqual([{ trackIds: ["a"], since: new Date("2026-06-15") }]);
    expect(boundariesOf(["a"], accepted, null)).toEqual([
      { trackIds: ["a"], since: accepted },
    ]);
  });

  it("BND-10: only an account whose login email is its parent's address is excluded from invitation matching", () => {
    const base = {
      email: "Kid@Example.com",
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: null as string | null,
    };
    expect(
      matchableEmail({ ...base, parentEmail: "kid@example.com" }),
    ).toBeNull();
    expect(matchableEmail({ ...base, parentEmail: "mom@example.com" })).toBe(
      "kid@example.com",
    );
    expect(matchableEmail({ ...base, parentEmail: null })).toBe(
      "kid@example.com",
    );
    expect(
      matchableEmail({
        ...base,
        managedByParent: false,
        parentEmail: "kid@example.com",
      }),
    ).toBe("kid@example.com");
    expect(
      matchableEmail({
        ...base,
        homeAccessEnabled: false,
        parentEmail: "kid@example.com",
      }),
    ).toBe("kid@example.com");
    expect(matchableEmail({ ...base, email: null })).toBeNull();
    expect(matchableEmail(null)).toBeNull();
  });

  it("BND-8: averages exclude withheld scores instead of counting them as zero", () => {
    expect(averageVisibleScore([{ score: null }, { score: 80 }])).toBe(80);
    expect(averageVisibleScore([{ score: null }])).toBeNull();
    expect(averageVisibleScore([])).toBeNull();
  });

  it("TRUST-1: trusted means active/completed AND accepted", () => {
    expect(
      isTrustedEnrollment({ status: "active", acceptedAt: new Date() }),
    ).toBe(true);
    expect(
      isTrustedEnrollment({ status: "completed", acceptedAt: new Date() }),
    ).toBe(true);
    expect(isTrustedEnrollment({ status: "active", acceptedAt: null })).toBe(
      false,
    ); // legacy
    expect(
      isTrustedEnrollment({ status: "revoked", acceptedAt: new Date() }),
    ).toBe(false);
    expect(
      isTrustedEnrollment({ status: "dropped", acceptedAt: new Date() }),
    ).toBe(false);
  });
});
