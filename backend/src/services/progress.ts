// backend/src/services/progress.ts
import { PrismaClient, ProgressStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function upsertCheckpoint(input: {
  studentId: string;
  moduleSlug: string;
  lessonId: string;
  activityId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  timeDeltaS: number;
}) {
  const timeDelta = Math.max(0, Math.min(3600, input.timeDeltaS || 0));
  const where = {
    studentId_activityId: {
      studentId: input.studentId,
      activityId: input.activityId,
    },
  };

  const existing = await prisma.progress.findUnique({ where });

  if (existing) {
    return prisma.progress.update({
      where: { id: existing.id },
      data: {
        status: input.status as ProgressStatus,
        timeSpentS: existing.timeSpentS + timeDelta,
        moduleSlug: input.moduleSlug,
        lessonId: input.lessonId, // Ensure lessonId is updated/set
      },
    });
  }
  return prisma.progress.create({
    data: {
      studentId: input.studentId,
      moduleSlug: input.moduleSlug,
      lessonId: input.lessonId,
      activityId: input.activityId,
      status: input.status as ProgressStatus,
      timeSpentS: timeDelta,
    },
  });
}

export async function getAggregatedProgress(
  studentId: string,
  moduleSlug: string,
) {
  const module = await prisma.module.findUnique({
    where: { slug: moduleSlug },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { activities: { orderBy: { order: "asc" } } },
          },
        },
      },
      badges: true,
    },
  });
  if (!module) throw new Error("Module not found");

  const progressRows = await prisma.progress.findMany({
    where: { studentId, moduleSlug },
  });

  const activityXpMap = new Map<string, number>();
  let totalActivities = 0;
  let totalXp = 0;

  // Mock XP per activity since schema doesn't have it yet
  const DEFAULT_XP = 10;

  for (const u of module.units) {
    for (const l of u.lessons) {
      for (const a of l.activities) {
        activityXpMap.set(a.id, DEFAULT_XP);
        totalActivities += 1;
        totalXp += DEFAULT_XP;
      }
    }
  }

  let earnedXp = 0;
  let completedActivities = 0;
  let lastLessonId: string | null = null;
  let timeSpentS = 0;

  for (const row of progressRows) {
    timeSpentS += row.timeSpentS;
    if (row.status === "COMPLETED") {
      if (row.activityId && activityXpMap.has(row.activityId)) {
        earnedXp += activityXpMap.get(row.activityId)!;
        completedActivities += 1;
      }
      lastLessonId = row.lessonId;
    }
  }

  const percentComplete =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;

  return {
    studentId,
    moduleSlug,
    percentComplete,
    lastLessonId,
    earnedXp,
    totals: { totalActivities, totalXp, timeSpentS },
  };
}
