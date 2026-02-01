import prisma from "../utils/prisma";

// Helper to determine the start of the current week (Sunday)
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day; // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get the start of the PREVIOUS (completed) week
export function getStartOfLastCompletedWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() - 7);
  return d;
}

/**
 * Ensures a snapshot exists for the given week. If missing, creates a placeholder.
 */
async function ensureSnapshot(studentId: string, weekStart: Date) {
  const existing = await prisma.weeklySnapshot.findUnique({
    where: {
      studentId_weekStart: {
        studentId,
        weekStart,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Create placeholder
  try {
    return await prisma.weeklySnapshot.create({
      data: {
        studentId,
        weekStart,
        data: {
          xp: 0,
          timeSpent: 0,
          lessonsCompleted: 0,
        },
      },
    });
  } catch (e: any) {
    // If race condition caused unique constraint violation, just fetch it
    if (e.code === "P2002") {
      return prisma.weeklySnapshot.findUniqueOrThrow({
        where: {
          studentId_weekStart: {
            studentId,
            weekStart,
          },
        },
      });
    }
    throw e;
  }
}

export async function getWeeklyProgress(studentId: string) {
  const now = new Date();

  // 1. Requirement: "A placeholder snapshot for the most recent completed week is automatically created."
  const lastCompletedWeekStart = getStartOfLastCompletedWeek(now);

  // 2. Also ensure current week exists so the user sees *something* for "Weekly Progress"
  const currentWeekStart = getStartOfWeek(now);

  // ⚡ Bolt Optimization: Ensure snapshots in parallel to reduce latency
  const [_, currentSnapshot] = await Promise.all([
    ensureSnapshot(studentId, lastCompletedWeekStart),
    ensureSnapshot(studentId, currentWeekStart),
  ]);

  return currentSnapshot;
}
