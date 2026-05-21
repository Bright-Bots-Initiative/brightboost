/**
 * Pathways API routes — secondary-age (14-17) program layer.
 * Handles cohorts, enrollment, milestones, and facilitator data.
 */
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";
import {
  XP_AWARDS,
  awardXp,
  awardXpOnce,
  awardBadge,
  recordActivity,
  updateDailyGoalProgress,
  getOrCreateDailyGoals,
  getLevelTier,
  xpToNextLevel,
  summarizeCohortGamification,
  BADGES,
  type BadgeAwardResult,
} from "../services/gamification";
import {
  getServerChallenge,
  flagsMatch,
  CTF_CHALLENGES_SERVER,
} from "../data/ctfChallenges";

const router = Router();

/**
 * Race a Prisma promise against a server-side timeout. Without this, a hung
 * connection (e.g., from a failed migration leaving the pool exhausted) can
 * keep an Express request open until the client times out — which surfaces
 * as a "hanging" dashboard for the student.
 */
function withTimeout<T>(p: Promise<T>, ms = 5000, label = "db"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms),
    ),
  ]);
}

/** Safe defaults for a brand-new student whose gamification rows haven't been
 *  created yet — also the fallback shape we return when the table is missing
 *  in prod so the dashboard always renders. */
const DEFAULT_GAMIFICATION_ME = {
  totalXp: 0,
  currentLevel: 1,
  levelTier: { tier: "Recruit", color: "slate" },
  xpProgress: { current: 0, needed: 50 },
  currentStreak: 0,
  longestStreak: 0,
  streakFreezesAvailable: 1,
  lastActiveDate: null as string | null,
  badgesEarned: 0,
  recentBadges: [] as Array<{
    slug: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
  }>,
} as const;

const DEFAULT_DAILY_GOALS = {
  id: "ephemeral",
  date: new Date().toISOString().slice(0, 10),
  goals: [
    { slug: "complete_section", label: "Complete 1 section", target: 1, current: 0, completed: false },
    { slug: "earn_xp", label: "Earn 50 XP", target: 50, current: 0, completed: false },
    { slug: "try_lab_or_quiz", label: "Try 1 lab or quiz", target: 1, current: 0, completed: false },
  ],
  allComplete: false,
  bonusAwarded: false,
} as const;

// ── Validation ──────────────────────────────────────────────────────────

const createCohortSchema = z.object({
  name: z.string().min(1).max(200),
  band: z.enum(["explorer", "launch", "mixed"]),
  sitePartner: z.string().optional(),
  trackIds: z.array(z.string()).min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
  maxEnrollment: z.number().int().min(1).max(500).optional(),
});

const updateCohortSchema = createCohortSchema.partial();

const noteSchema = z.object({
  text: z.string().min(1).max(2000),
});

function randomJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const milestoneSchema = z.object({
  trackSlug: z.string().min(1),
  moduleSlug: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "completed"]),
  score: z.number().int().min(0).max(100).optional(),
  artifacts: z.any().optional(),
});

// ── Facilitator: create cohort ──────────────────────────────────────────

router.post(
  "/pathways/cohorts",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = createCohortSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const joinCode = randomJoinCode();
    const cohort = await prisma.pathwayCohort.create({
      data: {
        name: parsed.data.name,
        band: parsed.data.band,
        sitePartner: parsed.data.sitePartner,
        facilitatorId: req.user!.id,
        trackIds: parsed.data.trackIds,
        joinCode,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        description: parsed.data.description,
        maxEnrollment: parsed.data.maxEnrollment ?? 25,
        status: "draft",
      },
    });
    res.status(201).json(cohort);
  },
);

// ── Facilitator: list cohorts ───────────────────────────────────────────

router.get(
  "/pathways/cohorts",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(cohorts);
  },
);

// ── Facilitator: cohort detail ──────────────────────────────────────────

router.get(
  "/pathways/cohorts/:id",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await prisma.pathwayCohort.findFirst({
      where: { id: req.params.id, facilitatorId: req.user!.id },
      include: {
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true, ageBand: true } } },
        },
      },
    });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });
    res.json(cohort);
  },
);

// ── Facilitator: cohort progress ────────────────────────────────────────

router.get(
  "/pathways/facilitator/cohort/:id/progress",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await prisma.pathwayCohort.findFirst({
      where: { id: req.params.id, facilitatorId: req.user!.id },
      include: {
        enrollments: {
          where: { status: "active" },
          include: { user: { select: { id: true, name: true, ageBand: true } } },
        },
      },
    });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const userIds = cohort.enrollments.map((e) => e.user.id);
    const [milestones, onboardings] = await Promise.all([
      prisma.pathwayMilestone.findMany({
        where: { userId: { in: userIds } },
      }),
      prisma.pathwayOnboarding.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          completedAt: true,
          avatarChosen: true,
          skillsTourViewed: true,
        },
      }),
    ]);
    const onboardingByUser = new Map(onboardings.map((o) => [o.userId, o]));

    const learners = cohort.enrollments.map((e) => {
      const userMilestones = milestones.filter((m) => m.userId === e.user.id);
      const completed = userMilestones.filter((m) => m.status === "completed").length;
      const total = userMilestones.length;
      const ob = onboardingByUser.get(e.user.id);
      // "completed" if completedAt set; "in_progress" if any flag is true but
      // not completed; "not_started" otherwise. Facilitators use this to spot
      // students who skipped Skills 101.
      let onboardingStatus: "completed" | "in_progress" | "not_started" = "not_started";
      if (ob?.completedAt) onboardingStatus = "completed";
      else if (ob && (ob.avatarChosen || ob.skillsTourViewed)) onboardingStatus = "in_progress";

      return {
        ...e.user,
        milestones: userMilestones,
        completedCount: completed,
        totalModules: total,
        lastActive: userMilestones.reduce((latest: Date | null, m) => {
          const d = m.completedAt ?? m.createdAt;
          return !latest || d > latest ? d : latest;
        }, null),
        onboardingStatus,
      };
    });

    res.json({
      cohort: { id: cohort.id, name: cohort.name, band: cohort.band },
      enrolledCount: learners.length,
      learners,
    });
  },
);

// ── Student: enroll via join code ────────────────────────────────────────

router.post(
  "/pathways/enroll",
  requireAuth,
  async (req: Request, res: Response) => {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ error: "Join code required" });

    const cohort = await prisma.pathwayCohort.findUnique({ where: { joinCode } });
    if (!cohort) return res.status(404).json({ error: "Invalid join code" });

    const enrollment = await prisma.pathwayEnrollment.upsert({
      where: { userId_cohortId: { userId: req.user!.id, cohortId: cohort.id } },
      create: { userId: req.user!.id, cohortId: cohort.id },
      update: {},
    });

    res.json({ enrolled: true, cohortName: cohort.name, enrollment });
  },
);

