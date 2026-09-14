import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import {
  BIOTRAIL_ACTIVITY_ID,
  BIOTRAIL_LESSON_ID,
  BIOTRAIL_SLUG,
} from "@brightboost/greatwork-engine/dist/progression/advanced";
import { STEM_SET_3_PLACEHOLDER_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";

/**
 * #876 (PROG-01) — the two progress writers share one curriculum guard.
 *
 * RED evidence on pre-fix main (fc75512f): CK-1 answers 200 and writes
 * COMPLETED; CK-2/CK-3 answer 200 for ids no Activity row carries; CK-4/CK-5
 * answer 200 with the forged module/lesson persisted; CK-6 answers 200 for a
 * locked learner; CA-1/CA-2 answer 200 with a forged module/lesson persisted;
 * CA-3 persists a null lesson; CA-4/CA-6 answer 200 and store a personal best
 * under a game the activity is not.
 */

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  progress: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  avatar: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  activity: { findUnique: vi.fn() },
  ability: { findMany: vi.fn() },
  unlockedAbility: { findMany: vi.fn(), createMany: vi.fn() },
  gamePersonalBest: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));
vi.mock("../../services/analytics", () => ({
  trackServer: vi.fn(),
  shutdownAnalytics: vi.fn(),
  getAnalyticsClient: vi.fn(() => null),
}));

import app from "../../server";

/** The Activity → Lesson → Unit → Module chain as `resolveActivityForWrite` loads it. */
const chain = (slug: string, lessonId = "lesson-1") => ({
  Lesson: { id: lessonId, Unit: { Module: { slug } } },
});

const ACTIVITY = {
  id: "valid-activity",
  lessonId: "lesson-1",
  title: "Test Activity",
  kind: "INTERACT",
  order: 1,
  content: JSON.stringify({ gameKey: "move_measure" }),
  ...chain("test-module"),
};

const AVATAR = {
  id: "avatar-1",
  studentId: "student-123",
  stage: "GENERAL",
  archetype: null,
  xp: 100,
  energy: 50,
  hp: 50,
  level: 1,
  speed: 0,
  control: 0,
  focus: 0,
};

const CREATED_ROW = {
  id: "prog-1",
  studentId: "student-123",
  moduleSlug: "test-module",
  lessonId: "lesson-1",
  activityId: "valid-activity",
  status: "COMPLETED",
  timeSpentS: 10,
};

/** Each request gets its own address so the test-mode limiter (5/IP) never trips. */
let ipSeq = 0;
function post(path: string, body: Record<string, unknown>) {
  ipSeq += 1;
  return request(app)
    .post(path)
    .set("Authorization", "Bearer mock-token-for-mvp")
    .set("X-Forwarded-For", `203.0.113.${ipSeq}`)
    .send(body);
}
const checkpoint = (body: Record<string, unknown>) =>
  post("/api/progress/checkpoint", {
    studentId: "student-123",
    moduleSlug: "test-module",
    lessonId: "lesson-1",
    activityId: "valid-activity",
    timeSpentS: 30,
    ...body,
  });
const complete = (body: Record<string, unknown>) =>
  post("/api/progress/complete-activity", {
    moduleSlug: "test-module",
    lessonId: "lesson-1",
    activityId: "valid-activity",
    timeSpentS: 10,
    ...body,
  });

function armHappyCompletion() {
  prismaMock.avatar.findUnique.mockResolvedValue(AVATAR);
  prismaMock.$queryRaw.mockResolvedValue([AVATAR]);
  prismaMock.avatar.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.avatar.update.mockResolvedValue({ ...AVATAR, xp: 150 });
  prismaMock.progress.findUnique.mockResolvedValue(null);
  prismaMock.progress.createMany.mockResolvedValue({ count: 1 });
  prismaMock.progress.findUniqueOrThrow.mockResolvedValue(CREATED_ROW);
  prismaMock.progress.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.progress.count.mockResolvedValue(1);
  prismaMock.ability.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.findMany.mockResolvedValue([]);
  prismaMock.unlockedAbility.createMany.mockResolvedValue({ count: 0 });
  prismaMock.gamePersonalBest.findUnique.mockResolvedValue(null);
  prismaMock.gamePersonalBest.create.mockResolvedValue({});
  prismaMock.gamePersonalBest.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(prismaMock)
      : Promise.all(arg as Promise<unknown>[]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.activity.findUnique.mockResolvedValue(ACTIVITY);
  prismaMock.progress.upsert.mockImplementation(
    async ({ create }: { create: Record<string, unknown> }) => ({
      id: "prog-ck",
      timeSpentS: create.timeSpentS,
      status: create.status,
    }),
  );
});

