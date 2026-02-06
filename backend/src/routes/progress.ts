// backend/src/routes/progress.ts
import { Router } from "express";
import prisma from "../utils/prisma";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];
import { requireAuth } from "../utils/auth";
import { gameActionLimiter } from "../utils/security";
import {
  checkUnlocks,
  ensureAvatarWithBackfill,
  XP_PER_ACTIVITY,
} from "../services/game";
import {
  checkpointSchema,
  completeActivitySchema,
  idSchema,
  slugSchema,
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
  const excludeUser = req.query.excludeUser === "true";

  const userPromise = !excludeUser
    ? prisma.user.findUnique({
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
      })
    : Promise.resolve(null);

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
router.post(
  "/progress/complete-activity",
  requireAuth,
  gameActionLimiter,
  async (req, res) => {
    const studentId = req.user!.id;

    const parse = completeActivitySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { moduleSlug, lessonId, activityId, timeSpentS, result } = parse.data;

    // 0. Fetch Existing Progress and Activity concurrently
    // ⚡ Bolt Optimization: Parallelize independent DB reads to reduce latency
    // 🛡️ Sentinel: Verify activity existence to prevent Game Integrity/Infinite Leveling exploit
    const [existing, activity] = await Promise.all([
      prisma.progress.findUnique({
        where: {
          studentId_activityId: {
            studentId,
            activityId,
          },
        },
      }),
      prisma.activity.findUnique({ where: { id: activityId } }),
    ]);

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // 1. Ensure avatar exists (with backfill if needed)
    const {
      avatar: avatarBefore,
      wasBackfilled,
      backfilledXp,
    } = await ensureAvatarWithBackfill(studentId);

    // Handle idempotent case: activity already completed
    if (existing && existing.status === ProgressStatus.COMPLETED) {
      // If avatar was just backfilled, return the backfilled XP as the delta
      // This handles the edge case where user completed activities without an avatar
      // and later triggers completion again
      if (wasBackfilled) {
        return res.json({
          message: "Already completed (avatar backfilled)",
          progress: existing,
          reward: {
            xpDelta: backfilledXp,
            levelDelta: avatarBefore.level - 1, // Delta from level 1
            energyDelta: 0,
            hpDelta: 0,
            newAbilitiesDelta: 0,
          },
          avatar: avatarBefore,
        });
      }

      // Normal idempotent return with 0 rewards
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

    // 2. Create or update progress record
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

    // 3. Apply Rewards & Check Unlocks
    let avatarAfter: any = avatarBefore;
    let newAbilitiesFromUnlock = 0;

    // Calculate XP award based on roundsCompleted (if provided)
    let xpAward = XP_PER_ACTIVITY;
    if (result?.roundsCompleted !== undefined) {
      // Parse activity.content to get totalRounds from server (source of truth)
      let totalRoundsFromContent = 0;
      try {
        const parsed = JSON.parse(activity.content || "{}");
        if (Array.isArray(parsed.rounds)) {
          totalRoundsFromContent = parsed.rounds.length;
        }
      } catch {
        // If parsing fails, use default XP
        console.warn("[complete-activity] Failed to parse activity.content for totalRounds");
      }

      if (totalRoundsFromContent > 0) {
        // Clamp roundsCompleted to server-known totalRounds (prevents cheating)
        const rc = Math.min(Math.max(result.roundsCompleted, 0), totalRoundsFromContent);
        xpAward = Math.round((rc / totalRoundsFromContent) * XP_PER_ACTIVITY);
        xpAward = Math.min(Math.max(xpAward, 0), XP_PER_ACTIVITY); // Final clamp
      }
    }

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
          xp: { increment: xpAward },
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

    // 4. Calculate Deltas
    let xpDelta = avatarAfter.xp - avatarBefore.xp;
    let levelDelta = avatarAfter.level - avatarBefore.level;
    let energyDelta = (avatarAfter.energy || 0) - (avatarBefore.energy || 0);
    let hpDelta = (avatarAfter.hp || 0) - (avatarBefore.hp || 0);
    let newAbilitiesDelta = newAbilitiesFromUnlock;

    // If avatar was backfilled, add backfilled XP to delta for accurate display
    if (wasBackfilled) {
      xpDelta += backfilledXp;
      levelDelta = avatarAfter.level - 1; // Show level gained from level 1
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
  },
);

// Legacy / Comprehensive Routes (with validation)

router.get("/progress/:studentId", requireAuth, async (req, res) => {
  const studentId = req.params.studentId;

  // 🛡️ Sentinel: Validate student ID format
  const parseId = idSchema.safeParse(studentId);
  if (!parseId.success) {
    return res.status(400).json({ error: "Invalid student ID format" });
  }

  // Authorization check: User can only access their own progress, unless they are admin/teacher
  if (req.user!.id !== studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  const moduleSlug = (req.query.module as string) || "stem-1";

  // 🛡️ Sentinel: Validate module slug format
  const parseSlug = slugSchema.safeParse(moduleSlug);
  if (!parseSlug.success) {
    return res.status(400).json({ error: "Invalid module slug format" });
  }

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

router.post(
  "/progress/checkpoint",
  requireAuth,
  gameActionLimiter,
  async (req, res) => {
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
  },
);

// Note: Assessment schema is missing, disabling this route for now or removing if unused
// router.post("/assessment/submit", requireAuth, async (req, res) => {
//   // ...
// });

export default router;
