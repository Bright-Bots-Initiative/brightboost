import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { ADVANCED_ACTIVITIES } from "@brightboost/greatwork-engine/dist/progression/advanced";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
const mocks = vi.hoisted(() => ({
  prisma: {
    progress: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
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
describe.each(ADVANCED_ACTIVITIES)(
  "$activityId server progress gate",
  (advanced) => {
    const body = {
      moduleSlug: advanced.slug,
      lessonId: advanced.lessonId,
      activityId: advanced.activityId,
      timeSpentS: 30,
    };
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.prisma.progress.findUnique.mockResolvedValue(null);
      mocks.prisma.progress.upsert.mockResolvedValue({
        id: "checkpoint",
        timeSpentS: 30,
        status: "IN_PROGRESS",
      });
      mocks.prisma.activity.findUnique.mockResolvedValue({
        id: advanced.activityId,
        lessonId: advanced.lessonId,
        content: JSON.stringify({ gameKey: advanced.activityId }),
        // #876: the writer resolves the curriculum chain.
        Lesson: {
          id: advanced.lessonId,
          Unit: { Module: { slug: advanced.slug } },
        },
      });
      mocks.prisma.avatar.findUnique.mockResolvedValue({
        stage: "SPECIALIZED",
        archetype: advanced.specialty,
      });
      mocks.prisma.progress.findMany.mockResolvedValue(
        STEM_SET_3_IDS.map((activityId) => ({ activityId })),
      );
      mocks.ensureAvatarWithBackfill.mockRejectedValue(
        new Error("reward pipeline sentinel"),
      );
    });

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
        archetype: advanced.specialty === "AI" ? "BIOTECH" : "AI",
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
    it("applies the same earned-specialty gate to checkpoints", async () => {
      const checkpoint = { ...body, studentId: "learner", completed: false };
      expect(
        (await request(app).post("/progress/checkpoint").send(checkpoint))
          .status,
      ).toBe(200);
      expect(mocks.prisma.progress.upsert).toHaveBeenCalledTimes(1);
      mocks.prisma.avatar.findUnique.mockResolvedValue({
        stage: "SPECIALIZED",
        archetype: "QUANTUM",
      });
      expect(
        (await request(app).post("/progress/checkpoint").send(checkpoint))
          .status,
      ).toBe(403);
      expect(mocks.prisma.progress.upsert).toHaveBeenCalledTimes(1);
      expect(
        (
          await request(app)
            .post("/progress/checkpoint")
            .send({ ...checkpoint, moduleSlug: "foundation" })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .post("/progress/checkpoint")
            .send({ ...checkpoint, studentId: "another" })
        ).status,
      ).toBe(403);
    });
  },
);