// ── Student: home data ──────────────────────────────────────────────────

router.get(
  "/pathways/student/home",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
      // Run the three queries in parallel and bounded by a server-side
      // timeout. A single hanging connection (e.g., from a partly-failed
      // migration) used to leave this handler open until the client gave up.
      const [enrollments, milestones, user] = await withTimeout(
        Promise.all([
          prisma.pathwayEnrollment.findMany({
            where: { userId, status: "active" },
            include: { cohort: true },
          }),
          prisma.pathwayMilestone.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
          }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, ageBand: true, userType: true },
          }),
        ]),
        5000,
        "student_home",
      );

      res.json({
        user,
        enrollments: enrollments.map((e) => ({
          cohortId: e.cohort.id,
          cohortName: e.cohort.name,
          band: e.cohort.band,
          trackIds: e.cohort.trackIds,
          sitePartner: e.cohort.sitePartner,
        })),
        milestones,
        recentActivity: milestones.slice(0, 5),
      });
    } catch (err) {
      // Never leave the request hanging — return a usable empty payload so
      // the dashboard can still render. Surface the cause in logs for ops.
      console.error("[pathways/student/home] failed:", err);
      res.status(200).json({
        user: null,
        enrollments: [],
        milestones: [],
        recentActivity: [],
        degraded: true,
      });
    }
  },
);

// ── Student: create/update milestone ────────────────────────────────────

router.post(
  "/pathways/student/milestones",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = milestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const milestone = await prisma.pathwayMilestone.upsert({
      where: {
        userId_trackSlug_moduleSlug: {
          userId: req.user!.id,
          trackSlug: parsed.data.trackSlug,
          moduleSlug: parsed.data.moduleSlug,
        },
      },
      create: {
        userId: req.user!.id,
        trackSlug: parsed.data.trackSlug,
        moduleSlug: parsed.data.moduleSlug,
        status: parsed.data.status,
        score: parsed.data.score,
        completedAt: parsed.data.status === "completed" ? new Date() : null,
        artifacts: parsed.data.artifacts,
      },
      update: {
        status: parsed.data.status,
        score: parsed.data.score,
        completedAt: parsed.data.status === "completed" ? new Date() : undefined,
        artifacts: parsed.data.artifacts,
      },
    });

    res.json(milestone);
  },
);

// ── Student: get milestones ─────────────────────────────────────────────

router.get(
  "/pathways/student/milestones",
  requireAuth,
  async (req: Request, res: Response) => {
    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: req.user!.id },
    });
    res.json(milestones);
  },
);

// ── Section-level progress for the 6-section Cyber Launch flow ─────────────

const SECTION_KEYS = [
  "hook",
  "reading",
  "lesson",
  "practice",
  "homework",
  "quiz",
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const sectionProgressSchema = z.object({
  trackSlug: z.string().min(1),
  moduleSlug: z.string().min(1),
  section: z.enum(SECTION_KEYS),
  completed: z.boolean(),
  timeSpentMinutes: z.number().int().min(0).max(600).optional(),
});

const SECTION_COLUMN: Record<SectionKey, string> = {
  hook: "hookCompleted",
  reading: "readingCompleted",
  lesson: "lessonCompleted",
  practice: "practiceCompleted",
  homework: "homeworkSubmitted",
  quiz: "quizCompleted",
};

router.patch(
  "/pathways/student/milestones/section",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = sectionProgressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { trackSlug, moduleSlug, section, completed, timeSpentMinutes } = parsed.data;
    const userId = req.user!.id;

    // Read-before-write so we can detect the false→true transition that
    // earns XP. Without the prior state we'd repeatedly award on every PATCH.
    const before = await prisma.pathwayMilestone.findUnique({
      where: { userId_trackSlug_moduleSlug: { userId, trackSlug, moduleSlug } },
    });

    const data: Record<string, unknown> = { [SECTION_COLUMN[section]]: completed };
    if (timeSpentMinutes && timeSpentMinutes > 0) {
      data.timeSpentMinutes = { increment: timeSpentMinutes };
    }
    if (completed) data.status = "in_progress";

    const milestone = await prisma.pathwayMilestone.upsert({
      where: { userId_trackSlug_moduleSlug: { userId, trackSlug, moduleSlug } },
      create: {
        userId,
        trackSlug,
        moduleSlug,
        status: completed ? "in_progress" : "not_started",
        [SECTION_COLUMN[section]]: completed,
        timeSpentMinutes: timeSpentMinutes ?? 0,
      },
      update: data,
    });

    // Gamification: only award XP when the section is *transitioning* from
    // incomplete → complete (idempotent against double-PATCH from clients).
    const wasComplete = before ? (before as Record<string, unknown>)[SECTION_COLUMN[section]] === true : false;
    const sideEffects: GamificationSideEffects = { award: null, badges: [], moduleCompleted: false };

    if (completed && !wasComplete) {
      const xpSource = section === "quiz" ? "quiz" : "section";
      const xpAmount = section === "quiz" ? XP_AWARDS.QUIZ_COMPLETE : XP_AWARDS.SECTION_COMPLETE;
      sideEffects.award = await awardXp(userId, xpAmount, xpSource, moduleSlug, { section });
      await updateDailyGoalProgress(userId, "section");

      // Reader badge — all reading sections complete in some module.
      if (section === "reading") {
        const b = await awardBadge(userId, "reader", { moduleSlug });
        if (b) sideEffects.badges.push(b);
      }

      // Quiz completed marks the module as fully done (capstones skip quiz
      // and complete via homework — handled in the homework route).
      // Check if all six section flags are true and the module hasn't been
      // marked completed yet — then award MODULE_COMPLETE + cyber_curious.
      const after = await prisma.pathwayMilestone.findUnique({
        where: { userId_trackSlug_moduleSlug: { userId, trackSlug, moduleSlug } },
      });
      if (
        after &&
        after.hookCompleted &&
        after.readingCompleted &&
        after.lessonCompleted &&
        after.practiceCompleted &&
        after.homeworkSubmitted &&
        after.quizCompleted &&
        after.status !== "completed"
      ) {
        await prisma.pathwayMilestone.update({
          where: { id: after.id },
          data: { status: "completed", completedAt: new Date() },
        });
        const onceModule = await awardXpOnce(
          userId,
          XP_AWARDS.MODULE_COMPLETE,
          "module_complete",
          moduleSlug,
        );
        if (onceModule) sideEffects.moduleCompleted = true;
        const curious = await awardBadge(userId, "cyber_curious", { moduleSlug });
        if (curious) sideEffects.badges.push(curious);
      }
    }

    await recordActivity(userId);
    res.json({ ...milestone, gamification: sideEffects });
  },
);

