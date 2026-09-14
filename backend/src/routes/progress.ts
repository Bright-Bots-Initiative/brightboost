// backend/src/routes/progress.ts
import express, { Router } from "express";
import type { Avatar } from "@prisma/client";
import prisma from "../utils/prisma";

const ProgressStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];
import { isClassroomSession, requireAuth } from "../utils/auth";
import {
  canWriteProgressFor,
  requireStudentReadAccess,
} from "../utils/authorization";
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
  declaredGameKey,
  isCompatibleGameKey,
  isRegisteredGameKey,
} from "../validation/gameSpecific";
import {
  ProgressWriteError,
  assertAdvancedEligibility,
  getAggregatedProgress,
  resolveActivityForWrite,
  upsertCheckpoint,
} from "../services/progress";
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
  // transaction. From the unconditional lastScore/playCount write onward the
  // row is locked, so nothing can slip between that write and our read. (The
  // three predicated writes lock only when they match — a play that sets no
  // record can still observe a concurrently-committed HIGHER best in the
  // re-read; that stays truthful and monotone, and the flags always come
  // from our own matched counts.) And if the re-read (or any write) throws,
  // the whole transaction rolls back — verified at the SQL level in the #845
  // review (BEGIN…ROLLBACK, values unchanged) — so the catch's "false flags
  // + null row" reply is literally true: nothing persisted, playCount
  // included (recorded as an accepted trade on #832).
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
    const code = (e as { code?: string })?.code;
    if (code === "P2024" || code === "P2028") {
      // #849: pool exhaustion (P2024) or the interactive transaction timing
      // out (P2028) is a capacity signal, not a data problem — name it so it
      // is observable instead of folded into a generic upsert failure. The
      // reply contract is unchanged: a record, not a reward, so null + false.
      console.warn(
        `[complete-activity] GamePersonalBest reconciliation hit a pool/transaction limit (${code}); record not persisted`,
      );
    } else {
      console.warn("[complete-activity] Failed to upsert GamePersonalBest:", e);
    }
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
            // #872: AuthContext re-hydrates `user` from this endpoint; the
            // student settings card needs the home-access state to survive a
            // page reload (login and class-login return it too).
            homeAccessEnabled: true,
            accountMode: true,
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
    // #872: a classroom session (icon / PIN login, reachable by anyone holding
    // the class code) must not read the family's home login email.
    res.json({
      user: user && isClassroomSession(req) ? { ...user, email: null } : user,
      progress,
    });
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

    const {
      moduleSlug: requestedSlug,
      lessonId: requestedLessonId,
      activityId,
      timeSpentS,
      result,
    } = parse.data;

    // Re-parse: superRefine validates but does not transform (E-8 / G-009).
    const gs =
      result?.gameSpecific !== undefined &&
      result.gameKey &&
      isRegisteredGameKey(result.gameKey)
        ? GAME_SPECIFIC_SCHEMAS[result.gameKey].parse(result.gameSpecific)
        : undefined;

    // 0. Fetch existing progress and resolve the activity concurrently.
    // #876: the activity is resolved through its curriculum chain — an id no
    // Activity carries (an orphan, or a reserved Set 3 placeholder) is 404,
    // a forged module slug or lesson id is 400, both before any write — and
    // the chain's own identifiers are what get persisted. BioTrail's
    // prerequisite (matching earned specialty + Set 3) is applied here too,
    // bound to the activity identity so a forged slug cannot skip it.
    const gate = await (async () => {
      const [existing, resolved] = await Promise.all([
        prisma.progress.findUnique({
          where: {
            studentId_activityId: {
              studentId,
              activityId,
            },
          },
        }),
        resolveActivityForWrite({
          activityId,
          moduleSlug: requestedSlug,
          lessonId: requestedLessonId,
        }),
      ]);
      await assertAdvancedEligibility(
        studentId,
        resolved.activity,
        resolved.moduleSlug,
        resolved.lessonId,
      );
      return { existing, resolved };
    })().catch((e: unknown) => {
      if (e instanceof ProgressWriteError) return e;
      throw e;
    });
    if (gate instanceof ProgressWriteError) {
      return res.status(gate.status).json({ error: gate.message });
    }
    const { existing } = gate;
    const { activity, moduleSlug, lessonId } = gate.resolved;

    // #876: a result may only describe the game this activity declares (or a
    // registry alias of it). Telemetry validation and GamePersonalBest are
    // keyed by result.gameKey, so an unrelated key would credit a record to a
    // game the learner did not play. Score units are the game's own; nothing
    // here compares score with total.
    const declaredKey = declaredGameKey(activity.content);
    if (result?.gameKey !== undefined) {
      if (!declaredKey) {
        return res.status(400).json({
          error: "This activity does not accept a game result (result.gameKey)",
        });
      }
      if (!isCompatibleGameKey(declaredKey, result.gameKey)) {
        return res.status(400).json({
          error: "result.gameKey does not name this activity's game",
        });
      }
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

    // Award size is server-authoritative: roundsCompleted is clamped to the
    // rounds the activity content declares.
    let xpAward = XP_PER_ACTIVITY;
    if (result?.roundsCompleted !== undefined) {
      let totalRoundsFromContent = 0;
      try {
        const parsed = JSON.parse(activity.content || "{}");
        if (Array.isArray(parsed.rounds)) {
          totalRoundsFromContent = parsed.rounds.length;
        }
      } catch {
        console.warn(
          "[complete-activity] Failed to parse activity.content for totalRounds",
        );
      }
      if (totalRoundsFromContent > 0) {
        const rc = Math.min(
          Math.max(result.roundsCompleted, 0),
          totalRoundsFromContent,
        );
        xpAward = Math.round((rc / totalRoundsFromContent) * XP_PER_ACTIVITY);
        xpAward = Math.min(Math.max(xpAward, 0), XP_PER_ACTIVITY);
      }
    }
    const energyGain = 5;
    const hpGain = 2;
    const statGains = calculateStatGains({
      score: result?.score,
      total: result?.total,
      timeSpentS,
    });

    // 2. Claim the completion and apply EVERY authoritative reward in one
    // interactive transaction (#877 / #878).
    //
    // - The row is ensured with INSERT … ON CONFLICT DO NOTHING (createMany +
    //   skipDuplicates), never completed by that insert, so there is exactly
    //   one claim path: a predicated updateMany. The database picks one
    //   winner under concurrency; a loser matches zero rows and has written
    //   nothing (#821's guarantee, now without a P2002 branch).
    // - The winner then locks its Avatar row (SELECT … FOR UPDATE) for the
    //   rest of the transaction. Every stat is computed from that locked row,
    //   never from the pre-transaction read, so two different activities for
    //   one learner queue here and the second sees the first's committed
    //   values (#878). The level transition and ability grants run on the
    //   same tx (checkUnlocks receives it).
    // - Any throw rolls back the claim together with the rewards, so a retry
    //   re-claims and awards exactly once (#877). Nothing partial is ever
    //   answered as success; the app's error middleware answers a JSON 500.
    //
    // Lock order is Progress row (claim) → Avatar row (FOR UPDATE) →
    // UnlockedAbility inserts, identical for every completion, so two
    // completions cannot wait on each other in a cycle. GamePersonalBest and
    // analytics run after commit and take no part in this transaction.
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.progress.createMany({
        data: {
          studentId,
          moduleSlug,
          lessonId,
          activityId,
          status: ProgressStatus.IN_PROGRESS,
          timeSpentS: 0,
        },
        skipDuplicates: true,
      });
      const claimed = await tx.progress.updateMany({
        where: {
          studentId,
          activityId,
          status: { not: ProgressStatus.COMPLETED },
        },
        data: {
          status: ProgressStatus.COMPLETED,
          timeSpentS: { increment: timeSpentS || 0 },
          ...(gs !== undefined ? { gameSpecific: gs } : {}),
        },
      });
      if (claimed.count === 0) return { won: false as const };

      const lockedRows = await tx.$queryRaw<
        Avatar[]
      >`SELECT * FROM "Avatar" WHERE "studentId" = ${studentId} FOR UPDATE`;
      const locked = lockedRows[0];
      if (!locked) {
        throw new Error("Avatar row missing while awarding rewards");
      }

      const rewarded = await tx.avatar.update({
        where: { id: locked.id },
        data: {
          xp: { increment: xpAward },
          energy: Math.min(100, (locked.energy || 0) + energyGain),
          hp: Math.min(100, (locked.hp || 0) + hpGain),
          speed: Math.min(STAT_MAX, (locked.speed || 0) + statGains.speed),
          control: Math.min(
            STAT_MAX,
            (locked.control || 0) + statGains.control,
          ),
          focus: Math.min(STAT_MAX, (locked.focus || 0) + statGains.focus),
        },
      });

      const unlock = await checkUnlocks(studentId, rewarded, tx);
      const avatarAfter = unlock?.avatar ?? rewarded;

      // The claim just wrote this row inside the transaction, so a miss here
      // is a genuine inconsistency and throws (P2025 → rollback → 500).
      const row = await tx.progress.findUniqueOrThrow({
        where: { studentId_activityId: { studentId, activityId } },
      });
      return {
        won: true as const,
        locked,
        avatarAfter,
        newAbilities: unlock?.newAbilitiesCount ?? 0,
        row,
      };
    });

    if (!outcome.won) {
      // A racing completion owns this activity; answer as a replay. The row
      // exists: the loser's insert cannot have been skipped unless a
      // committed row was there, and a concurrent delete is a User cascade.
      const row = await prisma.progress.findUnique({
        where: { studentId_activityId: { studentId, activityId } },
      });
      if (!row) throw new Error("Progress row missing after a lost claim");
      return respondRewardFree(row);
    }
    const { locked: avatarLocked, avatarAfter, newAbilities } = outcome;
    const finalProgress = outcome.row;

    // Server-side mirror of game_completed — fires once per (student,
    // activity): only the claim winner reaches this line, after commit.
    trackServer(studentId, "game_completed", {
      module_slug: moduleSlug,
      activity_id: activityId,
      game_id: result?.gameKey || activityId,
      score: result?.score,
      time_spent_seconds: timeSpentS || 0,
    });

    // 4. Deltas against the LOCKED pre-reward snapshot, so a simultaneous
    // completion's XP or level change can never be attributed to this reply.
    let xpDelta = avatarAfter.xp - avatarLocked.xp;
    let levelDelta = avatarAfter.level - avatarLocked.level;
    const energyDelta = (avatarAfter.energy || 0) - (avatarLocked.energy || 0);
    const hpDelta = (avatarAfter.hp || 0) - (avatarLocked.hp || 0);
    const newAbilitiesDelta = newAbilities;

    // If avatar was backfilled, add backfilled XP to delta for accurate display
    if (wasBackfilled) {
      xpDelta += backfilledXp;
      levelDelta = avatarAfter.level - 1; // Show level gained from level 1
    }

    // 5. Upsert Game Personal Best (when gameKey is present) — shared with the
    // replay path above so a record is reconciled on every play-through (#640).
    // A record, not a reward: it stays outside the authoritative transaction
    // and best-effort, exactly as before.
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