describe("#876 — POST /progress/checkpoint never completes", () => {
  it("CK-1: `completed: true` is refused with 400 and nothing is written", async () => {
    const res = await checkpoint({ completed: true });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toContain("complete-activity");
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-2: a reserved Set 3 placeholder id has no Activity row and answers 404", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    for (const id of STEM_SET_3_PLACEHOLDER_IDS) {
      const res = await checkpoint({ activityId: id });
      expect(res.status, id).toBe(404);
    }
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-3: an orphan activity id answers 404", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    const res = await checkpoint({ activityId: "no-such-activity" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Activity not found");
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-4: a lesson id the activity does not belong to answers 400", async () => {
    const res = await checkpoint({ lessonId: "some-other-lesson" });
    expect(res.status).toBe(400);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-5: a module slug the activity does not belong to answers 400", async () => {
    const res = await checkpoint({ moduleSlug: "k2-stem-track-maker" });
    expect(res.status).toBe(400);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-6: BioTrail keeps its prerequisite on the checkpoint writer too (403 while locked)", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      id: BIOTRAIL_ACTIVITY_ID,
      lessonId: BIOTRAIL_LESSON_ID,
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "biotrail" }),
      ...chain(BIOTRAIL_SLUG, BIOTRAIL_LESSON_ID),
    });
    prismaMock.avatar.findUnique.mockResolvedValue({
      stage: "GENERAL",
      archetype: null,
    });
    prismaMock.progress.findMany.mockResolvedValue([]);

    const res = await checkpoint({
      moduleSlug: BIOTRAIL_SLUG,
      lessonId: BIOTRAIL_LESSON_ID,
      activityId: BIOTRAIL_ACTIVITY_ID,
    });
    expect(res.status).toBe(403);
    expect(prismaMock.progress.upsert).not.toHaveBeenCalled();
  });

  it("CK-7: a valid checkpoint creates IN_PROGRESS with the chain's identifiers and only adds time on update", async () => {
    const res = await checkpoint({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("IN_PROGRESS");
    expect(prismaMock.progress.upsert).toHaveBeenCalledTimes(1);
    const args = prismaMock.progress.upsert.mock.calls[0][0];
    expect(args.create).toEqual({
      studentId: "student-123",
      moduleSlug: "test-module",
      lessonId: "lesson-1",
      activityId: "valid-activity",
      status: "IN_PROGRESS",
      timeSpentS: 30,
    });
    expect(args.update).toEqual({ timeSpentS: { increment: 30 } });
    expect(args.update).not.toHaveProperty("status");
  });

  it("CK-8: a checkpoint after completion leaves the row COMPLETED", async () => {
    prismaMock.progress.upsert.mockResolvedValue({
      id: "prog-ck",
      timeSpentS: 85,
      status: "COMPLETED",
    });
    const res = await checkpoint({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("COMPLETED");
    const args = prismaMock.progress.upsert.mock.calls[0][0];
    expect(Object.keys(args.update)).toEqual(["timeSpentS"]);
  });
});

describe("#876 — POST /progress/complete-activity validates the curriculum chain", () => {
  beforeEach(armHappyCompletion);

  it("CA-1: a module slug the activity does not belong to answers 400 before any write", async () => {
    const res = await complete({ moduleSlug: "k2-stem-track-maker" });
    expect(res.status).toBe(400);
    expect(prismaMock.progress.createMany).not.toHaveBeenCalled();
    expect(prismaMock.avatar.update).not.toHaveBeenCalled();
  });

  it("CA-2: a lesson id the activity does not belong to answers 400 before any write", async () => {
    const res = await complete({ lessonId: "some-other-lesson" });
    expect(res.status).toBe(400);
    expect(prismaMock.progress.createMany).not.toHaveBeenCalled();
  });

  it("CA-3: an omitted lesson id is persisted from the activity, not as null", async () => {
    const res = await complete({ lessonId: undefined });
    expect(res.status).toBe(200);
    expect(prismaMock.progress.createMany).toHaveBeenCalledTimes(1);
    const data = prismaMock.progress.createMany.mock.calls[0][0].data;
    expect(data.lessonId).toBe("lesson-1");
    expect(data.moduleSlug).toBe("test-module");
  });

  it("CA-4: a result.gameKey naming a different game than the activity answers 400", async () => {
    const res = await complete({
      result: { gameKey: "tank_trek", score: 9, total: 10 },
    });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toContain("gameKey");
    expect(prismaMock.progress.createMany).not.toHaveBeenCalled();
    expect(prismaMock.gamePersonalBest.create).not.toHaveBeenCalled();
  });

  it("CA-5: a legacy alias of the activity's game is accepted", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...ACTIVITY,
      content: JSON.stringify({ gameKey: "boost_path_planner" }),
    });
    const res = await complete({
      result: { gameKey: "sequence_drag_drop", score: 3 },
    });
    expect(res.status).toBe(200);
    expect(prismaMock.progress.createMany).toHaveBeenCalledTimes(1);
  });

  it("CA-6: an activity that declares no game refuses a result.gameKey", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...ACTIVITY,
      kind: "INFO",
      content: "{}",
    });
    const res = await complete({
      result: { gameKey: "move_measure", score: 1 },
    });
    expect(res.status).toBe(400);
    expect(prismaMock.progress.createMany).not.toHaveBeenCalled();
  });

  it("CA-7: a quiz result without a gameKey still completes an activity that declares no game", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...ACTIVITY,
      kind: "INFO",
      content: JSON.stringify({ questions: [] }),
    });
    const res = await complete({ result: { score: 2, total: 3 } });
    expect(res.status).toBe(200);
  });
});