interface GamificationSideEffects {
  award: Awaited<ReturnType<typeof awardXp>> | null;
  badges: BadgeAwardResult[];
  moduleCompleted: boolean;
}

const homeworkSchema = z.object({
  trackSlug: z.string().min(1),
  moduleSlug: z.string().min(1),
  response: z.string().min(1).max(5000),
});

router.post(
  "/pathways/student/milestones/homework",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = homeworkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { trackSlug, moduleSlug, response } = parsed.data;
    const userId = req.user!.id;

    const before = await prisma.pathwayMilestone.findUnique({
      where: { userId_trackSlug_moduleSlug: { userId, trackSlug, moduleSlug } },
    });
    const wasSubmitted = before?.homeworkSubmitted ?? false;

    const milestone = await prisma.pathwayMilestone.upsert({
      where: { userId_trackSlug_moduleSlug: { userId, trackSlug, moduleSlug } },
      create: {
        userId,
        trackSlug,
        moduleSlug,
        status: "in_progress",
        homeworkSubmitted: true,
        homeworkResponse: response,
      },
      update: {
        homeworkSubmitted: true,
        homeworkResponse: response,
        status: "in_progress",
      },
    });

    const sideEffects: GamificationSideEffects = { award: null, badges: [], moduleCompleted: false };
    if (!wasSubmitted) {
      sideEffects.award = await awardXp(
        userId,
        XP_AWARDS.HOMEWORK_SUBMITTED,
        "homework",
        moduleSlug,
      );
      await updateDailyGoalProgress(userId, "section");

      // Capstone has no quiz — its homework submission is the module finish
      // line. Mark complete + award capstone_creator + cyber_curious here.
      if (moduleSlug === "capstone-security-plan") {
        await prisma.pathwayMilestone.update({
          where: { id: milestone.id },
          data: { status: "completed", completedAt: new Date() },
        });
        const moduleOnce = await awardXpOnce(
          userId,
          XP_AWARDS.MODULE_COMPLETE,
          "module_complete",
          moduleSlug,
        );
        if (moduleOnce) sideEffects.moduleCompleted = true;
        const capstone = await awardBadge(userId, "capstone_creator", { moduleSlug });
        if (capstone) sideEffects.badges.push(capstone);
        const curious = await awardBadge(userId, "cyber_curious", { moduleSlug });
        if (curious) sideEffects.badges.push(curious);
      }
    }

    await recordActivity(userId);
    res.json({ ...milestone, gamification: sideEffects });
  },
);

// ─── Sandbox lab attempts ──────────────────────────────────────────────────
// Labs live outside the module 6-section flow; a student can attempt the
// same lab many times and the highest-score attempt is what we surface back.
// `output` is the portfolio artifact (e.g., Red Flag Field Guide).

const labAttemptSchema = z.object({
  labSlug: z.string().min(1).max(64),
  mode: z.string().min(1).max(64).optional(),
  score: z.number().int().min(0).max(10000),
  hintsUsed: z.number().int().min(0).max(20).optional(),
  output: z.unknown().optional(),
});

router.post(
  "/pathways/student/labs/attempt",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = labAttemptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { labSlug, mode, score, hintsUsed, output } = parsed.data;
    const userId = req.user!.id;

    // Check personal best before insert so we can detect "new high score".
    const prevBest = await prisma.pathwayLabAttempt.findFirst({
      where: { userId, labSlug },
      orderBy: { score: "desc" },
      select: { score: true },
    });
    const isNewBest = prevBest === null || score > prevBest.score;

    const attempt = await prisma.pathwayLabAttempt.create({
      data: {
        userId,
        labSlug,
        mode: mode ?? null,
        score,
        hintsUsed: hintsUsed ?? 0,
        output:
          output === undefined
            ? Prisma.JsonNull
            : (output as Prisma.InputJsonValue),
      },
    });

    const sideEffects: GamificationSideEffects = { award: null, badges: [], moduleCompleted: false };

    // LAB_COMPLETE: once per (user, lab) — awardXpOnce keyed on the lab slug.
    sideEffects.award = await awardXpOnce(
      userId,
      XP_AWARDS.LAB_COMPLETE,
      "lab_complete",
      labSlug,
      { firstScore: score },
    );

    // LAB_HIGH_SCORE: fires repeatedly, each time the student beats prior best.
    if (isNewBest && prevBest !== null) {
      const hs = await awardXp(userId, XP_AWARDS.LAB_HIGH_SCORE, "lab_high_score", labSlug, {
        prev: prevBest.score,
        next: score,
      });
      // Surface the most-recent award if we didn't already (first-time path
      // would have returned a non-null awardXpOnce above).
      if (!sideEffects.award) sideEffects.award = hs;
    }

    await updateDailyGoalProgress(userId, "lab");

    // Skill badges.
    if (labSlug === "password-strength") {
      const b = await awardBadge(userId, "password_pro");
      if (b) sideEffects.badges.push(b);
    }
    if (labSlug === "phishing-showdown" && score >= 90) {
      const b = await awardBadge(userId, "phishing_hunter", { score, mode });
      if (b) sideEffects.badges.push(b);
    }
    if ((hintsUsed ?? 0) === 0 && score > 0) {
      const b = await awardBadge(userId, "sandbox_survivor", { labSlug });
      if (b) sideEffects.badges.push(b);
    }

    await recordActivity(userId);
    res.json({ ...attempt, gamification: sideEffects });
  },
);

router.get(
  "/pathways/student/labs",
  requireAuth,
  async (req: Request, res: Response) => {
    const attempts = await prisma.pathwayLabAttempt.findMany({
      where: { userId: req.user!.id },
      orderBy: { completedAt: "desc" },
      take: 50,
    });
    res.json(attempts);
  },
);

// ─── Gamification (student) ────────────────────────────────────────────────

router.get(
  "/pathways/gamification/me",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
      const [state, recentBadges, totalBadges] = await withTimeout(
        Promise.all([
          prisma.pathwayGamification.upsert({
            where: { userId },
            create: { userId },
            update: {},
          }),
          prisma.pathwayBadge.findMany({
            where: { userId },
            orderBy: { earnedAt: "desc" },
            take: 6,
          }),
          prisma.pathwayBadge.count({ where: { userId } }),
        ]),
        5000,
        "gamification_me",
      );
      res.json({
        totalXp: state.totalXp,
        currentLevel: state.currentLevel,
        levelTier: getLevelTier(state.currentLevel),
        xpProgress: xpToNextLevel(state.totalXp, state.currentLevel),
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        streakFreezesAvailable: state.streakFreezesAvailable,
        lastActiveDate: state.lastActiveDate,
        badgesEarned: totalBadges,
        recentBadges: recentBadges.map((b) => ({
          slug: b.slug,
          name: BADGES[b.slug]?.name ?? b.slug,
          description: BADGES[b.slug]?.description ?? "",
          icon: BADGES[b.slug]?.icon ?? "★",
          earnedAt: b.earnedAt,
        })),
      });
    } catch (err) {
      // The gamification tables may not exist yet (e.g., migration pending).
      // Return defaults so the dashboard renders Level 1 / 0 XP / no badges
      // instead of hanging the student's home page.
      console.error("[pathways/gamification/me] failed:", err);
      res.status(200).json({ ...DEFAULT_GAMIFICATION_ME, degraded: true });
    }
  },
);

