// backend/src/routes/progress.ts
import express, { Router } from "express";
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
  calculateStatGains,
  XP_PER_ACTIVITY,
  STAT_MAX,
} from "../services/game";
import {
  checkpointSchema,
  completeActivitySchema,
  idSchema,
  slugSchema,
} from "../validation/schemas";
import {
  GAME_SPECIFIC_SCHEMAS,
  isRegisteredGameKey,
} from "../validation/gameSpecific";
import { upsertCheckpoint, getAggregatedProgress } from "../services/progress";
import { trackServer } from "../services/analytics";
import { GameError } from "../utils/errors";

const router = Router();

/** v1 stores gameSpecific but must not expose it on any response (§5.5 / §7). */
function publicProgress<T extends { gameSpecific?: unknown }>(row: T) {
  const { gameSpecific: _omit, ...rest } = row;
  return rest;
}

/** Scoring fields of a complete-activity `result` that feed GamePersonalBest. */
type PersonalBestInput = {
  gameKey?: string;
  score?: number;
  streakMax?: number;
  roundsCompleted?: number;
};

/**
 * Reconcile the student's GamePersonalBest for one play-through (#640).
 *
 * Called from BOTH the first-completion path and the idempotent replay path:
 * a personal best is a **record**, not a reward. Replays award no XP, streak,
 * energy, hp or abilities — but they must still move `bestScore`, `lastScore`,
 * `bestRoundsCompleted` and `playCount`, otherwise those freeze at the first
 * completion forever and the results screen claims a record that never persists.
 *
 * Best-effort: a failure here is warned and swallowed so it never fails the
 * completion, and the "new record" flags stay false because nothing persisted.
 *
 * #809: every best-field write carries a strictly-greater conditional guard
 * (`updateMany` with `lt`), so two concurrent submissions can never regress a
 * higher stored value the way the old read-Math.max-write did — the database
 * adjudicates each field, and the "new record" flags come from its answer
 * (matched row count), not from a possibly-stale read. A create that loses
 * its race (P2002) falls through to the same conditional update path instead
 * of giving up with a null row.
 */
async function reconcilePersonalBest(
  studentId: string,
  result: PersonalBestInput | undefined,
) {
  const empty = {
    personalBest: null as Awaited<
      ReturnType<typeof prisma.gamePersonalBest.findUnique>
    >,
    isNewHighScore: false,
    isNewBestStreak: false,
  };

  if (!result?.gameKey) {
    return empty;
  }
  const gameKey = result.gameKey;
  const newScore = result.score ?? 0;
  const newStreak = result.streakMax ?? 0;
  const newRounds = result.roundsCompleted ?? 0;
  const byKey = { studentId, gameKey };

  // #832 item 1: the writes AND the response re-read share ONE interactive
  // transaction. The unconditional lastScore/playCount write row-locks the
  // record until commit, so a concurrent play blocks and cannot slip its own
  // committed row between our writes and our read — the response displays
  // exactly the state THIS reconciliation produced. And if the re-read (or
  // any write) throws, the whole transaction rolls back, so the catch's
  // "false flags + null row" reply is literally true: nothing persisted.
  const updateExisting = () =>
    prisma.$transaction(async (tx) => {
      const scoreRes = await tx.gamePersonalBest.updateMany({
        where: { ...byKey, bestScore: { lt: newScore } },
        data: { bestScore: newScore },
      });
      const streakRes = await tx.gamePersonalBest.updateMany({
        where: { ...byKey, bestStreak: { lt: newStreak } },
        data: { bestStreak: newStreak },
      });
      await tx.gamePersonalBest.updateMany({
        where: { ...byKey, bestRoundsCompleted: { lt: newRounds } },
        data: { bestRoundsCompleted: newRounds },
      });
      await tx.gamePersonalBest.updateMany({
        where: byKey,
        data: {
          lastScore: newScore,
          playCount: { increment: 1 },
          lastPlayedAt: new Date(),
        },
      });
      const personalBest = await tx.gamePersonalBest.findUnique({
        where: { studentId_gameKey: byKey },
      });
      return {
        personalBest,
        isNewHighScore: scoreRes.count > 0,
        isNewBestStreak: streakRes.count > 0,
      };
    });

  try {
    const existing = await prisma.gamePersonalBest.findUnique({
      where: { studentId_gameKey: byKey },
    });

    if (existing) {
      return await updateExisting();
    }

    try {
      const personalBest = await prisma.gamePersonalBest.create({
        data: {
          studentId,
          gameKey,
          bestScore: newScore,
          lastScore: newScore,
          bestStreak: newStreak,
          bestRoundsCompleted: newRounds,
          playCount: 1,
        },
      });
      return {
        personalBest,
        isNewHighScore: true,
        isNewBestStreak: newStreak > 0,
      };
    } catch (e) {
      if ((e as { code?: string })?.code !== "P2002") throw e;
      // Lost the first-create race: another submission owns the row now.
      // Reconcile through the conditional update path like any replay.
      return await updateExisting();
    }
  } catch (e) {
    console.warn("[complete-activity] Failed to upsert GamePersonalBest:", e);
    return empty;
  }
}

