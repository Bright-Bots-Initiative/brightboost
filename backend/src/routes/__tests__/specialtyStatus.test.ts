import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
const mocks = vi.hoisted(() => ({
  progress: { findMany: vi.fn() },
  avatar: { findUnique: vi.fn() },
}));
vi.mock("../../utils/prisma", () => ({ default: mocks }));
import avatarRouter from "../avatar";
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.header("x-test-user"))
    req.user = { id: req.header("x-test-user")!, role: "student" };
  next();
});
app.use(avatarRouter);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.avatar.findUnique.mockResolvedValue({
    stage: "GENERAL",
    archetype: null,
  });
  mocks.progress.findMany.mockResolvedValue([]);
});
describe("GET specialty status", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/avatar/specialty-status")).status).toBe(
      401,
    );
    expect(mocks.progress.findMany).not.toHaveBeenCalled();
  });
  it("counts canonical IDs once and never treats two real Set 3 games as complete", async () => {
    mocks.progress.findMany.mockResolvedValue([
      { activityId: "track-maker" },
      { activityId: "echo-avenue" },
      { activityId: "echo-avenue" },
      { activityId: "not-a-game" },
    ]);
    const result = await request(app)
      .get("/avatar/specialty-status?studentId=other")
      .set("x-test-user", "learner");
    expect(result.body).toEqual({
      unlocked: false,
      completed: 2,
      required: 5,
      specialty: null,
    });
    expect(mocks.progress.findMany).toHaveBeenCalledWith({
      where: { studentId: "learner", status: "COMPLETED" },
      select: { activityId: true },
    });
  });
  it("opens only after every canonical game and returns the saved specialty", async () => {
    mocks.progress.findMany.mockResolvedValue(
      STEM_SET_3_IDS.map((activityId) => ({ activityId })),
    );
    mocks.avatar.findUnique.mockResolvedValue({
      stage: "SPECIALIZED",
      archetype: "BIOTECH",
    });
    const result = await request(app)
      .get("/avatar/specialty-status")
      .set("x-test-user", "learner");
    expect(result.body).toEqual({
      unlocked: true,
      completed: 5,
      required: 5,
      specialty: "BIOTECH",
    });
  });
  it("reports an infrastructure failure as an error", async () => {
    mocks.progress.findMany.mockRejectedValue(new Error("offline"));
    expect(
      (
        await request(app)
          .get("/avatar/specialty-status")
          .set("x-test-user", "learner")
      ).status,
    ).toBe(500);
  });
});