router.get(
  "/pathways/gamification/me/badges",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
      const earned = await withTimeout(
        prisma.pathwayBadge.findMany({
          where: { userId },
          orderBy: { earnedAt: "desc" },
        }),
        5000,
        "badges",
      );
      const earnedMap = new Map(earned.map((b) => [b.slug, b]));
      const catalog = Object.entries(BADGES).map(([slug, def]) => ({
        slug,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xp: def.xp,
        earnedAt: earnedMap.get(slug)?.earnedAt ?? null,
      }));
      res.json(catalog);
    } catch (err) {
      console.error("[pathways/gamification/me/badges] failed:", err);
      // Catalog with everything locked — the profile still renders.
      res.status(200).json(
        Object.entries(BADGES).map(([slug, def]) => ({
          slug,
          name: def.name,
          description: def.description,
          icon: def.icon,
          xp: def.xp,
          earnedAt: null,
        })),
      );
    }
  },
);

router.get(
  "/pathways/gamification/me/daily-goals",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const goals = await withTimeout(
        getOrCreateDailyGoals(req.user!.id),
        5000,
        "daily_goals",
      );
      res.json(goals);
    } catch (err) {
      console.error("[pathways/gamification/me/daily-goals] failed:", err);
      // Ephemeral default goals so the home card still renders. Real progress
      // resumes when the DB recovers / migration finishes.
      res.status(200).json({ ...DEFAULT_DAILY_GOALS, degraded: true });
    }
  },
);

router.get(
  "/pathways/gamification/me/level",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const state = await withTimeout(
        prisma.pathwayGamification.upsert({
          where: { userId: req.user!.id },
          create: { userId: req.user!.id },
          update: {},
        }),
        5000,
        "level",
      );
      res.json({
        currentLevel: state.currentLevel,
        tier: getLevelTier(state.currentLevel),
        totalXp: state.totalXp,
        xpProgress: xpToNextLevel(state.totalXp, state.currentLevel),
      });
    } catch (err) {
      console.error("[pathways/gamification/me/level] failed:", err);
      res.status(200).json({
        currentLevel: 1,
        tier: { tier: "Recruit", color: "slate" },
        totalXp: 0,
        xpProgress: { current: 0, needed: 50 },
        degraded: true,
      });
    }
  },
);

router.get(
  "/pathways/gamification/me/events",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const events = await withTimeout(
        prisma.pathwayXpEvent.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        5000,
        "events",
      );
      res.json(events);
    } catch (err) {
      console.error("[pathways/gamification/me/events] failed:", err);
      res.status(200).json([]);
    }
  },
);

router.post(
  "/pathways/gamification/me/activity",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const result = await withTimeout(
        recordActivity(req.user!.id),
        5000,
        "activity",
      );
      res.json(result);
    } catch (err) {
      // Activity ticks are best-effort; never block the client on them.
      console.error("[pathways/gamification/me/activity] failed:", err);
      res.status(200).json({ streak: 0, longestStreak: 0, freezeUsed: false, degraded: true });
    }
  },
);

// ─── CTF Challenges 2.0 ───────────────────────────────────────────────────
// Challenge content lives client-side; this server validates flags,
// awards XP/badges, and tracks hint usage. Solo only for 2.0 — team
// endpoints are stubbed.

router.get(
  "/pathways/challenges",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const [solves, attempts] = await Promise.all([
      prisma.pathwayCtfSolve.findMany({
        where: { userId },
        select: { challengeSlug: true, solvedAt: true, hintsUsed: true },
      }),
      prisma.pathwayCtfAttempt.findMany({
        where: { userId },
        select: { challengeSlug: true, hintsUsed: true },
      }),
    ]);
    const solveMap = new Map(solves.map((s) => [s.challengeSlug, s]));
    // Per-challenge "highest hints used so far" — clients display this so
    // students can resume where they left off.
    const hintsBySlug = new Map<string, number>();
    for (const a of attempts) {
      const cur = hintsBySlug.get(a.challengeSlug) ?? 0;
      if (a.hintsUsed > cur) hintsBySlug.set(a.challengeSlug, a.hintsUsed);
    }
    res.json({
      totalSolved: solves.length,
      totalAttempts: attempts.length,
      solveMap: Object.fromEntries(
        Array.from(solveMap.entries()).map(([slug, s]) => [
          slug,
          { solvedAt: s.solvedAt, hintsUsed: s.hintsUsed },
        ]),
      ),
      hintsBySlug: Object.fromEntries(hintsBySlug),
    });
  },
);

const submitSchema = z.object({
  submittedFlag: z.string().min(1).max(500),
  teamId: z.string().optional(),
});

