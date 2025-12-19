import { PrismaClient, ProgressStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function upsertCheckpoint(input: {
  studentId: string;
  moduleSlug: string;
  lessonId: string;
  activityId?: string;
  status: "IN_PROGRESS" | "COMPLETED";
  timeDeltaS: number;
}) {
  const timeDelta = Math.max(0, Math.min(3600, input.timeDeltaS || 0));

  // Ensure activityId is a string, as schema requires it.
  const activityId = input.activityId || "default-activity";

  const where = {
    studentId_activityId: { // Use the unique compound index
       studentId: input.studentId,
       activityId: activityId
    }
  };

  const existing = await prisma.progress.findUnique({ where });

  if (existing) {
    return prisma.progress.update({
      where: { id: existing.id },
      data: {
        status: input.status as ProgressStatus,
        timeSpentS: existing.timeSpentS + timeDelta,
        moduleSlug: input.moduleSlug,
      },
    });
  }
  return prisma.progress.create({
    data: {
      studentId: input.studentId,
      moduleSlug: input.moduleSlug,
      lessonId: input.lessonId,
      activityId: activityId,
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
        orderBy: { order: "asc" }, // Fixed: index -> order
        include: {
          lessons: {
            orderBy: { order: "asc" }, // Fixed: index -> order
            include: { activities: { orderBy: { order: "asc" } } }, // Fixed: index -> order
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

  for (const u of module.units) {
    for (const l of u.lessons) {
      for (const a of l.activities) {
        // Mock XP since schema doesn't have it
        const xp = 10;
        activityXpMap.set(a.id, xp);
        totalActivities += 1;
        totalXp += xp;
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
