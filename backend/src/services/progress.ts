import { PrismaClient, ProgressStatus } from "@prisma/client";
import { checkpointSchema } from "../validation/schemas";
import { z } from "zod";

type CheckpointData = z.infer<typeof checkpointSchema>;

const prisma = new PrismaClient();

export async function upsertCheckpoint(data: CheckpointData) {
  // 1. Find existing progress
  const existing = await prisma.progress.findFirst({
    where: {
      studentId: data.studentId,
      lessonId: data.lessonId,
      activityId: data.activityId,
    },
  });

  if (existing) {
    return prisma.progress.update({
      where: { id: existing.id },
      data: {
        timeSpentS: { increment: data.timeSpentS },
        // Only update status if completing
        status: data.completed ? ProgressStatus.COMPLETED : existing.status,
      },
    });
  }

  // 2. Create new
  return prisma.progress.create({
    data: {
      studentId: data.studentId,
      moduleSlug: data.moduleSlug,
      lessonId: data.lessonId,
      activityId: data.activityId,
      status: data.completed
        ? ProgressStatus.COMPLETED
        : ProgressStatus.IN_PROGRESS,
      timeSpentS: data.timeSpentS,
    },
  });
}

export async function getAggregatedProgress(
  studentId: string,
  moduleSlug: string
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
              orderBy: { order: 'asc' },
              include: {
                  lessons: {
                      orderBy: { order: 'asc' },
                      include: {
                          activities: {
                              orderBy: { order: 'asc' }
                          }
                      }
                  }
              }
          }
      }
  });

  if (!module) {
      throw new Error(`Module ${moduleSlug} not found`);
  }

  // 3. Merge
  // We want to return the Module object but with an added "status" field on each node?
  // Or just return the list of completed activity IDs?
  // The frontend likely wants { activityId: 'completed', ... }

  const progressMap: Record<string, any> = {};
  progressItems.forEach(p => {
      progressMap[p.activityId] = {
          status: p.status,
          timeSpentS: p.timeSpentS
      };
  });

  return {
      module: {
          title: module.title,
          units: module.units.map(u => ({
              ...u,
              lessons: u.lessons.map(l => ({
                  ...l,
                  activities: l.activities.map(a => ({
                      ...a,
                      userProgress: progressMap[a.id] || null
                  }))
              }))
          }))
      }
  };
}
