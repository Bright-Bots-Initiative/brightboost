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
  };

  it("#876: creates the row IN_PROGRESS and only adds time on update, in one upsert", async () => {
    vi.mocked(prisma.progress.upsert).mockResolvedValue({
      id: "upserted-id",
      ...mockData,
      status: ProgressStatus.IN_PROGRESS,
    } as any);

    await upsertCheckpoint(mockData);

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
        status: ProgressStatus.IN_PROGRESS,
        timeSpentS: mockData.timeSpentS,
      },
      update: {
        timeSpentS: { increment: mockData.timeSpentS },
      },
    });

    // Verify old methods are NOT called
    expect(prisma.progress.findFirst).not.toHaveBeenCalled();
    expect(prisma.progress.create).not.toHaveBeenCalled();
    expect(prisma.progress.update).not.toHaveBeenCalled();
  });

  it("#876: a stray `completed` flag never becomes a completion (RED on pre-fix main: create.status was COMPLETED)", async () => {
    vi.mocked(prisma.progress.upsert).mockResolvedValue({
      id: "upserted-id",
      ...mockData,
      status: ProgressStatus.IN_PROGRESS,
    } as any);

    await upsertCheckpoint({
      ...mockData,
      completed: true,
    } as Parameters<typeof upsertCheckpoint>[0]);

    const args = vi.mocked(prisma.progress.upsert).mock.calls[0][0];
    expect(args.create.status).toBe(ProgressStatus.IN_PROGRESS);
    expect(args.update).not.toHaveProperty("status");
    expect(args.update).toEqual({
      timeSpentS: { increment: mockData.timeSpentS },
    });
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