// #871: aggregate progress is readable by the student, staff, or a teacher
// who owns a class / home group the student is enrolled in (see
// utils/authorization.ts). Format validation runs first so a malformed id is
// a 400 for everyone; the grant check runs before any data lookup.
router.get(
  "/progress/:studentId",
  requireAuth,
  (req, res, next) => {
    const parseId = idSchema.safeParse(req.params.studentId);
    if (!parseId.success) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }
    next();
  },
  requireStudentReadAccess("studentId"),
  async (req, res) => {
    const studentId = req.params.studentId;

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
  },
);

// #876 (PROG-01): a checkpoint keeps time on an activity the learner is
// playing. It never completes one — POST /progress/complete-activity is the
// only writer of COMPLETED, because rewards, the level formula, the specialty
// gate and avatar backfill all trust that status.
router.post(
  "/progress/checkpoint",
  requireAuth,
  gameActionLimiter,
  answerAsyncErrors(async (req, res) => {
    const parse = checkpointSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ error: parse.error.flatten() });

    // The field stays declared in the schema so Zod cannot strip it, and a
    // stale client that still sends it fails loudly instead of believing it
    // completed something.
    if (parse.data.completed === true) {
      return res.status(400).json({
        error:
          "Checkpoints cannot complete an activity; use POST /progress/complete-activity",
      });
    }

    // #871: checkpoint writes are self-only. A teacher's or staff member's
    // read grant on a learner never becomes a write grant, and the body's
    // studentId can never redirect the write to another account.
    if (!canWriteProgressFor(req.user!, parse.data.studentId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    try {
      const studentId = req.user!.id;
      const { activity, moduleSlug, lessonId } = await resolveActivityForWrite({
        activityId: parse.data.activityId,
        moduleSlug: parse.data.moduleSlug,
        lessonId: parse.data.lessonId,
      });
      await assertAdvancedEligibility(
        studentId,
        activity,
        moduleSlug,
        lessonId,
      );
      const saved = await upsertCheckpoint({
        studentId,
        moduleSlug,
        lessonId,
        activityId: activity.id,
        timeSpentS: parse.data.timeSpentS,
      });
      return res.json({
        ok: true,
        id: saved.id,
        timeSpentS: saved.timeSpentS,
        status: saved.status,
      });
    } catch (e) {
      if (e instanceof ProgressWriteError) {
        return res.status(e.status).json({ error: e.message });
      }
      // 🛡️ Sentinel: Only expose safe "GameError" messages.
      if (e instanceof GameError) {
        return res.status(400).json({ error: e.message });
      }
      throw e; // answered as a JSON 500 by the app's error middleware
    }
  }),
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
