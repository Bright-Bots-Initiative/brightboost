/**
 * Admin scoreboard — GET /api/admin/metrics
 *
 * Computes the headline funnel numbers straight from the database. This is
 * the source of truth for the team's weekly review — PostHog is for funnel
 * exploration, this is for the trustworthy totals.
 *
 * Auth: admin role required (requireRole("admin")).
 */
import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";

const router = Router();

router.get(
  "/admin/metrics",
  requireAuth,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // K-8-scope accounts. Pathways users (userType === 'pathways') are excluded
      // — they have their own facilitator dashboard and roll up under a different
      // funnel.
      const k8Where = { userType: "k8" } as const;

      const [
        totalAccounts,
        teachers,
        students,
        totalClasses,
        totalEnrollments,
        gamesStarted,
        gamesCompleted,
        signupsLast7Days,
        signupsLast30Days,
      ] = await Promise.all([
        prisma.user.count({ where: k8Where }),
        prisma.user.count({ where: { ...k8Where, role: "teacher" } }),
        prisma.user.count({ where: { ...k8Where, role: "student" } }),
        prisma.course.count(),
        prisma.enrollment.count(),
        // Progress records — IN_PROGRESS or COMPLETED — proxy "games started".
        prisma.progress.count(),
        prisma.progress.count({ where: { status: "COMPLETED" } }),
        prisma.user.count({
          where: { ...k8Where, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.user.count({
          where: { ...k8Where, createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      const avgStudentsPerClass =
        totalClasses > 0
          ? Math.round((totalEnrollments / totalClasses) * 10) / 10
          : 0;
      const completionRate =
        gamesStarted > 0
          ? Math.round((gamesCompleted / gamesStarted) * 1000) / 10 // 1 decimal
          : 0;

      // "Active users in last 7d" = distinct students with any Progress.updatedAt
      // in window. Login records aren't persisted in this schema, so progress
      // activity is the best DB-side proxy. PostHog's `login` event is the
      // direct measure if/when it's been instrumented for long enough.
      const activeUsersLast7DaysRows = await prisma.progress.findMany({
        where: { updatedAt: { gte: sevenDaysAgo } },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      const activeUsersLast7Days = activeUsersLast7DaysRows.length;

      res.json({
        asOf: now.toISOString(),
        totalAccounts,
        accountsByRole: { teacher: teachers, student: students },
        totalClasses,
        avgStudentsPerClass,
        gamesStarted,
        gamesCompleted,
        completionRate,
        signupsLast7Days,
        signupsLast30Days,
        activeUsersLast7Days,
      });
    } catch (err) {
      console.error("admin/metrics error:", err);
      res.status(500).json({ error: "Failed to compute metrics" });
    }
  },
);

export default router;
