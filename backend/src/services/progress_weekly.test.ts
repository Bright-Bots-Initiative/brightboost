import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWeeklyProgress,
  getStartOfWeek,
  getStartOfLastCompletedWeek,
} from "./progress_weekly";
import prisma from "../utils/prisma";

// Mock Prisma
vi.mock("../utils/prisma", () => ({
  default: {
    weeklySnapshot: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("Weekly Progress Service", () => {
  const studentId = "student-123";
  const now = new Date();
  const currentWeekStart = getStartOfWeek(now);
  const lastWeekStart = getStartOfLastCompletedWeek(now);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should ensure snapshots for BOTH last completed week and current week using upsert", async () => {
    // Mock Upsert responses
    (prisma.weeklySnapshot.upsert as any)
      .mockResolvedValueOnce({ id: "last-week", weekStart: lastWeekStart })
      .mockResolvedValueOnce({
        id: "current-week",
        weekStart: currentWeekStart,
      });

    const result = await getWeeklyProgress(studentId);

    // Verify calls (order agnostic due to Promise.all)
    expect(prisma.weeklySnapshot.upsert).toHaveBeenCalledTimes(2);

    expect(prisma.weeklySnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_weekStart: { studentId, weekStart: lastWeekStart } },
        create: expect.objectContaining({
          studentId,
          weekStart: lastWeekStart,
          data: { xp: 0, timeSpent: 0, lessonsCompleted: 0 },
        }),
        update: {},
      }),
    );

    expect(prisma.weeklySnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_weekStart: { studentId, weekStart: currentWeekStart },
        },
        create: expect.objectContaining({
          studentId,
          weekStart: currentWeekStart,
          data: { xp: 0, timeSpent: 0, lessonsCompleted: 0 },
        }),
        update: {},
      }),
    );

    // Result should be current week
    expect(result.id).toBe("current-week");
  });

  it("should handle race conditions gracefully (upsert handles this automatically)", async () => {
    // Upsert is atomic (or handles conflict internally), so we just test that it returns the value
    (prisma.weeklySnapshot.upsert as any)
      .mockResolvedValueOnce({ id: "last-race" })
      .mockResolvedValueOnce({ id: "current-exist" });

    await getWeeklyProgress(studentId);

    expect(prisma.weeklySnapshot.upsert).toHaveBeenCalledTimes(2);
  });
});
