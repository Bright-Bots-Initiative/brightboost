import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

/**
 * #873 — global experiment administration requires the explicit staff
 * capability (role `admin`, re-read from the database). A publicly registered
 * teacher — even the experiment's creator — can neither read the management
 * surface nor mutate an experiment nor trigger its Slack notifications.
 * Learner routes (variant assignment, event tracking) keep working for every
 * authenticated user, side effects included.
 *
 * Runs through the mounted app with real signed JWTs and the real middleware;
 * Prisma and Slack delivery are mocked so denied requests can be shown to
 * cause no mutation and no notification.
 *
 * RED evidence (this suite against the pre-fix route from main 72746e87):
 * 6 of 12 cases fail — EX-6, EX-7, EX-8, EX-11, EX-12 and EX-13. A teacher
 * received the experiment list with 200 and changed another creator's traffic
 * split with 200 (Slack posted on the "running" transition), and any token or
 * dev-shim identity that merely said `admin` passed `requireRole` with no
 * database check — including ids that do not exist.
 */

const SECRET = process.env.SESSION_SECRET || "default_dev_secret";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  experiment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  experimentAssignment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  experimentEvent: { create: vi.fn(), findMany: vi.fn() },
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

const slackMock = vi.hoisted(() => ({ notifySlack: vi.fn() }));
vi.mock("../../utils/slack", () => ({
  notifySlack: slackMock.notifySlack,
}));

import app from "../../server";

type Claims = { id: string; role: string; auth?: string };
const bearer = (claims: Claims) => ({
  Authorization: `Bearer ${jwt.sign(claims, SECRET, { expiresIn: "1h" })}`,
});

const TEACHER = { id: "teacher-public", role: "teacher", auth: "password" };
const CREATOR = { id: "teacher-creator", role: "teacher", auth: "password" };
const STUDENT = { id: "student-1", role: "student", auth: "class_code" };
const ADMIN = { id: "staff-1", role: "admin", auth: "password" };
const DEMOTED = { id: "staff-demoted", role: "admin", auth: "password" };

const EXPERIMENT = {
  id: "exp-1",
  slug: "new-map-cta",
  name: "New map CTA",
  hypothesis: "A bigger button gets more taps",
  metric: "game_completed",
  status: "draft",
  trafficSplit: 50,
  createdBy: CREATOR.id,
  createdAt: new Date("2026-08-01"),
  completedAt: null,
  conclusion: null,
};

/** Database roles: the JWT claim is not enough for staff routes. */
function dbRoles(map: Record<string, string>) {
  prismaMock.user.findUnique.mockImplementation(({ where }: any) =>
    Promise.resolve(where.id in map ? { role: map[where.id] } : null),
  );
}

const ADMIN_ROUTES = [
  { name: "list", req: () => request(app).get("/api/experiments") },
  {
    name: "create",
    req: () =>
      request(app).post("/api/experiments").send({
        slug: "hijack",
        name: "Hijack",
        hypothesis: "h",
        metric: "m",
      }),
  },
  {
    name: "update",
    req: () =>
      request(app)
        .put(`/api/experiments/${EXPERIMENT.id}`)
        .send({ status: "running", trafficSplit: 100 }),
  },
  {
    name: "results",
    req: () => request(app).get(`/api/experiments/${EXPERIMENT.id}/results`),
  },
];

function expectNoAdminSideEffects() {
  expect(prismaMock.experiment.findMany).not.toHaveBeenCalled();
  expect(prismaMock.experiment.findUnique).not.toHaveBeenCalled();
  expect(prismaMock.experiment.create).not.toHaveBeenCalled();
  expect(prismaMock.experiment.update).not.toHaveBeenCalled();
  expect(prismaMock.experimentEvent.findMany).not.toHaveBeenCalled();
  expect(prismaMock.experimentAssignment.groupBy).not.toHaveBeenCalled();
  expect(slackMock.notifySlack).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ALLOW_DEV_ROLE_HEADER;
  dbRoles({
    [TEACHER.id]: "teacher",
    [CREATOR.id]: "teacher",
    [STUDENT.id]: "student",
    [ADMIN.id]: "admin",
    [DEMOTED.id]: "teacher", // token still says admin; database says teacher
  });
  prismaMock.experiment.findUnique.mockResolvedValue(EXPERIMENT);
  prismaMock.experiment.findMany.mockResolvedValue([
    { ...EXPERIMENT, _count: { assignments: 3, events: 9 } },
  ]);
  prismaMock.experiment.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ ...EXPERIMENT, ...data, id: "exp-new" }),
  );
  prismaMock.experiment.update.mockImplementation(({ data }: any) =>
    Promise.resolve({ ...EXPERIMENT, ...data }),
  );
  prismaMock.experimentAssignment.groupBy.mockResolvedValue([]);
  prismaMock.experimentEvent.findMany.mockResolvedValue([]);
  prismaMock.experimentAssignment.count.mockResolvedValue(1);
});