/**
 * #821/#832: express 4 does not catch async rejections — an unhandled throw
 * left the request with NO response at all (observed as a 20s client timeout
 * when a racing create hit P2002). Known race outcomes are handled in-line in
 * complete-activity; anything unexpected is delegated to the app's error
 * middleware (server.ts), which answers a JSON 500 and honors err.status.
 * #832 item 2: the two GET routes below carried the same hang class.
 */
const answerAsyncErrors =
  (
    fn: (req: express.Request, res: express.Response) => Promise<unknown>,
  ): express.RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

// Get progress for a student (MVP)
router.get(
  "/progress",
  requireAuth,
  answerAsyncErrors(async (req, res) => {
    const studentId = req.user!.id;
    const progress = await prisma.progress.findMany({
      where: { studentId },
      // Keep v1 contract stable for #672: persist only, do not expose gameSpecific.
      select: {
        id: true,
        studentId: true,
        moduleSlug: true,
        lessonId: true,
        activityId: true,
        status: true,
        timeSpentS: true,
        updatedAt: true,
      },
    });
    res.json(progress);
  }),
);

// Legacy endpoint for AuthContext (supports existing frontend)
router.get(
  "/get-progress",
  requireAuth,
  answerAsyncErrors(async (req, res) => {
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
  }),
);

