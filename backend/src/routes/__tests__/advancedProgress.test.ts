import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  BIOTRAIL_ACTIVITY_ID,
  BIOTRAIL_LESSON_ID,
  BIOTRAIL_SLUG,
} from "@brightboost/greatwork-engine/dist/progression/advanced";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
const mocks = vi.hoisted(() => ({
  prisma: {
    progress: { findUnique: vi.fn(), findMany: vi.fn() },
    activity: { findUnique: vi.fn() },
    avatar: { findUnique: vi.fn() },
  },
  ensureAvatarWithBackfill: vi.fn(),
}));
vi.mock("../../utils/prisma", () => ({ default: mocks.prisma }));
vi.mock("../../services/game", () => ({
  ensureAvatarWithBackfill: mocks.ensureAvatarWithBackfill,
  checkUnlocks: vi.fn(),
  calculateStatGains: vi.fn(),
  XP_PER_ACTIVITY: 50,
  STAT_MAX: 100,
}));
vi.mock("../../utils/security", () => ({
  gameActionLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import progressRouter from "../progress";
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: "learner", role: "student" };
  next();
});
app.use(progressRouter);
// A sentinel stops at the unchanged reward pipeline, proving the gate admitted the request.
app.use(
  (
    _error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(418).json({ rewardPipelineReached: true });
  },
);
const body = {
  moduleSlug: BIOTRAIL_SLUG,
  lessonId: BIOTRAIL_LESSON_ID,
  activityId: BIOTRAIL_ACTIVITY_ID,
  timeSpentS: 30,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.progress.findUnique.mockResolvedValue(null);
  mocks.prisma.activity.findUnique.mockResolvedValue({
    id: BIOTRAIL_ACTIVITY_ID,
    lessonId: BIOTRAIL_LESSON_ID,
  });
  mocks.prisma.avatar.findUnique.mockResolvedValue({
    stage: "SPECIALIZED",
    archetype: "BIOTECH",
  });
  mocks.prisma.progress.findMany.mockResolvedValue(
    STEM_SET_3_IDS.map((activityId) => ({ activityId })),
  );
  mocks.ensureAvatarWithBackfill.mockRejectedValue(
    new Error("reward pipeline sentinel"),
  );
});
describe("BioTrail server completion gate", () => {
  it("rejects a forged module or lesson before rewards", async () => {
    for (const forged of [
      { ...body, moduleSlug: "foundation" },
      { ...body, lessonId: "other" },
    ]) {
      expect(
        (await request(app).post("/progress/complete-activity").send(forged))
          .status,
      ).toBe(400);
    }
    expect(mocks.ensureAvatarWithBackfill).not.toHaveBeenCalled();
  });
  it("rejects another specialty or missing Set 3 completion", async () => {
    mocks.prisma.avatar.findUnique.mockResolvedValueOnce({
      stage: "SPECIALIZED",
      archetype: "AI",
    });
    expect(
      (await request(app).post("/progress/complete-activity").send(body))
        .status,
    ).toBe(403);
    mocks.prisma.progress.findMany.mockResolvedValueOnce(
      STEM_SET_3_IDS.slice(0, 4).map((activityId) => ({ activityId })),
    );
    expect(
      (await request(app).post("/progress/complete-activity").send(body))
        .status,
    ).toBe(403);
    expect(mocks.ensureAvatarWithBackfill).not.toHaveBeenCalled();
  });
  it("admits a matching earned specialty into the existing reward pipeline", async () => {
    const result = await request(app)
      .post("/progress/complete-activity")
      .send(body);
    expect(result.status).toBe(418);
    expect(mocks.ensureAvatarWithBackfill).toHaveBeenCalledWith("learner");
    expect(mocks.prisma.avatar.findUnique).toHaveBeenCalledWith({
      where: { studentId: "learner" },
      select: { stage: true, archetype: true },
    });
  });
});
