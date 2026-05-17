/**
 * Pathways API routes — secondary-age (14-17) program layer.
 * Handles cohorts, enrollment, milestones, and facilitator data.
 */
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

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
    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: { in: userIds } },
    });

    const learners = cohort.enrollments.map((e) => {
      const userMilestones = milestones.filter((m) => m.userId === e.user.id);
      const completed = userMilestones.filter((m) => m.status === "completed").length;
      const total = userMilestones.length;
      return {
        ...e.user,
        milestones: userMilestones,
        completedCount: completed,
        totalModules: total,
        lastActive: userMilestones.reduce((latest: Date | null, m) => {
          const d = m.completedAt ?? m.createdAt;
          return !latest || d > latest ? d : latest;
        }, null),
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
    const enrollments = await prisma.pathwayEnrollment.findMany({
      where: { userId: req.user!.id, status: "active" },
      include: { cohort: true },
    });

    const milestones = await prisma.pathwayMilestone.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, ageBand: true, userType: true },
    });

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

    const data: Record<string, unknown> = { [SECTION_COLUMN[section]]: completed };
    if (timeSpentMinutes && timeSpentMinutes > 0) {
      data.timeSpentMinutes = { increment: timeSpentMinutes };
    }
    // Bumping any section transitions the module out of "not_started".
    if (completed) data.status = "in_progress";

    const milestone = await prisma.pathwayMilestone.upsert({
      where: {
        userId_trackSlug_moduleSlug: { userId: req.user!.id, trackSlug, moduleSlug },
      },
      create: {
        userId: req.user!.id,
        trackSlug,
        moduleSlug,
        status: completed ? "in_progress" : "not_started",
        [SECTION_COLUMN[section]]: completed,
        timeSpentMinutes: timeSpentMinutes ?? 0,
      },
      update: data,
    });
    res.json(milestone);
  },
);

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

    const milestone = await prisma.pathwayMilestone.upsert({
      where: {
        userId_trackSlug_moduleSlug: { userId: req.user!.id, trackSlug, moduleSlug },
      },
      create: {
        userId: req.user!.id,
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
    res.json(milestone);
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

    const attempt = await prisma.pathwayLabAttempt.create({
      data: {
        userId: req.user!.id,
        labSlug,
        mode: mode ?? null,
        score,
        hintsUsed: hintsUsed ?? 0,
        // Prisma's Json type uses a sentinel (`Prisma.JsonNull`) rather than
        // bare null when the column is nullable; pass that when the client
        // omits an artifact.
        output:
          output === undefined
            ? Prisma.JsonNull
            : (output as Prisma.InputJsonValue),
      },
    });
    res.json(attempt);
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
