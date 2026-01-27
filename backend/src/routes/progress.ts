// backend/src/routes/progress.ts
import { Router } from "express";
import prisma from "../utils/prisma";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];
import { requireAuth } from "../utils/auth";
import { checkUnlocks } from "../services/game";
import {
  checkpointSchema,
  completeActivitySchema,
} from "../validation/schemas";
import { upsertCheckpoint, getAggregatedProgress } from "../services/progress";
import { GameError } from "../utils/errors";

const router = Router();

// Get progress for a student (MVP)
router.get("/progress", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const progress = await prisma.progress.findMany({
    where: { studentId },
  });
  res.json(progress);
});

// Legacy endpoint for AuthContext (supports existing frontend)
router.get("/get-progress", requireAuth, async (req, res) => {
  // Return format expected by AuthContext
  // ⚡ Bolt Optimization: Allow excluding progress to reduce payload size (e.g. for AuthContext)
  // Default to true (legacy behavior) to prevent breaking other consumers.
  const excludeProgress = req.query.excludeProgress === "true";

  const userPromise = prisma.user.findUnique({
    where: { id: req.user!.id },
    // 🛡️ Sentinel: Select specific fields to prevent leaking password hash
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      school: true,
      subject: true,
      bio: true,
      grade: true,
      xp: true,
      level: true,
      streak: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const progressPromise = !excludeProgress
    ? prisma.progress.findMany({
        where: { studentId: req.user!.id },
        // ⚡ Bolt Optimization: Select only fields used by StudentDashboard to reduce payload size
        select: {
          id: true,
          moduleSlug: true,
          activityId: true,
          status: true,
          updatedAt: true,
        },
      })
    : Promise.resolve([]);

  const [user, progress] = await Promise.all([userPromise, progressPromise]);
  res.json({ user, progress });
});

// Complete an activity (MVP)
router.post("/progress/complete-activity", requireAuth, async (req, res) => {
  const studentId = req.user!.id;

  const parse = completeActivitySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { moduleSlug, lessonId, activityId, timeSpentS } = parse.data;

  // 0. Fetch Avatar Before (for calculating rewards)
  // ⚡ Bolt Optimization: Removed redundant abilities count query
  const avatarBefore = await prisma.avatar.findUnique({ where: { studentId } });

  // 1. Upsert progress
  const existing = await prisma.progress.findFirst({
    where: { studentId, activityId },
  });

  if (existing && existing.status === ProgressStatus.COMPLETED) {
    // Idempotent return with 0 rewards
    return res.json({
      message: "Already completed",
      progress: existing,
      reward: {
        xpDelta: 0,
        levelDelta: 0,
        energyDelta: 0,
        hpDelta: 0,
        newAbilitiesDelta: 0,
      },
      avatar: avatarBefore,
    });
  }

  let finalProgress;
  if (existing) {
    finalProgress = await prisma.progress.update({
      where: { id: existing.id },
      data: {
        status: ProgressStatus.COMPLETED,
        timeSpentS: { increment: timeSpentS || 0 },
      },
    });
  } else {
    finalProgress = await prisma.progress.create({
      data: {
        studentId,
        moduleSlug,
        lessonId,
        activityId,
        status: ProgressStatus.COMPLETED,
        timeSpentS: timeSpentS || 0,
      },
    });
  }

  // 2. Apply Rewards & Check Unlocks (only if avatar exists)
  let avatarAfter: any = null;
  let newAbilitiesFromUnlock = 0;

  if (avatarBefore) {
    try {
      // Award XP + Energy + HP
      const energyGain = 5;
      const hpGain = 2;
      const currentEnergy = avatarBefore.energy || 0;
      const currentHp = avatarBefore.hp || 0;

      // ⚡ Bolt Optimization: Capture updated avatar to avoid refetching in checkUnlocks
      const updatedAvatar = await prisma.avatar.update({
        where: { studentId },
        data: {
          xp: { increment: 50 },
          energy: Math.min(100, currentEnergy + energyGain),
          hp: Math.min(100, currentHp + hpGain),
        },
      });

      // Check for level up (may add more XP and unlocks)
      const result = await checkUnlocks(studentId, updatedAvatar);
      if (result) {
        avatarAfter = result.avatar;
        newAbilitiesFromUnlock = result.newAbilitiesCount;
      } else {
        avatarAfter = updatedAvatar;
      }
    } catch (e) {
      console.warn("Could not give rewards to avatar", e);
    }
  }

  // 3. Fetch Avatar & Abilities After - REMOVED (Bolt Optimization: use returned values)

  // 4. Calculate Deltas
  let xpDelta = 0;
  let levelDelta = 0;
  let energyDelta = 0;
  let hpDelta = 0;
  let newAbilitiesDelta = 0;

  if (avatarBefore && avatarAfter) {
    xpDelta = avatarAfter.xp - avatarBefore.xp;
    levelDelta = avatarAfter.level - avatarBefore.level;
    energyDelta = (avatarAfter.energy || 0) - (avatarBefore.energy || 0);
    hpDelta = (avatarAfter.hp || 0) - (avatarBefore.hp || 0);
    newAbilitiesDelta = newAbilitiesFromUnlock;
  }

  res.json({
    progress: finalProgress,
    reward: {
      xpDelta,
      levelDelta,
      energyDelta,
      hpDelta,
      newAbilitiesDelta,
    },
    avatar: avatarAfter,
  });
});

// Legacy / Comprehensive Routes (with validation)

router.get("/progress/:studentId", requireAuth, async (req, res) => {
  const studentId = req.params.studentId;

  // Authorization check: User can only access their own progress, unless they are admin/teacher
  if (req.user!.id !== studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  const moduleSlug = (req.query.module as string) || "stem-1";
  try {
    const result = await getAggregatedProgress(studentId, moduleSlug);
    res.json(result);
  } catch (e: any) {
    // 🛡️ Sentinel: Only expose safe "GameError" messages.
    if (e instanceof GameError) {
      return res.status(400).json({ error: e.message });
    }
    console.error("Get progress error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/progress/checkpoint", requireAuth, async (req, res) => {
  const parse = checkpointSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  // Authorization check
  if (req.user!.id !== parse.data.studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const saved = await upsertCheckpoint(parse.data);
    res.json({
      ok: true,
      id: saved.id,
      timeSpentS: saved.timeSpentS,
      status: saved.status,
    });
  } catch (e: any) {
    // 🛡️ Sentinel: Only expose safe "GameError" messages.
    if (e instanceof GameError) {
      return res.status(400).json({ error: e.message });
    }
    console.error("Checkpoint error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Note: Assessment schema is missing, disabling this route for now or removing if unused
// router.post("/assessment/submit", requireAuth, async (req, res) => {
//   // ...
// });

export default router;
