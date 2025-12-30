import prisma from "../utils/prisma";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];
import { checkpointSchema } from "../validation/schemas";
import { z } from "zod";

type CheckpointData = z.infer<typeof checkpointSchema>;

export async function upsertCheckpoint(data: CheckpointData) {
  // OPTIMIZED: Use prisma.upsert to handle create/update in a single atomic operation
  // This reduces DB round trips from 2 to 1 and prevents race conditions.

  const updateData: any = {
    timeSpentS: { increment: data.timeSpentS },
  };

  // Only update status to COMPLETED if it's currently completed in the request.
  // If data.completed is false, we keep the existing status (by not including it in updateData).
  if (data.completed) {
    updateData.status = ProgressStatus.COMPLETED;
  }

  return prisma.progress.upsert({
    where: {
      studentId_activityId: {
        studentId: data.studentId,
        activityId: data.activityId,
      },
    },
    create: {
      studentId: data.studentId,
      moduleSlug: data.moduleSlug,
      lessonId: data.lessonId,
      activityId: data.activityId,
      status: data.completed
        ? ProgressStatus.COMPLETED
        : ProgressStatus.IN_PROGRESS,
      timeSpentS: data.timeSpentS,
    },
    update: updateData,
  });
}

export async function getAggregatedProgress(
  studentId: string,
  moduleSlug: string,
) {
  // Aggregate by Unit -> Lesson -> Activity
  // This mimics the structure needed for the "map" view
  // Prisma doesn't do deep nested aggregation easily, so we might fetch raw or fetch all progress.

  // 1. Get all progress for this user + module
  const progressItems = await prisma.progress.findMany({
    where: { studentId, moduleSlug },
  });

  // 2. Get module structure (units, lessons, activities)
  // FIXME: We need to seed/fetch the actual content structure to merge with progress.
  // For MVP, we'll return the progress items and let the frontend map them to the static content config.

  // Actually, let's fetch the module structure from DB if it exists
  const module = await prisma.module.findUnique({
    where: { slug: moduleSlug },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              activities: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!module) {
    throw new Error(`Module ${moduleSlug} not found`);
  }

  // 3. Merge
  // We want to return the Module object but with an added "status" field on each node?
  // Or just return the list of completed activity IDs?
  // The frontend likely wants { activityId: 'completed', ... }

  const progressMap: Record<string, any> = {};
  progressItems.forEach((p: any) => {
    progressMap[p.activityId] = {
      status: p.status,
      timeSpentS: p.timeSpentS,
    };
  });

  return {
    module: {
      title: module.title,
      units: module.units.map((u: any) => ({
        ...u,
        lessons: u.lessons.map((l: any) => ({
          ...l,
          activities: l.activities.map((a: any) => ({
            ...a,
            userProgress: progressMap[a.id] || null,
          })),
        })),
      })),
    },
  };
}
