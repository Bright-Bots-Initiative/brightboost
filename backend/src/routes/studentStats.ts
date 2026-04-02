import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";

const router = Router();

/**
 * GET /student/stats — Calculate superpower stats from real learning data.
 * Each stat is capped at 10. Power Level = sum of all stats (max 50).
 */
router.get(
  "/student/stats",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const studentId = req.user!.id;

    // 1. Fetch completed progress with activity kind
    const completedProgress = await prisma.progress.findMany({
      where: { studentId, status: "COMPLETED" },
      select: {
        activityId: true,
        moduleSlug: true,
        timeSpentS: true,
        updatedAt: true,
      },
    });

    // 2. Look up activity kinds for completed activities
    const activityIds = completedProgress.map((p) => p.activityId);
    const activities = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true, kind: true },
    });
    const kindMap = new Map(activities.map((a) => [a.id, a.kind]));

    // 3. Count pulse check-ins
    const pulseCount = await prisma.pulseResponse.count({
      where: { respondentId: studentId },
    });

    // 4. Count completed activities by kind
    let storyCount = 0;
    let gameCount = 0;
    for (const p of completedProgress) {
      const kind = kindMap.get(p.activityId);
      if (kind === "INFO") storyCount++;
      else if (kind === "INTERACT") gameCount++;
    }

    // 5. Compute streak from unique completion dates
    const uniqueDates = new Set(
      completedProgress.map((p) => p.updatedAt.toISOString().slice(0, 10)),
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    // Allow streak to start from today or yesterday
    if (sortedDates.length > 0) {
      const firstDate = sortedDates[0];
      const diffFromToday = Math.floor(
        (new Date(today).getTime() - new Date(firstDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (diffFromToday <= 1) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const gap = Math.floor(
            (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (gap <= 1) streak++;
          else break;
        }
      }
    }

    // 6. Count quick completions (timeSpentS <= 60 = focused work)
    const quickCompletions = completedProgress.filter(
      (p) => p.timeSpentS > 0 && p.timeSpentS <= 60,
    ).length;

    // 7. Count completed modules (all activities in module completed)
    const moduleSlugs = [...new Set(completedProgress.map((p) => p.moduleSlug))];
    let completedModules = 0;
    for (const slug of moduleSlugs) {
      const totalInModule = await prisma.activity.count({
        where: {
          Lesson: { Unit: { Module: { slug } } },
        },
      });
      const completedInModule = completedProgress.filter(
        (p) => p.moduleSlug === slug,
      ).length;
      if (totalInModule > 0 && completedInModule >= totalInModule) {
        completedModules++;
      }
    }

    // 8. Count achievements earned (same logic as frontend dashboard)
    const daysThisWeek = (() => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekDates = Array.from(uniqueDates).filter(
        (d) => new Date(d) >= weekStart,
      );
      return weekDates.length;
    })();

    let achievementsCount = 0;
    if (completedProgress.length >= 1) achievementsCount++; // First Steps
    if (streak >= 3) achievementsCount++; // Streak Starter
    if (streak >= 5) achievementsCount++; // Daily Champion
    if (daysThisWeek >= 3) achievementsCount++; // Week Warrior
    if (completedModules >= 1) achievementsCount++; // Module Master

    // 9. Calculate each stat (capped at 10)
    const cap = (n: number) => Math.min(10, Math.max(0, n));

    const heartPower = cap(storyCount);
    const brainJuice = cap(gameCount + pulseCount);
    const lightningFast = cap(streak);
    const superFocus = cap(quickCompletions);
    const starPower = cap(achievementsCount + completedModules * 2);

    const powerLevel = heartPower + brainJuice + lightningFast + superFocus + starPower;

    // 10. Determine stage
    let stage: string;
    if (powerLevel >= 41) stage = "Legend";
    else if (powerLevel >= 26) stage = "Champion";
    else if (powerLevel >= 11) stage = "Explorer";
    else stage = "Rookie";

    // 11. Specialty progress — curriculum-based set completion
    //
    // Each set tracks how many of its required activity IDs the student
    // has completed.  Set 3 completion gates specialization selection.
    const STEM_SET_1 = ["bounce-buds", "gotcha-gears", "lost-steps", "rhyme-ride", "build-a-bot"];
    const STEM_SET_2 = ["set2-game-1", "set2-game-2", "set2-game-3", "set2-game-4", "set2-game-5"];
    const STEM_SET_3 = ["set3-game-1", "set3-game-2", "set3-game-3", "set3-game-4", "set3-game-5"];

    const completedActivityIds = new Set(completedProgress.map((p) => p.activityId));

    function setProgress(ids: string[]) {
      const done = ids.filter((id) => completedActivityIds.has(id)).length;
      return { current: done, target: ids.length, complete: done >= ids.length };
    }

    const specialtyProgress = {
      set1: setProgress(STEM_SET_1),
      set2: setProgress(STEM_SET_2),
      set3: setProgress(STEM_SET_3),
    };

    res.json({
      heartPower,
      brainJuice,
      lightningFast,
      superFocus,
      starPower,
      powerLevel,
      stage,
      specialtyProgress,
      // Also return raw XP / level from avatar for display
      xp: 0,
      level: 1,
    });
  },
);

export default router;
