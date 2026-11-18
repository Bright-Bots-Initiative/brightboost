import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { selectArchetypeSchema } from "../validation/schemas";
import { sensitiveOpsLimiter } from "../utils/security";
import {
  ensureAvatarWithBackfill,
  XP_PER_ACTIVITY,
  XP_PER_LEVEL_UP,
} from "../services/game";
// STEM Set 3 activity IDs — must all be completed before specialization.
// Canonical source shared with the frontend (#855); the backend reads the
// emitted artifact of the `file:../shared` dependency, never a hand copy.
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";

const router = Router();

// Read-only status: progression comes from the authenticated student's records.
router.get("/avatar/specialty-status", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const [progress, avatar] = await Promise.all([
      prisma.progress.findMany({
        where: { studentId, status: "COMPLETED" },
        select: { activityId: true },
      }),
      prisma.avatar.findUnique({
        where: { studentId },
        select: { stage: true, archetype: true },
      }),
    ]);
    const ids = new Set(progress.map((p) => p.activityId));
    const completed = STEM_SET_3_IDS.filter((id) => ids.has(id)).length;
    res.json({
      unlocked: completed === STEM_SET_3_IDS.length,
      completed,
      required: STEM_SET_3_IDS.length,
      specialty: avatar?.stage === "SPECIALIZED" ? avatar.archetype : null,
    });
  } catch (error) {
    console.error("Specialty status error:", error);
    res.status(500).json({ error: "Could not load specialty status" });
  }
});

// Get user XP - auto-backfill if no avatar exists
router.get("/user/xp", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;

    // Ensure avatar exists (auto-backfill from progress if needed)
    const { avatar } = await ensureAvatarWithBackfill(studentId);

    res.json({ currentXp: avatar?.xp || 0 });
  } catch (error) {
    console.error("Get XP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user's avatar - NEVER returns null, auto-backfills from progress
router.get("/avatar/me", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;

    // First, try to get existing avatar
    let avatar = await prisma.avatar.findUnique({
      where: { studentId },
      include: { unlockedAbilities: { include: { Ability: true } } },
    });

    if (!avatar) {
      // No avatar exists - create one with backfilled XP from progress
      const { avatar: backfilledAvatar } =
        await ensureAvatarWithBackfill(studentId);

      // Refetch with abilities included
      avatar = await prisma.avatar.findUnique({
        where: { studentId },
        include: { unlockedAbilities: { include: { Ability: true } } },
      });

      if (avatar) {
        console.log(
          `[/avatar/me] Backfilled avatar: level=${avatar.level}, xp=${avatar.xp}`,
        );
      }
    } else if (avatar.xp === 0) {
      // Avatar exists but xp=0 - check if we need to "repair" from progress
      const completedCount = await prisma.progress.count({
        where: { studentId, status: "COMPLETED" },
      });

      if (completedCount > 0) {
        // Repair: user has completed activities but avatar shows xp=0
        const expectedLevel = 1 + Math.floor(completedCount / 2);
        const expectedXp =
          completedCount * XP_PER_ACTIVITY +
          (expectedLevel - 1) * XP_PER_LEVEL_UP;

        // Only update if it would increase values (never decrease)
        const newLevel = Math.max(avatar.level, expectedLevel);
        const newXp = Math.max(avatar.xp, expectedXp);

        if (newLevel > avatar.level || newXp > avatar.xp) {
          // #877/#878: the repair is conditional on the row still being what
          // was read (xp 0 at that level). A completion that commits between
          // the read and this write moves xp off 0, so the absolute repair
          // matches nothing instead of overwriting the newer reward; the
          // refetch below then reports the committed state.
          await prisma.avatar.updateMany({
            where: { studentId, xp: 0, level: avatar.level },
            data: { level: newLevel, xp: newXp },
          });

          // Refetch with updated values
          avatar = await prisma.avatar.findUnique({
            where: { studentId },
            include: { unlockedAbilities: { include: { Ability: true } } },
          });

          console.log(
            `[/avatar/me] Repaired avatar: level=${newLevel}, xp=${newXp} (completedCount=${completedCount})`,
          );
        }
      }
    }

    res.json({ avatar });
  } catch (error) {
    console.error("Get avatar error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function isSet3Complete(studentId: string): Promise<boolean> {
  const completed = await prisma.progress.findMany({
    where: { studentId, status: "COMPLETED" },
    select: { activityId: true },
  });
  const ids = new Set(completed.map((p) => p.activityId));
  return STEM_SET_3_IDS.every((id) => ids.has(id));
}

// Select archetype (create or upgrade avatar to SPECIALIZED)
router.post(
  "/avatar/select-archetype",
  requireAuth,
  sensitiveOpsLimiter,
  async (req, res) => {
    try {
      const studentId = req.user!.id;
      const { archetype } = selectArchetypeSchema.parse(req.body);

      // Guard: require STEM Set 3 completion before specialization
      const set3Done = await isSet3Complete(studentId);
      if (!set3Done) {
        return res.status(403).json({
          error: "Specialization locked",
          message: "Complete STEM Set 3 before choosing a specialization.",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // ON CONFLICT DO NOTHING also handles two first-ever choices. The
        // conditional UPDATE serializes contenders on the same avatar row.
        const inserted = await tx.avatar.createMany({
          data: [{ studentId }],
          skipDuplicates: true,
        });
        const claim = await tx.avatar.updateMany({
          where: { studentId, stage: "GENERAL" },
          data: { stage: "SPECIALIZED", archetype },
        });
        if (claim.count === 0) return null;

        const { id, level } = await tx.avatar.findUniqueOrThrow({
          where: { studentId },
          select: { id: true, level: true },
        });
        const abilities = await tx.ability.findMany({
          where: { archetype, reqLevel: { lte: level } },
          select: { id: true },
        });
        if (abilities.length) {
          await tx.unlockedAbility.createMany({
            data: abilities.map((ability) => ({
              avatarId: id,
              abilityId: ability.id,
            })),
            skipDuplicates: true,
          });
        }
        const avatar = await tx.avatar.findUniqueOrThrow({
          where: { studentId },
          include: { unlockedAbilities: { include: { Ability: true } } },
        });
        return inserted.count ? { avatar } : { avatar, upgraded: true };
      });

      if (!result)
        return res.status(400).json({ error: "Avatar already specialized" });
      return res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Select archetype error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