// Complete an activity (MVP)
router.post(
  "/progress/complete-activity",
  requireAuth,
  gameActionLimiter,
  answerAsyncErrors(async (req, res) => {
    const studentId = req.user!.id;

    const parse = completeActivitySchema.safeParse(req.body);
    if (!parse.success) {
      // §5.9.2: deploy-bug signal when schema rejected gameSpecific for an unknown key.
      // Use the schema issue (gameKey already max-bounded) — never log raw body / payload.
      const unregisteredIssue = parse.error.issues.find(
        (i) =>
          typeof i.message === "string" &&
          i.message.startsWith('gameSpecific not accepted for gameKey "'),
      );
      if (unregisteredIssue) {
        const match = unregisteredIssue.message.match(
          /^gameSpecific not accepted for gameKey "([^"]{1,50})"$/,
        );
        if (match) {
          console.warn(
            `[complete-activity] Unregistered gameKey "${match[1]}" (no gameSpecific registry entry)`,
          );
        }
      }
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { moduleSlug, lessonId, activityId, timeSpentS, result } = parse.data;

    // Re-parse: superRefine validates but does not transform (E-8 / G-009).
    const gs =
      result?.gameSpecific !== undefined &&
      result.gameKey &&
      isRegisteredGameKey(result.gameKey)
        ? GAME_SPECIFIC_SCHEMAS[result.gameKey].parse(result.gameSpecific)
        : undefined;

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

    // Reward-free reply shared by every non-winning path (#821): an
    // already-completed read, a lost claim, and a lost create all answer the
    // same way. Telemetry stays last-write-wins (§5.2.3; omitted gameSpecific
    // never nulls a stored value, E-3), GamePersonalBest IS reconciled (#640:
    // a record, not a reward — retries and double submissions return xpDelta 0
    // while a better replay still moves bestScore), and the avatar-backfill
    // edge case reports the backfilled XP exactly as before.
    const respondRewardFree = async (row: NonNullable<typeof existing>) => {
      let replayed = row;
      if (gs !== undefined) {
        replayed = await prisma.progress.update({
          where: { id: row.id },
          data: { gameSpecific: gs },
        });
      }

      const replayBest = await reconcilePersonalBest(studentId, result);

      return res.json({
        message: wasBackfilled
          ? "Already completed (avatar backfilled)"
          : "Already completed",
        progress: publicProgress(replayed),
        reward: {
          xpDelta: wasBackfilled ? backfilledXp : 0,
          levelDelta: wasBackfilled ? avatarBefore.level - 1 : 0, // Delta from level 1
          energyDelta: 0,
          hpDelta: 0,
          newAbilitiesDelta: 0,
        },
        avatar: avatarBefore,
        personalBest: replayBest.personalBest,
        isNewHighScore: replayBest.isNewHighScore,
        isNewBestStreak: replayBest.isNewBestStreak,
      });
    };

    // Handle idempotent case: activity already completed
    if (existing && existing.status === ProgressStatus.COMPLETED) {
      return respondRewardFree(existing);
    }

    // 2. Claim the transition into COMPLETED atomically (#821). The database
    // picks exactly one winner under concurrency: a racing loser's updateMany
    // matches zero rows (its read was stale) and a racing loser's create hits
    // the (studentId, activityId) unique key with P2002. Both answer through
    // the reward-free path — XP, game_completed, and unlock checks are
    // winner-only, so one physical completion can never award twice.
    let finalProgress;

    // Claims row.id's transition into COMPLETED. Returns the winner's row, or
    // null when a racing COMPLETION already owns it. The reconstructed row
    // deliberately skips a re-read (updateMany returns only a count):
    // updatedAt — and a concurrent checkpoint's timeSpentS increment — reflect
    // the pre-claim read; no current consumer reads those from this response.
    const claimCompletion = async (row: NonNullable<typeof existing>) => {
      const claimed = await prisma.progress.updateMany({
        where: { id: row.id, status: { not: ProgressStatus.COMPLETED } },
        data: {
          status: ProgressStatus.COMPLETED,
          timeSpentS: { increment: timeSpentS || 0 },
          ...(gs !== undefined ? { gameSpecific: gs } : {}),
        },
      });
      if (claimed.count === 0) return null;
      return {
        ...row,
        status: ProgressStatus.COMPLETED,
        timeSpentS: (row.timeSpentS || 0) + (timeSpentS || 0),
        ...(gs !== undefined ? { gameSpecific: gs } : {}),
      };
    };

    if (existing) {
      finalProgress = await claimCompletion(existing);
      if (!finalProgress) {
        const row = await prisma.progress.findUnique({
          where: { id: existing.id },
        });
        return respondRewardFree(row ?? existing);
      }
    } else {
      try {
        finalProgress = await prisma.progress.create({
          data: {
            studentId,
            moduleSlug,
            lessonId,
            activityId,
            status: ProgressStatus.COMPLETED,
            timeSpentS: timeSpentS || 0,
            ...(gs !== undefined ? { gameSpecific: gs } : {}),
          },
        });
      } catch (e) {
        if ((e as { code?: string })?.code !== "P2002") throw e;
        const row = await prisma.progress.findUnique({
          where: { studentId_activityId: { studentId, activityId } },
        });
        // P2002 implies the duplicate row is committed (a conflicting INSERT
        // blocks on an in-flight duplicate and errors only after it commits),
        // so a missing row here means a concurrent delete (e.g. a User
        // cascade) — surface that to the backstop rather than invent a row.
        if (!row) throw e;
        if (row.status !== ProgressStatus.COMPLETED) {
          // #827 review B1: the create lost to a NON-completing writer (a
          // checkpoint upsert), not to a completion. This request still owns
          // the completion — claim the row it lost to instead of discarding
          // the play as "already completed".
          finalProgress = await claimCompletion(row);
          if (!finalProgress) {
            const latest = await prisma.progress.findUnique({
              where: { id: row.id },
            });
            return respondRewardFree(latest ?? row);
          }
        } else {
          return respondRewardFree(row);
        }
      }
    }

    // Server-side mirror of game_completed — fires once per (student, activity)
    // because only the atomic-claim winner reaches this line (#821); idempotent
    // re-completions and racing losers short-circuit above.
    trackServer(studentId, "game_completed", {
      module_slug: moduleSlug,
      activity_id: activityId,
      game_id: result?.gameKey || activityId,
      score: result?.score,
      time_spent_seconds: timeSpentS || 0,
    });

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
        console.warn(
          "[complete-activity] Failed to parse activity.content for totalRounds",
        );
      }

      if (totalRoundsFromContent > 0) {
        // Clamp roundsCompleted to server-known totalRounds (prevents cheating)
        const rc = Math.min(
          Math.max(result.roundsCompleted, 0),
          totalRoundsFromContent,
        );
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

      // Calculate stat gains (only meaningful for GENERAL avatars)
      const statGains = calculateStatGains({
        score: result?.score,
        total: result?.total,
        timeSpentS,
      });

      // Build update data
      const updateData: any = {
        xp: { increment: xpAward },
        energy: Math.min(100, currentEnergy + energyGain),
        hp: Math.min(100, currentHp + hpGain),
      };

      // Apply stat gains (clamped to STAT_MAX)
      // Stats accrue for all avatars, but are most meaningful for GENERAL
      const currentSpeed = (avatarBefore as any).speed || 0;
      const currentControl = (avatarBefore as any).control || 0;
      const currentFocus = (avatarBefore as any).focus || 0;

      updateData.speed = Math.min(STAT_MAX, currentSpeed + statGains.speed);
      updateData.control = Math.min(
        STAT_MAX,
        currentControl + statGains.control,
      );
      updateData.focus = Math.min(STAT_MAX, currentFocus + statGains.focus);

      // ⚡ Bolt Optimization: Capture updated avatar to avoid refetching in checkUnlocks
      const updatedAvatar = await prisma.avatar.update({
        where: { studentId },
        data: updateData,
      });

      // Check for level up (may add more XP and unlocks)
      const unlockResult = await checkUnlocks(studentId, updatedAvatar);
      if (unlockResult) {
        avatarAfter = unlockResult.avatar;
        newAbilitiesFromUnlock = unlockResult.newAbilitiesCount;
      } else {
        avatarAfter = updatedAvatar;
      }
    } catch (e) {
      console.warn("Could not give rewards to avatar", e);
    }

    // 4. Calculate Deltas
    let xpDelta = avatarAfter.xp - avatarBefore.xp;
    let levelDelta = avatarAfter.level - avatarBefore.level;
    const energyDelta = (avatarAfter.energy || 0) - (avatarBefore.energy || 0);
    const hpDelta = (avatarAfter.hp || 0) - (avatarBefore.hp || 0);
    const newAbilitiesDelta = newAbilitiesFromUnlock;

    // If avatar was backfilled, add backfilled XP to delta for accurate display
    if (wasBackfilled) {
      xpDelta += backfilledXp;
      levelDelta = avatarAfter.level - 1; // Show level gained from level 1
    }

    // 5. Upsert Game Personal Best (when gameKey is present) — shared with the
    // replay path above so a record is reconciled on every play-through (#640).
    const { personalBest, isNewHighScore, isNewBestStreak } =
      await reconcilePersonalBest(studentId, result);

    res.json({
      progress: publicProgress(finalProgress),
      reward: {
        xpDelta,
        levelDelta,
        energyDelta,
        hpDelta,
        newAbilitiesDelta,
      },
      avatar: avatarAfter,
      personalBest,
      isNewHighScore,
      isNewBestStreak,
    });
  }),
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

// Get all personal bests for the current student
router.get("/game/personal-bests", requireAuth, async (req, res) => {
  try {
    const bests = await prisma.gamePersonalBest.findMany({
      where: { studentId: req.user!.id },
      orderBy: { lastPlayedAt: "desc" },
    });
    res.json({ bests });
  } catch (e) {
    console.error("Get personal bests error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
