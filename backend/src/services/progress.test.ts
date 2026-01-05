import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertCheckpoint, getAggregatedProgress } from "./progress";
import prisma from "../utils/prisma";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];

// Mock Prisma
vi.mock("../utils/prisma", () => ({
  default: {
    progress: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    module: {
      findUnique: vi.fn(),
    },
  },
}));

describe("upsertCheckpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockData = {
    studentId: "student-1",
    moduleSlug: "module-1",
    lessonId: "lesson-1",
    activityId: "activity-1",
    timeSpentS: 30,
    completed: true,
  };

  it("OPTIMIZED: should use upsert instead of findFirst+create/update", async () => {
    // Mock upsert
    vi.mocked(prisma.progress.upsert).mockResolvedValue({
      id: "upserted-id",
      ...mockData,
      status: ProgressStatus.COMPLETED,
    } as any);

    await upsertCheckpoint(mockData);

    // Verify upsert is called with correct arguments
    expect(prisma.progress.upsert).toHaveBeenCalledWith({
      where: {
        studentId_activityId: {
          studentId: mockData.studentId,
          activityId: mockData.activityId,
        },
      },
      create: {
        studentId: mockData.studentId,
        moduleSlug: mockData.moduleSlug,
        lessonId: mockData.lessonId,
        activityId: mockData.activityId,
        status: ProgressStatus.COMPLETED,
        timeSpentS: mockData.timeSpentS,
      },
      update: {
        timeSpentS: { increment: mockData.timeSpentS },
        status: ProgressStatus.COMPLETED,
      },
    });

    // Verify old methods are NOT called
    expect(prisma.progress.findFirst).not.toHaveBeenCalled();
    expect(prisma.progress.create).not.toHaveBeenCalled();
    expect(prisma.progress.update).not.toHaveBeenCalled();
  });

  it("OPTIMIZED: should not update status if not completed in request", async () => {
    const incompleteData = { ...mockData, completed: false };

    vi.mocked(prisma.progress.upsert).mockResolvedValue({
      id: "upserted-id",
      ...incompleteData,
      status: ProgressStatus.IN_PROGRESS,
    } as any);

    await upsertCheckpoint(incompleteData);

    expect(prisma.progress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          timeSpentS: { increment: incompleteData.timeSpentS },
          // status should NOT be present here
        },
      }),
    );
  });
});

describe("getAggregatedProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch progress and module structure", async () => {
    const studentId = "student-1";
    const moduleSlug = "module-1";

    const mockProgress = [
      { activityId: "act-1", status: "COMPLETED", timeSpentS: 100 },
      { activityId: "act-2", status: "IN_PROGRESS", timeSpentS: 50 },
    ];

    const mockModule = {
      title: "Test Module",
      units: [
        {
          id: "unit-1",
          lessons: [
            {
              id: "lesson-1",
              activities: [{ id: "act-1" }, { id: "act-2" }, { id: "act-3" }],
            },
          ],
        },
      ],
    };

    vi.mocked(prisma.progress.findMany).mockResolvedValue(mockProgress as any);
    vi.mocked(prisma.module.findUnique).mockResolvedValue(mockModule as any);

    const result = await getAggregatedProgress(studentId, moduleSlug);

    expect(prisma.progress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId, moduleSlug },
      }),
    );

    expect(
      result.module.units[0].lessons[0].activities[0].userProgress,
    ).toEqual({
      status: "COMPLETED",
      timeSpentS: 100,
    });
    expect(
      result.module.units[0].lessons[0].activities[2].userProgress,
    ).toBeNull();
  });
});