describe("#873 administrative experiment routes", () => {
  it("EX-1..4: a guest gets 401 on every administrative route, with no work done", async () => {
    for (const route of ADMIN_ROUTES) {
      const res = await route.req();
      expect(res.status, route.name).toBe(401);
    }
    expectNoAdminSideEffects();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("EX-5: a student gets 403 everywhere; nothing is read, written or notified", async () => {
    for (const route of ADMIN_ROUTES) {
      const res = await route.req().set(bearer(STUDENT));
      expect(res.status, route.name).toBe(403);
      expect(res.body).toEqual({ error: "forbidden" });
    }
    expectNoAdminSideEffects();
  });

  it("EX-6: a publicly registered teacher gets 403 everywhere; a status change posts nothing to Slack", async () => {
    for (const route of ADMIN_ROUTES) {
      const res = await route.req().set(bearer(TEACHER));
      expect(res.status, route.name).toBe(403);
      expect(res.body).toEqual({ error: "forbidden" });
      // The list must not leak: no experiment fields in a denial.
      expect(JSON.stringify(res.body)).not.toContain(EXPERIMENT.name);
    }
    expectNoAdminSideEffects();
    // Denied before the role lookup even ran (token role is not admin).
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("EX-7: the teacher who created the experiment is still not staff", async () => {
    const update = await request(app)
      .put(`/api/experiments/${EXPERIMENT.id}`)
      .set(bearer(CREATOR))
      .send({ status: "completed", conclusion: "done" });
    expect(update.status).toBe(403);

    const results = await request(app)
      .get(`/api/experiments/${EXPERIMENT.id}/results`)
      .set(bearer(CREATOR));
    expect(results.status).toBe(403);

    expectNoAdminSideEffects();
  });

  it("EX-8: an admin claim in the token is not enough — the role is re-read from the database", async () => {
    for (const route of ADMIN_ROUTES) {
      const res = await route.req().set(bearer(DEMOTED));
      expect(res.status, route.name).toBe(403);
    }
    expectNoAdminSideEffects();
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DEMOTED.id } }),
    );
  });

  it("EX-9: staff lists, creates, updates (with the Slack notification) and reads results", async () => {
    const list = await request(app).get("/api/experiments").set(bearer(ADMIN));
    expect(list.status).toBe(200);
    expect(list.body[0].slug).toBe(EXPERIMENT.slug);

    prismaMock.experiment.findUnique.mockResolvedValueOnce(null); // slug free
    const created = await request(app)
      .post("/api/experiments")
      .set(bearer(ADMIN))
      .send({
        slug: "staff-made",
        name: "Staff made",
        hypothesis: "h",
        metric: "m",
      });
    expect(created.status).toBe(201);
    expect(prismaMock.experiment.create.mock.calls[0][0].data.createdBy).toBe(
      ADMIN.id,
    );

    const running = await request(app)
      .put(`/api/experiments/${EXPERIMENT.id}`)
      .set(bearer(ADMIN))
      .send({ status: "running" });
    expect(running.status).toBe(200);
    expect(prismaMock.experiment.update).toHaveBeenCalledTimes(1);
    expect(slackMock.notifySlack).toHaveBeenCalledTimes(1);
    expect(slackMock.notifySlack.mock.calls[0][0]).toBe("#experiments");
    expect(slackMock.notifySlack.mock.calls[0][1]).toContain(
      "Experiment started",
    );

    const results = await request(app)
      .get(`/api/experiments/${EXPERIMENT.id}/results`)
      .set(bearer(ADMIN));
    expect(results.status).toBe(200);
    expect(results.body.experiment.slug).toBe(EXPERIMENT.slug);
  });

  it("EX-11: request body fields cannot grant the capability", async () => {
    const res = await request(app)
      .put(`/api/experiments/${EXPERIMENT.id}`)
      .set(bearer(TEACHER))
      .send({ status: "running", role: "admin", createdBy: TEACHER.id });
    expect(res.status).toBe(403);
    expectNoAdminSideEffects();
  });

  it("EX-12: the dev/test role shim cannot manufacture staff", async () => {
    // With the shim enabled and no bearer token, x-role/x-user-id become the
    // identity. A claimed admin role still has to exist as admin in the
    // database; an unknown or non-admin id is refused with no work done.
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    try {
      for (const id of ["no-such-user", TEACHER.id]) {
        for (const route of ADMIN_ROUTES) {
          const res = await route
            .req()
            .set("x-role", "admin")
            .set("x-user-id", id);
          expect(res.status, `${route.name} as ${id}`).toBe(403);
        }
      }
    } finally {
      delete process.env.ALLOW_DEV_ROLE_HEADER;
    }
    expectNoAdminSideEffects();
  });

  it("EX-13: an admin token for an account that no longer exists is refused", async () => {
    const ghost = { id: "deleted-admin", role: "admin", auth: "password" };
    for (const route of ADMIN_ROUTES) {
      const res = await route.req().set(bearer(ghost));
      expect(res.status, route.name).toBe(403);
    }
    expectNoAdminSideEffects();
  });
});

