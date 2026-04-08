/**
 * Pathways API routes — secondary-age (14-17) program layer.
 * Handles cohorts, enrollment, milestones, and facilitator data.
 */
import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ── Validation ──────────────────────────────────────────────────────────

const createCohortSchema = z.object({
  name: z.string().min(1).max(200),
  band: z.enum(["explorer", "launch"]),
  sitePartner: z.string().optional(),
  trackIds: z.array(z.string()).min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

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

    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
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

export default router;