router.post(
  "/pathways/challenges/:slug/submit",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const userId = req.user!.id;
    const slug = req.params.slug;
    const { submittedFlag, teamId } = parsed.data;

    const challenge = getServerChallenge(slug);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    const isCorrect = flagsMatch(submittedFlag, challenge.flag);

    // Record attempt (regardless of correctness — analytics + replay).
    await prisma.pathwayCtfAttempt.create({
      data: {
        userId,
        challengeSlug: slug,
        submittedFlag,
        isCorrect,
        teamId: teamId ?? null,
      },
    });

    if (!isCorrect) {
      return res.json({
        correct: false,
        message: "Not quite — try again.",
      });
    }

    // Was this user's first correct solve for this challenge?
    const existingSolve = await prisma.pathwayCtfSolve.findUnique({
      where: { userId_challengeSlug: { userId, challengeSlug: slug } },
    });
    if (existingSolve) {
      // Replay encouraged — no double XP, but acknowledge the work.
      await recordActivity(userId);
      return res.json({
        correct: true,
        message: "You've already solved this. Nice replay!",
        alreadySolved: true,
      });
    }

    // Aggregate attempts + max hint usage for this user/challenge.
    const userAttempts = await prisma.pathwayCtfAttempt.findMany({
      where: { userId, challengeSlug: slug },
      select: { hintsUsed: true },
    });
    const hintsUsed = userAttempts.reduce(
      (max, a) => Math.max(max, a.hintsUsed),
      0,
    );

    await prisma.pathwayCtfSolve.create({
      data: {
        userId,
        challengeSlug: slug,
        category: challenge.category,
        difficulty: challenge.difficulty,
        hintsUsed,
        totalAttempts: userAttempts.length,
        teamId: teamId ?? null,
      },
    });

    // XP + daily-goal tick (CTF counts toward "try 1 lab or quiz").
    const xpAward = await awardXp(userId, challenge.xpReward, "ctf_solve", slug, {
      category: challenge.category,
      difficulty: challenge.difficulty,
      hintsUsed,
      totalAttempts: userAttempts.length,
    });
    await updateDailyGoalProgress(userId, "lab");
    await recordActivity(userId);

    // Badge logic (idempotent — awardBadge is unique-keyed).
    const newBadges: BadgeAwardResult[] = [];

    const totalSolves = await prisma.pathwayCtfSolve.count({ where: { userId } });
    if (totalSolves === 1) {
      const b = await awardBadge(userId, "first_flag");
      if (b) newBadges.push(b);
    }
    if (totalSolves >= 5) {
      const b = await awardBadge(userId, "flag_hunter");
      if (b) newBadges.push(b);
    }
    if (totalSolves >= 15) {
      const b = await awardBadge(userId, "flag_legend");
      if (b) newBadges.push(b);
    }

    // Category-clear: 6 in a single category.
    const categorySolveCount = await prisma.pathwayCtfSolve.count({
      where: { userId, category: challenge.category },
    });
    if (categorySolveCount >= 6) {
      const mastery = `${challenge.category}_master` as
        | "cryptography_master"
        | "web_master"
        | "forensics_master"
        | "networks_master";
      const b = await awardBadge(userId, mastery);
      if (b) newBadges.push(b);
    }

    // Cyber generalist: at least one in each of the four categories.
    const groups = await prisma.pathwayCtfSolve.groupBy({
      by: ["category"],
      where: { userId },
    });
    if (groups.length >= 4) {
      const b = await awardBadge(userId, "cyber_generalist");
      if (b) newBadges.push(b);
    }

    res.json({
      correct: true,
      message: "Flag captured!",
      xpAwarded: challenge.xpReward,
      hintsUsed,
      totalAttempts: userAttempts.length,
      gamification: {
        award: {
          leveledUp: xpAward.leveledUp,
          newLevel: xpAward.newLevel,
          tier: xpAward.tier,
        },
        badges: newBadges,
        moduleCompleted: false,
      },
    });
  },
);

router.post(
  "/pathways/challenges/:slug/hint",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const slug = req.params.slug;
    const challenge = getServerChallenge(slug);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    // Already solved? Hints stay available for replay support.
    // Highest hints previously used by this user on this challenge.
    const last = await prisma.pathwayCtfAttempt.findFirst({
      where: { userId, challengeSlug: slug },
      orderBy: { hintsUsed: "desc" },
      select: { hintsUsed: true },
    });
    const currentHints = last?.hintsUsed ?? 0;
    if (currentHints >= 3) {
      return res.json({ hint: null, hintsUsed: 3, hintsRemaining: 0, hintsExhausted: true });
    }

    const newCount = currentHints + 1;
    const hint = challenge.hints[newCount - 1];

    // Record a "hint" attempt so the new max-hints-used floor is captured.
    await prisma.pathwayCtfAttempt.create({
      data: {
        userId,
        challengeSlug: slug,
        submittedFlag: "",
        isCorrect: false,
        hintsUsed: newCount,
      },
    });

    res.json({
      hint,
      hintsUsed: newCount,
      hintsRemaining: 3 - newCount,
    });
  },
);

// Team stubs — wired in 2.1. Schema exists so we can persist progress
// once the UI ships; these endpoints return 501 for now.
router.post(
  "/pathways/teams",
  requireAuth,
  async (_req: Request, res: Response) => {
    res
      .status(501)
      .json({ error: "Team mode is launching in the next update. Solo play is fully supported." });
  },
);
router.post(
  "/pathways/teams/join",
  requireAuth,
  async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Team mode is launching in the next update." });
  },
);
router.get(
  "/pathways/teams/me",
  requireAuth,
  async (_req: Request, res: Response) => {
    res.json({ team: null });
  },
);

// ─── Onboarding (Cyber Skills 101) ─────────────────────────────────────────

const onboardingPatchSchema = z.object({
  avatarChosen: z.boolean().optional(),
  skillsTourViewed: z.boolean().optional(),
  skillsTourSkipped: z.boolean().optional(),
  missionStatement: z.string().max(280).optional(),
  dailyGoalLevel: z.enum(["light", "medium", "heavy"]).optional(),
  avatarSlug: z.string().min(1).max(32).optional(),
  completed: z.boolean().optional(),
});

router.get(
  "/pathways/onboarding/me",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const row = await withTimeout(
        prisma.pathwayOnboarding.upsert({
          where: { userId: req.user!.id },
          create: { userId: req.user!.id },
          update: {},
        }),
        5000,
        "onboarding_me",
      );
      res.json(row);
    } catch (err) {
      console.error("[pathways/onboarding/me] failed:", err);
      // Fallback: pretend the user hasn't started yet so the welcome flow
      // still renders for them; persistence resumes when the DB recovers.
      res.status(200).json({
        userId: req.user!.id,
        startedAt: new Date().toISOString(),
        completedAt: null,
        avatarChosen: false,
        skillsTourViewed: false,
        skillsTourSkipped: false,
        missionStatement: null,
        dailyGoalLevel: null,
        avatarSlug: null,
        degraded: true,
      });
    }
  },
);

router.patch(
  "/pathways/onboarding/me",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = onboardingPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const userId = req.user!.id;
    const { completed, ...patch } = parsed.data;

    try {
      const before = await prisma.pathwayOnboarding.findUnique({ where: { userId } });
      const data: Record<string, unknown> = { ...patch };
      let justCompleted = false;
      if (completed && !before?.completedAt) {
        data.completedAt = new Date();
        justCompleted = true;
      }

      const row = await prisma.pathwayOnboarding.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });

      // Award getting_started on first completion. The badge itself is
      // unique-keyed so re-calling this endpoint is safe.
      let badgeAwarded = null;
      if (justCompleted) {
        badgeAwarded = await awardBadge(userId, "getting_started");
      }

      res.json({ onboarding: row, badgeAwarded });
    } catch (err) {
      console.error("[pathways/onboarding/me PATCH] failed:", err);
      res.status(500).json({ error: "failed_to_save" });
    }
  },
);

// ─── Glossary ──────────────────────────────────────────────────────────────

const glossaryViewSchema = z.object({
  termSlug: z.string().min(1).max(64),
});