describe("#873 learner routes keep their behaviour and side effects", () => {
  const RUNNING = { ...EXPERIMENT, status: "running" };

  it("EX-10a: a student is assigned a variant of a running experiment", async () => {
    prismaMock.experiment.findUnique.mockResolvedValue(RUNNING);
    prismaMock.experimentAssignment.findUnique.mockResolvedValue(null);
    prismaMock.experimentAssignment.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "asg-1", ...data }),
    );

    const res = await request(app)
      .get(`/api/experiments/${EXPERIMENT.slug}/variant`)
      .set(bearer(STUDENT));
    expect(res.status).toBe(200);
    expect(["control", "variant"]).toContain(res.body.variant);
    expect(prismaMock.experimentAssignment.create).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.experimentAssignment.create.mock.calls[0][0].data.userId,
    ).toBe(STUDENT.id);
    // No staff check on learner routes.
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("EX-10b: a teacher (as a learner) records an event and the milestone alert still fires", async () => {
    prismaMock.experiment.findUnique.mockResolvedValue(RUNNING);
    prismaMock.experimentAssignment.findUnique.mockResolvedValue({
      variant: "variant",
    });
    prismaMock.experimentEvent.create.mockResolvedValue({ id: "ev-1" });
    prismaMock.experimentAssignment.count.mockResolvedValue(25); // milestone

    const res = await request(app)
      .post(`/api/experiments/${EXPERIMENT.slug}/event`)
      .set(bearer(TEACHER))
      .send({ eventName: "game_completed", eventValue: 1 });
    expect(res.status).toBe(201);
    expect(prismaMock.experimentEvent.create).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.experimentEvent.create.mock.calls[0][0].data,
    ).toMatchObject({
      userId: TEACHER.id,
      variant: "variant",
      eventName: "game_completed",
    });
    expect(slackMock.notifySlack).toHaveBeenCalledTimes(1);
    expect(slackMock.notifySlack.mock.calls[0][1]).toContain("25 users");
  });

  it("EX-10c: a guest gets 401 on learner routes", async () => {
    const variant = await request(app).get(
      `/api/experiments/${EXPERIMENT.slug}/variant`,
    );
    expect(variant.status).toBe(401);
    const event = await request(app)
      .post(`/api/experiments/${EXPERIMENT.slug}/event`)
      .send({ eventName: "x" });
    expect(event.status).toBe(401);
    expect(prismaMock.experimentAssignment.create).not.toHaveBeenCalled();
    expect(prismaMock.experimentEvent.create).not.toHaveBeenCalled();
  });
});
