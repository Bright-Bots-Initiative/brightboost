import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWeeklyProgress, getStartOfWeek, getStartOfLastCompletedWeek } from "./progress_weekly";
import prisma from "../utils/prisma";

// Mock Prisma
vi.mock("../utils/prisma", () => ({
  default: {
    weeklySnapshot: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
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

  it("should ensure snapshots for BOTH last completed week and current week", async () => {
    // Mock: Last week missing, Current week missing
    (prisma.weeklySnapshot.findUnique as any).mockResolvedValue(null);

    // Mock Create responses
    (prisma.weeklySnapshot.create as any)
      .mockResolvedValueOnce({ id: "last-week", weekStart: lastWeekStart })
      .mockResolvedValueOnce({ id: "current-week", weekStart: currentWeekStart });

    const result = await getWeeklyProgress(studentId);

    // Verify calls
    expect(prisma.weeklySnapshot.findUnique).toHaveBeenCalledTimes(2);

    // Check first call (last week)
    expect(prisma.weeklySnapshot.findUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: { studentId_weekStart: { studentId, weekStart: lastWeekStart } }
    }));

    // Check second call (current week)
    expect(prisma.weeklySnapshot.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: { studentId_weekStart: { studentId, weekStart: currentWeekStart } }
    }));

    // Verify creations
    expect(prisma.weeklySnapshot.create).toHaveBeenCalledTimes(2);

    // Result should be current week
    expect(result.id).toBe("current-week");
  });

  it("should not create snapshots if they already exist", async () => {
    (prisma.weeklySnapshot.findUnique as any)
        .mockResolvedValueOnce({ id: "last-exist" })
        .mockResolvedValueOnce({ id: "current-exist" });

    const result = await getWeeklyProgress(studentId);

    expect(prisma.weeklySnapshot.create).not.toHaveBeenCalled();
    expect(result.id).toBe("current-exist");
  });

  it("should handle race conditions gracefully", async () => {
    // First call (last week) fails on find, fails on create (race), succeeds on refetch
    (prisma.weeklySnapshot.findUnique as any).mockResolvedValueOnce(null);
    const error: any = new Error("Unique constraint failed");
    error.code = "P2002";
    (prisma.weeklySnapshot.create as any).mockRejectedValueOnce(error);
    (prisma.weeklySnapshot.findUniqueOrThrow as any).mockResolvedValueOnce({ id: "last-race" });

    // Second call (current week) exists
    (prisma.weeklySnapshot.findUnique as any).mockResolvedValueOnce({ id: "current-exist" });

    await getWeeklyProgress(studentId);

    expect(prisma.weeklySnapshot.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
        where: { studentId_weekStart: { studentId, weekStart: lastWeekStart } }
    }));
  });
});