router.post(
  "/pathways/glossary/view",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = glossaryViewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const userId = req.user!.id;
    const termSlug = parsed.data.termSlug;

    try {
      const existing = await prisma.pathwayGlossaryView.findUnique({
        where: { userId_termSlug: { userId, termSlug } },
      });
      if (existing) {
        return res.json({ alreadyViewed: true });
      }

      await prisma.pathwayGlossaryView.create({
        data: { userId, termSlug },
      });

      const totalViewed = await prisma.pathwayGlossaryView.count({
        where: { userId },
      });

      let badgeAwarded: BadgeAwardResult | null = null;
      if (totalViewed === 25) badgeAwarded = await awardBadge(userId, "word_collector");
      if (totalViewed === 50) badgeAwarded = await awardBadge(userId, "vocab_builder");
      if (totalViewed === 100) badgeAwarded = await awardBadge(userId, "cyber_linguist");

      res.json({ alreadyViewed: false, totalViewed, badgeAwarded });
    } catch (err) {
      console.error("[pathways/glossary/view] failed:", err);
      // Non-fatal — tracking glossary views shouldn't break the page that
      // hosts the tooltip.
      res.status(200).json({ alreadyViewed: false, degraded: true });
    }
  },
);

router.get(
  "/pathways/glossary/me/stats",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const views = await prisma.pathwayGlossaryView.findMany({
        where: { userId: req.user!.id },
        select: { termSlug: true, viewedAt: true },
      });
      res.json({
        totalViewed: views.length,
        viewedSlugs: views.map((v) => v.termSlug),
      });
    } catch (err) {
      console.error("[pathways/glossary/me/stats] failed:", err);
      res.status(200).json({ totalViewed: 0, viewedSlugs: [] });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Facilitator: cohort lifecycle and operations
// ═══════════════════════════════════════════════════════════════════════════

/** Verify cohort exists and belongs to the requesting facilitator. */
async function ownedCohort(id: string, facilitatorId: string) {
  return prisma.pathwayCohort.findFirst({
    where: { id, facilitatorId },
  });
}

// Update cohort metadata
router.put(
  "/pathways/facilitator/cohorts/:id",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = updateCohortSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.band !== undefined) data.band = parsed.data.band;
    if (parsed.data.sitePartner !== undefined) data.sitePartner = parsed.data.sitePartner;
    if (parsed.data.trackIds !== undefined) data.trackIds = parsed.data.trackIds;
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.maxEnrollment !== undefined) data.maxEnrollment = parsed.data.maxEnrollment;

    const updated = await prisma.pathwayCohort.update({
      where: { id: cohort.id },
      data,
    });
    res.json(updated);
  },
);

// Lifecycle: start / pause / end / archive
const LIFECYCLE_TRANSITIONS: Record<string, string> = {
  start: "active",
  pause: "paused",
  end: "ended",
  archive: "archived",
};

for (const [action, newStatus] of Object.entries(LIFECYCLE_TRANSITIONS)) {
  router.post(
    `/pathways/facilitator/cohorts/:id/${action}`,
    requireAuth,
    requireRole("teacher"),
    async (req: Request, res: Response) => {
      const cohort = await ownedCohort(req.params.id, req.user!.id);
      if (!cohort) return res.status(404).json({ error: "Cohort not found" });

      const updated = await prisma.pathwayCohort.update({
        where: { id: cohort.id },
        data: { status: newStatus },
      });
      res.json(updated);
    },
  );
}

// Regenerate join code
router.post(
  "/pathways/facilitator/cohorts/:id/regenerate-code",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    // Retry on collision (extremely rare)
    let joinCode = randomJoinCode();
    for (let i = 0; i < 5; i++) {
      const conflict = await prisma.pathwayCohort.findUnique({ where: { joinCode } });
      if (!conflict) break;
      joinCode = randomJoinCode();
    }
    const updated = await prisma.pathwayCohort.update({
      where: { id: cohort.id },
      data: { joinCode },
    });
    res.json({ joinCode: updated.joinCode });
  },
);

// Add facilitator note to cohort
router.post(
  "/pathways/facilitator/cohorts/:id/notes",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const existing = (cohort.notes as Array<{ text: string; author: string; ts: string }>) ?? [];
    const author = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });
    const note = {
      text: parsed.data.text,
      author: author?.name ?? "Facilitator",
      ts: new Date().toISOString(),
    };
    const updated = await prisma.pathwayCohort.update({
      where: { id: cohort.id },
      data: { notes: [...existing, note] },
    });
    res.json(updated.notes);
  },
);

// Add learner by email (must already have a user account)
router.post(
  "/pathways/facilitator/cohorts/:id/learners",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") return res.status(400).json({ error: "Email required" });

    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: "No learner account found for that email. The learner must register first." });

    const enrollment = await prisma.pathwayEnrollment.upsert({
      where: { userId_cohortId: { userId: user.id, cohortId: cohort.id } },
      create: { userId: user.id, cohortId: cohort.id },
      update: { status: "active" },
    });
    res.status(201).json(enrollment);
  },
);

// Remove learner from cohort
router.delete(
  "/pathways/facilitator/cohorts/:id/learners/:userId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    await prisma.pathwayEnrollment.deleteMany({
      where: { cohortId: cohort.id, userId: req.params.userId },
    });
    res.status(204).end();
  },
);

