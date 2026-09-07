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
  isTrustedEnrollment,
  redactMilestone,
  visibleMilestones,
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
  const m = (
    over: Partial<{
      trackSlug: string;
      createdAt: Date;
      updatedAt: Date;
      artifacts: unknown;
      homeworkResponse: string | null;
    }>,
  ) => ({
    trackSlug: "cyber-launch",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-02"),
    artifacts: { a: 1 },
    homeworkResponse: "text",
    ...over,
  });

  it("BND-1: only milestones in the cohort's tracks touched since acceptance are visible", () => {
    const rows = [
      m({}), // old, untouched → hidden
      m({ updatedAt: new Date("2026-06-05") }), // touched after → visible (redacted)
      m({
        createdAt: new Date("2026-06-03"),
        updatedAt: new Date("2026-06-04"),
      }), // new → visible, full
      m({
        trackSlug: "other",
        createdAt: new Date("2026-06-03"),
        updatedAt: new Date("2026-06-04"),
      }), // other track → hidden
    ];
    const out = visibleMilestones(rows, [
      { trackIds: ["cyber-launch"], since },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].homeworkResponse).toBeNull();
    expect(out[0].artifacts).toBeNull();
    expect(out[1].homeworkResponse).toBe("text");
  });

  it("BND-2: with two relationships the earliest acceptance decides redaction", () => {
    const row = m({
      createdAt: new Date("2026-05-15"),
      updatedAt: new Date("2026-06-10"),
    });
    const out = visibleMilestones(
      [row],
      [
        { trackIds: ["cyber-launch"], since: new Date("2026-06-01") },
        { trackIds: ["cyber-launch"], since: new Date("2026-05-10") },
      ],
    );
    expect(out).toHaveLength(1);
    expect(out[0].homeworkResponse).toBe("text"); // created after the earliest acceptance
  });

  it("BND-3: redaction never mutates the input", () => {
    const row = m({});
    const out = redactMilestone(row, since);
    expect(out).not.toBe(row);
    expect(row.homeworkResponse).toBe("text");
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
