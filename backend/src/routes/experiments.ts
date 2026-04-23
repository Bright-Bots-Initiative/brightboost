/**
 * A/B Testing API — lightweight experiment framework for internal team use.
 * Interns create experiments, games consume variants, dashboard aggregates results.
 */
import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { notifySlack } from "../utils/slack";
import { z } from "zod";

const router = Router();

// ── Validation ──────────────────────────────────────────────────────────

const createExperimentSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  name: z.string().min(1).max(200),
  hypothesis: z.string().min(1).max(1000),
  metric: z.string().min(1).max(100),
  trafficSplit: z.number().int().min(0).max(100).optional(),
});

const updateExperimentSchema = z.object({
  status: z.enum(["draft", "running", "completed", "archived"]).optional(),
  conclusion: z.string().max(2000).optional(),
  trafficSplit: z.number().int().min(0).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  hypothesis: z.string().min(1).max(1000).optional(),
  metric: z.string().min(1).max(100).optional(),
});

const eventSchema = z.object({
  eventName: z.string().min(1).max(100),
  eventValue: z.number().optional(),
  metadata: z.any().optional(),
});

const MILESTONE_THRESHOLDS = new Set([25, 50, 100]);

// ── List experiments ────────────────────────────────────────────────────

router.get(
  "/experiments",
  requireAuth,
  requireRole("teacher"),
  async (_req: Request, res: Response) => {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { assignments: true, events: true } },
      },
    });
    res.json(experiments);
  },
);

// ── Create experiment ───────────────────────────────────────────────────

router.post(
  "/experiments",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = createExperimentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const existing = await prisma.experiment.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) return res.status(409).json({ error: "slug_already_exists" });

    const experiment = await prisma.experiment.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        hypothesis: parsed.data.hypothesis,
        metric: parsed.data.metric,
        trafficSplit: parsed.data.trafficSplit ?? 50,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json(experiment);
  },
);

// ── Update experiment (status, conclusion, etc.) ────────────────────────

router.put(
  "/experiments/:id",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = updateExperimentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const current = await prisma.experiment.findUnique({
      where: { id: req.params.id },
    });
    if (!current) return res.status(404).json({ error: "not_found" });

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "completed" && !current.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await prisma.experiment.update({
      where: { id: req.params.id },
      data,
    });

    // Slack: status transitions
    if (parsed.data.status && parsed.data.status !== current.status) {
      if (parsed.data.status === "running") {
        notifySlack(
          "#experiments",
          `🧪 Experiment started: "${updated.name}"\nHypothesis: ${updated.hypothesis}\nTraffic split: ${updated.trafficSplit}% variant`,
        );
      } else if (parsed.data.status === "completed") {
        notifySlack(
          "#experiments",
          `✅ Experiment completed: "${updated.name}"\nConclusion: ${updated.conclusion ?? "(no conclusion recorded)"}`,
        );
      }
    }

    res.json(updated);
  },
);

// ── Get variant for current user (assigns if new) ───────────────────────

router.get(
  "/experiments/:slug/variant",
  requireAuth,
  async (req: Request, res: Response) => {
    const experiment = await prisma.experiment.findUnique({
      where: { slug: req.params.slug },
    });
    if (!experiment) return res.status(404).json({ error: "not_found" });

    // Only running experiments split traffic. Otherwise, everyone is control.
    if (experiment.status !== "running") {
      return res.json({ variant: "control", experimentStatus: experiment.status });
    }

    const userId = req.user!.id;
    const existing = await prisma.experimentAssignment.findUnique({
      where: { experimentId_userId: { experimentId: experiment.id, userId } },
    });
    if (existing) return res.json({ variant: existing.variant });

    const roll = Math.random() * 100;
    const variant = roll < experiment.trafficSplit ? "variant" : "control";

    const assignment = await prisma.experimentAssignment.create({
      data: { experimentId: experiment.id, userId, variant },
    });
    res.json({ variant: assignment.variant });
  },
);

// ── Track an event ──────────────────────────────────────────────────────

router.post(
  "/experiments/:slug/event",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const experiment = await prisma.experiment.findUnique({
      where: { slug: req.params.slug },
    });
    if (!experiment) return res.status(404).json({ error: "not_found" });

    const userId = req.user!.id;
    const assignment = await prisma.experimentAssignment.findUnique({
      where: { experimentId_userId: { experimentId: experiment.id, userId } },
    });
    const variant = assignment?.variant ?? "control";

    await prisma.experimentEvent.create({
      data: {
        experimentId: experiment.id,
        userId,
        variant,
        eventName: parsed.data.eventName,
        eventValue: parsed.data.eventValue,
        metadata: parsed.data.metadata,
      },
    });

    // Milestone alerts — fire once when total assigned users crosses a threshold
    const totalUsers = await prisma.experimentAssignment.count({
      where: { experimentId: experiment.id },
    });
    if (MILESTONE_THRESHOLDS.has(totalUsers)) {
      notifySlack(
        "#experiments",
        `📊 "${experiment.name}" has reached ${totalUsers} users. Time for a progress check!`,
      );
    }

    res.status(201).json({ ok: true });
  },
);

// ── Results: aggregated per-variant stats ───────────────────────────────

router.get(
  "/experiments/:id/results",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const experiment = await prisma.experiment.findUnique({
      where: { id: req.params.id },
    });
    if (!experiment) return res.status(404).json({ error: "not_found" });

    const [assignments, events] = await Promise.all([
      prisma.experimentAssignment.groupBy({
        by: ["variant"],
        where: { experimentId: experiment.id },
        _count: { _all: true },
      }),
      prisma.experimentEvent.findMany({
        where: { experimentId: experiment.id },
        select: { variant: true, eventName: true, eventValue: true, userId: true },
      }),
    ]);

    const buildSide = (variant: "control" | "variant") => {
      const users = assignments.find((a) => a.variant === variant)?._count._all ?? 0;
      const variantEvents = events.filter((e) => e.variant === variant);

      const eventCounts: Record<string, number> = {};
      const metricValues: number[] = [];
      for (const e of variantEvents) {
        eventCounts[e.eventName] = (eventCounts[e.eventName] ?? 0) + 1;
        if (e.eventName === experiment.metric && typeof e.eventValue === "number") {
          metricValues.push(e.eventValue);
        }
      }

      const metricCountForVariant = variantEvents.filter(
        (e) => e.eventName === experiment.metric,
      ).length;

      const avgMetricPerUser = users > 0 ? metricCountForVariant / users : 0;
      const avgMetricValue = metricValues.length
        ? metricValues.reduce((a, b) => a + b, 0) / metricValues.length
        : null;

      return {
        users,
        events: eventCounts,
        avgMetricPerUser,
        avgMetricValue,
      };
    };

    res.json({
      experiment: {
        id: experiment.id,
        slug: experiment.slug,
        name: experiment.name,
        hypothesis: experiment.hypothesis,
        metric: experiment.metric,
        status: experiment.status,
        trafficSplit: experiment.trafficSplit,
        conclusion: experiment.conclusion,
      },
      control: buildSide("control"),
      variant: buildSide("variant"),
    });
  },
);

export default router;