// Export cohort roster as CSV
router.get(
  "/pathways/facilitator/cohorts/:id/export",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await prisma.pathwayCohort.findFirst({
      where: { id: req.params.id, facilitatorId: req.user!.id },
      include: { enrollments: { include: { user: true } } },
    });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const userIds = cohort.enrollments.map((e) => e.user.id);
    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: { in: userIds } },
    });

    const rows = [
      ["Name", "Email", "Band", "Modules Completed", "Avg Score", "Last Active", "Enrollment Status"],
      ...cohort.enrollments.map((e) => {
        const userMs = milestones.filter((m) => m.userId === e.user.id);
        const completed = userMs.filter((m) => m.status === "completed");
        const avgScore = completed.length > 0
          ? Math.round(completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length)
          : 0;
        const lastActive = userMs.reduce<Date | null>((latest, m) => {
          const d = m.completedAt ?? m.createdAt;
          return !latest || d > latest ? d : latest;
        }, null);
        return [
          e.user.name ?? "",
          e.user.email ?? "",
          e.user.ageBand ?? "",
          String(completed.length),
          String(avgScore),
          lastActive ? lastActive.toISOString().slice(0, 10) : "",
          e.status,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cohort.name.replace(/[^a-zA-Z0-9]/g, "_")}_roster.csv"`,
    );
    res.send(csv);
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Facilitator: cross-cohort learners
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  "/pathways/facilitator/learners",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      include: {
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true, ageBand: true } } },
        },
      },
    });

    // Flatten enrollments and collapse per-user (user may be in multiple cohorts)
    const byUserId = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string | null;
        ageBand: string | null;
        cohorts: { id: string; name: string; status: string }[];
        enrollmentStatuses: string[];
      }
    >();
    for (const cohort of cohorts) {
      for (const e of cohort.enrollments) {
        const existing = byUserId.get(e.user.id);
        if (existing) {
          existing.cohorts.push({ id: cohort.id, name: cohort.name, status: cohort.status });
          existing.enrollmentStatuses.push(e.status);
        } else {
          byUserId.set(e.user.id, {
            id: e.user.id,
            name: e.user.name,
            email: e.user.email,
            ageBand: e.user.ageBand,
            cohorts: [{ id: cohort.id, name: cohort.name, status: cohort.status }],
            enrollmentStatuses: [e.status],
          });
        }
      }
    }
    const userIds = Array.from(byUserId.keys());
    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: { in: userIds } },
    });

    const learners = Array.from(byUserId.values()).map((u) => {
      const ms = milestones.filter((m) => m.userId === u.id);
      const completed = ms.filter((m) => m.status === "completed").length;
      const lastActive = ms.reduce<Date | null>((latest, m) => {
        const d = m.completedAt ?? m.createdAt;
        return !latest || d > latest ? d : latest;
      }, null);
      const enrollmentStatus = u.enrollmentStatuses.includes("active")
        ? "active"
        : u.enrollmentStatuses.includes("completed")
          ? "completed"
          : u.enrollmentStatuses[0] ?? "inactive";
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        ageBand: u.ageBand,
        cohorts: u.cohorts,
        completedCount: completed,
        totalModules: ms.length,
        lastActive,
        status: enrollmentStatus,
      };
    });

    res.json(learners);
  },
);

router.get(
  "/pathways/facilitator/learners/:userId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    // Verify the learner is in one of this facilitator's cohorts
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      select: { id: true, name: true, status: true },
    });
    const cohortIds = cohorts.map((c) => c.id);
    const enrollments = await prisma.pathwayEnrollment.findMany({
      where: { userId: req.params.userId, cohortId: { in: cohortIds } },
      include: { cohort: { select: { id: true, name: true, status: true } } },
    });
    if (enrollments.length === 0) return res.status(404).json({ error: "Learner not found in your cohorts" });

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, email: true, ageBand: true, birthYear: true },
    });
    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: req.params.userId },
    });

    res.json({ user, enrollments, milestones });
  },
);

// ─── Facilitator: gamification visibility ─────────────────────────────────

router.get(
  "/pathways/facilitator/cohorts/:id/gamification",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const enrollments = await prisma.pathwayEnrollment.findMany({
      where: { cohortId: cohort.id },
      select: { userId: true },
    });
    const summary = await summarizeCohortGamification(
      enrollments.map((e) => e.userId),
    );
    res.json(summary);
  },
);

router.get(
  "/pathways/facilitator/cohorts/:id/challenges",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await ownedCohort(req.params.id, req.user!.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const enrollments = await prisma.pathwayEnrollment.findMany({
      where: { cohortId: cohort.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const userIds = enrollments.map((e) => e.userId);

    if (userIds.length === 0) {
      return res.json({
        totalFlags: 0,
        perStudent: [],
        mostAttempted: null,
        averageHintsPerSolve: 0,
      });
    }

    const [solves, attempts] = await Promise.all([
      prisma.pathwayCtfSolve.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          challengeSlug: true,
          category: true,
          hintsUsed: true,
        },
      }),
      prisma.pathwayCtfAttempt.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, challengeSlug: true, isCorrect: true },
      }),
    ]);

    // Per-student breakdown.
    const perStudent = enrollments.map((e) => {
      const userSolves = solves.filter((s) => s.userId === e.userId);
      const byCategory = {
        cryptography: 0,
        web: 0,
        forensics: 0,
        networks: 0,
      } as Record<string, number>;
      for (const s of userSolves) {
        byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
      }
      const userAttempts = attempts.filter((a) => a.userId === e.userId).length;
      return {
        userId: e.userId,
        name: e.user.name,
        email: e.user.email,
        totalFlags: userSolves.length,
        attempts: userAttempts,
        byCategory,
      };
    });

    // Most-attempted challenge in cohort.
    const attemptCounts = new Map<string, number>();
    for (const a of attempts) {
      attemptCounts.set(
        a.challengeSlug,
        (attemptCounts.get(a.challengeSlug) ?? 0) + 1,
      );
    }
    let mostAttempted: { slug: string; attempts: number } | null = null;
    for (const [slug, count] of attemptCounts) {
      if (!mostAttempted || count > mostAttempted.attempts) {
        mostAttempted = { slug, attempts: count };
      }
    }

    const averageHintsPerSolve =
      solves.length === 0
        ? 0
        : Math.round(
            (solves.reduce((sum, s) => sum + s.hintsUsed, 0) / solves.length) * 10,
          ) / 10;

    res.json({
      totalFlags: solves.length,
      perStudent,
      mostAttempted,
      averageHintsPerSolve,
      challengeCatalogSize: CTF_CHALLENGES_SERVER.length,
    });
  },
);

