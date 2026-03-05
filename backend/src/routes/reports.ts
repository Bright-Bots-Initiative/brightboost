import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/teacher/reports/impact — Aggregate impact metrics
// ---------------------------------------------------------------------------

router.get(
  "/teacher/reports/impact",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;

      // Get all courses for this teacher
      const courses = await prisma.course.findMany({
        where: { teacherId },
        select: { id: true, name: true },
      });

      const courseIds = courses.map((c) => c.id);

      if (courseIds.length === 0) {
        return res.json({
          totalStudents: 0,
          activitiesCompleted: 0,
          avgPreScore: null,
          avgPostScore: null,
          completionByModule: [],
          activeStudents7d: 0,
          totalTimeSpentMinutes: 0,
          progressDistribution: { notStarted: 0, inProgress: 0, completed: 0 },
        });
      }

      // Get all enrolled student IDs
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        select: { studentId: true },
      });
      const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
      const totalStudents = studentIds.length;

      // Activities completed
      const completedProgress = await prisma.progress.findMany({
        where: {
          studentId: { in: studentIds },
          status: "COMPLETED",
        },
        select: {
          studentId: true,
          moduleSlug: true,
          timeSpentS: true,
          updatedAt: true,
        },
      });

      const activitiesCompleted = completedProgress.length;

      // Total time
      const totalTimeSpentMinutes = Math.round(
        completedProgress.reduce((sum, p) => sum + p.timeSpentS, 0) / 60,
      );

      // Active students in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeStudentIds = new Set(
        completedProgress
          .filter((p) => p.updatedAt >= sevenDaysAgo)
          .map((p) => p.studentId),
      );
      const activeStudents7d = activeStudentIds.size;

      // Pulse survey averages
      const pulseResponses = await prisma.pulseResponse.findMany({
        where: { courseId: { in: courseIds } },
        select: { kind: true, score: true },
      });

      const preScores = pulseResponses
        .filter((p) => p.kind === "PRE")
        .map((p) => p.score);
      const postScores = pulseResponses
        .filter((p) => p.kind === "POST")
        .map((p) => p.score);

      const avgPreScore =
        preScores.length > 0
          ? Math.round(
              (preScores.reduce((a, b) => a + b, 0) / preScores.length) * 10,
            ) / 10
          : null;
      const avgPostScore =
        postScores.length > 0
          ? Math.round(
              (postScores.reduce((a, b) => a + b, 0) / postScores.length) * 10,
            ) / 10
          : null;

      // Completion by module
      const moduleCompletionMap = new Map<string, number>();
      for (const p of completedProgress) {
        moduleCompletionMap.set(
          p.moduleSlug,
          (moduleCompletionMap.get(p.moduleSlug) || 0) + 1,
        );
      }

      // Get module titles
      const modules = await prisma.module.findMany({
        where: {
          slug: { in: [...moduleCompletionMap.keys()] },
        },
        select: { slug: true, title: true },
      });

      const moduleTitleMap = new Map(modules.map((m) => [m.slug, m.title]));
      const completionByModule = [...moduleCompletionMap.entries()].map(
        ([slug, count]) => ({
          module: moduleTitleMap.get(slug) || slug,
          completed: count,
        }),
      );

      // Progress distribution
      const allProgress = await prisma.progress.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true },
      });

      const studentProgressMap = new Map<string, Set<string>>();
      for (const p of allProgress) {
        if (!studentProgressMap.has(p.studentId)) {
          studentProgressMap.set(p.studentId, new Set());
        }
        studentProgressMap.get(p.studentId)!.add(p.status);
      }

      let inProgressCount = 0;
      let completedCount = 0;
      let notStartedCount = 0;

      for (const sid of studentIds) {
        const statuses = studentProgressMap.get(sid);
        if (!statuses) {
          notStartedCount++;
        } else if (statuses.has("COMPLETED")) {
          completedCount++;
        } else {
          inProgressCount++;
        }
      }

      res.json({
        totalStudents,
        activitiesCompleted,
        avgPreScore,
        avgPostScore,
        completionByModule,
        activeStudents7d,
        totalTimeSpentMinutes,
        progressDistribution: {
          notStarted: notStartedCount,
          inProgress: inProgressCount,
          completed: completedCount,
        },
      });
    } catch (error) {
      console.error("Impact report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
