import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { selectArchetypeSchema } from "../validation/schemas";
import { sensitiveOpsLimiter } from "../utils/security";

const router = Router();

// Get user XP
router.get("/user/xp", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const avatar = await prisma.avatar.findUnique({
      where: { studentId },
      select: { xp: true },
    });

    res.json({ currentXp: avatar?.xp || 0 });
  } catch (error) {
    console.error("Get XP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user's avatar
router.get("/avatar/me", requireAuth, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const avatar = await prisma.avatar.findUnique({
      where: { studentId },
      include: { unlockedAbilities: { include: { Ability: true } } },
    });

    if (!avatar) {
      return res.json({ avatar: null });
    }

    res.json({ avatar });
  } catch (error) {
    console.error("Get avatar error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Select archetype (create or upgrade avatar to SPECIALIZED)
router.post(
  "/avatar/select-archetype",
  requireAuth,
  sensitiveOpsLimiter,
  async (req, res) => {
    try {
      const studentId = req.user!.id;
      const { archetype } = selectArchetypeSchema.parse(req.body);

      // Check if avatar already exists
      const existing = await prisma.avatar.findUnique({ where: { studentId } });

      if (existing) {
        // If already SPECIALIZED, reject - can't change archetype
        if (existing.stage === "SPECIALIZED" && existing.archetype) {
          return res.status(400).json({ error: "Avatar already specialized" });
        }

        // Upgrade GENERAL avatar to SPECIALIZED
        const updatedAvatar = await prisma.avatar.update({
          where: { studentId },
          data: {
            stage: "SPECIALIZED",
            archetype: archetype as any,
          },
        });

        // Unlock abilities for the current level
        const eligibleAbilities = await prisma.ability.findMany({
          where: { archetype: archetype as any, reqLevel: { lte: updatedAvatar.level } },
        });

        if (eligibleAbilities.length > 0) {
          // Check for existing unlocks (edge case)
          const existingUnlocks = await prisma.unlockedAbility.findMany({
            where: { avatarId: updatedAvatar.id },
            select: { abilityId: true },
          });
          const existingIds = new Set(existingUnlocks.map((u) => u.abilityId));

          const newAbilities = eligibleAbilities.filter((ab) => !existingIds.has(ab.id));
          if (newAbilities.length > 0) {
            await prisma.unlockedAbility.createMany({
              data: newAbilities.map((ab) => ({
                avatarId: updatedAvatar.id,
                abilityId: ab.id,
                equipped: false,
              })),
            });
          }
        }

        // Refetch with abilities
        const finalAvatar = await prisma.avatar.findUnique({
          where: { studentId },
          include: { unlockedAbilities: { include: { Ability: true } } },
        });

        return res.json({ avatar: finalAvatar, upgraded: true });
      }

      // No avatar exists - create new SPECIALIZED avatar
      const avatar = await prisma.avatar.create({
        data: {
          studentId,
          stage: "SPECIALIZED",
          archetype: archetype as any,
          level: 1,
          xp: 0,
          hp: 100,
          energy: 100,
          speed: 0,
          control: 0,
          focus: 0,
        },
      });

      // Unlock default abilities (reqLevel 1)
      const defaults = await prisma.ability.findMany({
        where: { archetype: archetype as any, reqLevel: 1 },
      });

      if (defaults.length > 0) {
        await prisma.unlockedAbility.createMany({
          data: defaults.map((ab) => ({
            avatarId: avatar.id,
            abilityId: ab.id,
            equipped: false,
          })),
        });
      }

      // Refetch with abilities
      const finalAvatar = await prisma.avatar.findUnique({
        where: { studentId },
        include: { unlockedAbilities: { include: { Ability: true } } },
      });

      res.json({ avatar: finalAvatar });
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