router.get(
  "/pathways/facilitator/learners/:userId/gamification",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    // Verify the learner is in one of this facilitator's cohorts.
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      select: { id: true },
    });
    const cohortIds = cohorts.map((c) => c.id);
    const ok = await prisma.pathwayEnrollment.findFirst({
      where: { userId: req.params.userId, cohortId: { in: cohortIds } },
      select: { id: true },
    });
    if (!ok) return res.status(404).json({ error: "Learner not found in your cohorts" });

    const userId = req.params.userId;
    const state = await prisma.pathwayGamification.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const badges = await prisma.pathwayBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });
    const recentEvents = await prisma.pathwayXpEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      state: {
        ...state,
        levelTier: getLevelTier(state.currentLevel),
        xpProgress: xpToNextLevel(state.totalXp, state.currentLevel),
      },
      badges: badges.map((b) => ({
        slug: b.slug,
        name: BADGES[b.slug]?.name ?? b.slug,
        description: BADGES[b.slug]?.description ?? "",
        icon: BADGES[b.slug]?.icon ?? "★",
        earnedAt: b.earnedAt,
      })),
      recentEvents,
    });
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Facilitator: tracks catalog with stats
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  "/pathways/facilitator/tracks",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      select: { id: true, trackIds: true, name: true, status: true },
    });
    // Per-track: which cohorts use it, total enrolled, completion stats
    const trackUsage: Record<string, { cohorts: { id: string; name: string; status: string }[]; learnerCount: number; completionCount: number }> = {};
    for (const cohort of cohorts) {
      for (const trackId of cohort.trackIds) {
        if (!trackUsage[trackId]) trackUsage[trackId] = { cohorts: [], learnerCount: 0, completionCount: 0 };
        trackUsage[trackId].cohorts.push({ id: cohort.id, name: cohort.name, status: cohort.status });
      }
    }

    // Cross-cohort milestone counts per track
    const cohortIds = cohorts.map((c) => c.id);
    const enrollments = await prisma.pathwayEnrollment.findMany({
      where: { cohortId: { in: cohortIds } },
      select: { userId: true, cohort: { select: { trackIds: true } } },
    });
    const trackUserIds: Record<string, Set<string>> = {};
    for (const e of enrollments) {
      for (const trackId of e.cohort.trackIds) {
        if (!trackUserIds[trackId]) trackUserIds[trackId] = new Set();
        trackUserIds[trackId].add(e.userId);
      }
    }
    for (const [trackId, uids] of Object.entries(trackUserIds)) {
      if (!trackUsage[trackId]) trackUsage[trackId] = { cohorts: [], learnerCount: 0, completionCount: 0 };
      trackUsage[trackId].learnerCount = uids.size;
    }

    const allMilestones = await prisma.pathwayMilestone.findMany({
      where: { status: "completed", userId: { in: enrollments.map((e) => e.userId) } },
    });
    for (const m of allMilestones) {
      if (!trackUsage[m.trackSlug]) trackUsage[m.trackSlug] = { cohorts: [], learnerCount: 0, completionCount: 0 };
      trackUsage[m.trackSlug].completionCount += 1;
    }

    res.json(trackUsage);
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Facilitator: reports
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  "/pathways/facilitator/reports/weekly",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const since = new Date(Date.now() - 7 * 86400000);
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      include: {
        enrollments: { select: { userId: true, enrolledAt: true } },
      },
    });
    const userIds = cohorts.flatMap((c) => c.enrollments.map((e) => e.userId));

    const milestones = await prisma.pathwayMilestone.findMany({
      where: {
        userId: { in: userIds },
        completedAt: { gte: since },
      },
    });
    const newEnrollments = cohorts.flatMap((c) =>
      c.enrollments.filter((e) => e.enrolledAt >= since),
    );
    const recentMs = await prisma.pathwayMilestone.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    });

    // Learners with no activity in the last 7 days
    const allRecent = await prisma.pathwayMilestone.findMany({
      where: { userId: { in: userIds }, OR: [{ createdAt: { gte: since } }, { completedAt: { gte: since } }] },
      select: { userId: true },
    });
    const activeUserIds = new Set(allRecent.map((m) => m.userId));
    const inactiveLearners = await prisma.user.findMany({
      where: { id: { in: userIds.filter((id) => !activeUserIds.has(id)) } },
      select: { id: true, name: true },
    });

    res.json({
      windowDays: 7,
      modulesCompleted: milestones.length,
      newEnrollments: newEnrollments.length,
      inactiveLearners,
      capstonesInProgress: await prisma.pathwayMilestone.count({
        where: { userId: { in: userIds }, moduleSlug: "capstone-security-plan", status: "in_progress" },
      }),
      recentActivity: recentMs,
    });
  },
);

router.get(
  "/pathways/facilitator/reports/cohort/:id",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohort = await prisma.pathwayCohort.findFirst({
      where: { id: req.params.id, facilitatorId: req.user!.id },
      include: { enrollments: { include: { user: { select: { id: true, name: true, ageBand: true } } } } },
    });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });

    const userIds = cohort.enrollments.map((e) => e.user.id);
    const milestones = await prisma.pathwayMilestone.findMany({ where: { userId: { in: userIds } } });
    const moduleStats: Record<string, { completed: number; avgScore: number; count: number }> = {};
    for (const m of milestones) {
      if (m.status === "completed") {
        const stats = moduleStats[m.moduleSlug] ?? { completed: 0, avgScore: 0, count: 0 };
        stats.completed += 1;
        stats.count += 1;
        stats.avgScore = Math.round(((stats.avgScore * (stats.count - 1)) + (m.score ?? 0)) / stats.count);
        moduleStats[m.moduleSlug] = stats;
      }
    }
    res.json({
      cohort: {
        id: cohort.id,
        name: cohort.name,
        sitePartner: cohort.sitePartner,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        status: cohort.status,
      },
      enrolledCount: cohort.enrollments.length,
      completedEnrollments: cohort.enrollments.filter((e) => e.status === "completed").length,
      moduleStats,
    });
  },
);

router.get(
  "/pathways/facilitator/reports/outcomes",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      include: { enrollments: true },
    });
    const userIds = cohorts.flatMap((c) => c.enrollments.map((e) => e.userId));

    const allMs = await prisma.pathwayMilestone.findMany({ where: { userId: { in: userIds } } });
    const completed = allMs.filter((m) => m.status === "completed");
    const capstones = completed.filter((m) => m.moduleSlug === "capstone-security-plan").length;
    const certExternal = completed.filter((m) => m.moduleSlug === "cisco-netacad-link").length;

    res.json({
      totalCohorts: cohorts.length,
      activeCohorts: cohorts.filter((c) => c.status === "active").length,
      endedCohorts: cohorts.filter((c) => c.status === "ended").length,
      totalEnrolled: userIds.length,
      modulesCompleted: completed.length,
      capstonesProduced: capstones,
      externalCourseworkStarted: certExternal,
      averageScore: completed.length > 0
        ? Math.round(completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length)
        : 0,
    });
  },
);

router.get(
  "/pathways/facilitator/reports/engagement",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const cohorts = await prisma.pathwayCohort.findMany({
      where: { facilitatorId: req.user!.id },
      include: { enrollments: { select: { userId: true } } },
    });
    const userIds = cohorts.flatMap((c) => c.enrollments.map((e) => e.userId));
    const allMs = await prisma.pathwayMilestone.findMany({ where: { userId: { in: userIds } } });

    // Bucket activity by day for the last 30 days
    const buckets: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
      buckets[day] = 0;
    }
    for (const m of allMs) {
      const ts = (m.completedAt ?? m.createdAt).toISOString().slice(0, 10);
      if (buckets[ts] !== undefined) buckets[ts] += 1;
    }
    const series = Object.entries(buckets).map(([date, count]) => ({ date, count }));

    res.json({
      totalLearners: userIds.length,
      activeLast7Days: new Set(
        allMs
          .filter((m) => (m.completedAt ?? m.createdAt) >= new Date(Date.now() - 7 * 86400000))
          .map((m) => m.userId),
      ).size,
      activeLast30Days: new Set(
        allMs
          .filter((m) => (m.completedAt ?? m.createdAt) >= new Date(Date.now() - 30 * 86400000))
          .map((m) => m.userId),
      ).size,
      dailyActivity: series,
    });
  },
);

export default router;
