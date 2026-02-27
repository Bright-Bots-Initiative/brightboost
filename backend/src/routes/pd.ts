import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireRole } from "../utils/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// PD Sessions
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/teacher/pd-sessions — List teacher's PD sessions + templates
router.get(
  "/teacher/pd-sessions",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;
      const includeTemplates = req.query.includeTemplates === "true";

      const where = includeTemplates
        ? { OR: [{ teacherId }, { isTemplate: true }] }
        : { teacherId };

      const sessions = await prisma.pDSession.findMany({
        where,
        orderBy: { date: "desc" },
        include: { reflections: true },
      });

      res.json(sessions);
    } catch (err) {
      console.error("Error fetching PD sessions:", err);
      res.status(500).json({ error: "Failed to fetch PD sessions" });
    }
  },
);

// POST /api/teacher/pd-sessions — Create a PD session
router.post(
  "/teacher/pd-sessions",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;
      const { date, durationMinutes, topic, facilitator, notes, actionItems, relatedModuleSlugs } =
        req.body;

      if (!date || !durationMinutes || !topic) {
        return res.status(400).json({ error: "Date, duration, and topic are required" });
      }

      const session = await prisma.pDSession.create({
        data: {
          teacherId,
          date: new Date(date),
          durationMinutes: Number(durationMinutes),
          topic,
          facilitator: facilitator || null,
          notes: notes || null,
          actionItems: actionItems || null,
          relatedModuleSlugs: relatedModuleSlugs || null,
        },
      });

      res.status(201).json(session);
    } catch (err) {
      console.error("Error creating PD session:", err);
      res.status(500).json({ error: "Failed to create PD session" });
    }
  },
);

// PUT /api/teacher/pd-sessions/:id — Update a PD session
router.put(
  "/teacher/pd-sessions/:id",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.pDSession.findFirst({
        where: { id, teacherId },
      });

      if (!existing) {
        return res.status(404).json({ error: "PD session not found" });
      }

      const { date, durationMinutes, topic, facilitator, notes, actionItems, relatedModuleSlugs } =
        req.body;

      const session = await prisma.pDSession.update({
        where: { id },
        data: {
          ...(date && { date: new Date(date) }),
          ...(durationMinutes && { durationMinutes: Number(durationMinutes) }),
          ...(topic && { topic }),
          facilitator: facilitator ?? existing.facilitator,
          notes: notes ?? existing.notes,
          actionItems: actionItems ?? existing.actionItems,
          relatedModuleSlugs: relatedModuleSlugs ?? existing.relatedModuleSlugs,
        },
      });

      res.json(session);
    } catch (err) {
      console.error("Error updating PD session:", err);
      res.status(500).json({ error: "Failed to update PD session" });
    }
  },
);

// DELETE /api/teacher/pd-sessions/:id — Delete a PD session
router.delete(
  "/teacher/pd-sessions/:id",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.pDSession.findFirst({
        where: { id, teacherId },
      });

      if (!existing) {
        return res.status(404).json({ error: "PD session not found" });
      }

      await prisma.pDSession.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting PD session:", err);
      res.status(500).json({ error: "Failed to delete PD session" });
    }
  },
);

// GET /api/teacher/pd-sessions/hours — Get total PD hours
router.get(
  "/teacher/pd-sessions/hours",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;

      const result = await prisma.pDSession.aggregate({
        where: { teacherId, isTemplate: false },
        _sum: { durationMinutes: true },
        _count: { id: true },
      });

      res.json({
        totalMinutes: result._sum.durationMinutes || 0,
        totalHours: Math.round(((result._sum.durationMinutes || 0) / 60) * 10) / 10,
        sessionCount: result._count.id,
      });
    } catch (err) {
      console.error("Error calculating PD hours:", err);
      res.status(500).json({ error: "Failed to calculate PD hours" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// PD Reflections
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/teacher/pd-reflections — List teacher's reflections
router.get(
  "/teacher/pd-reflections",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;

      const reflections = await prisma.pDReflection.findMany({
        where: { teacherId },
        orderBy: { createdAt: "desc" },
        include: { pdSession: { select: { topic: true, date: true } } },
      });

      res.json(reflections);
    } catch (err) {
      console.error("Error fetching reflections:", err);
      res.status(500).json({ error: "Failed to fetch reflections" });
    }
  },
);

// POST /api/teacher/pd-reflections — Create a reflection
router.post(
  "/teacher/pd-reflections",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;
      const { pdSessionId, moduleSlug, whatWorked, whatToChange, studentObservations } = req.body;

      if (!pdSessionId) {
        return res.status(400).json({ error: "PD session ID is required" });
      }

      // Verify teacher owns the PD session
      const session = await prisma.pDSession.findFirst({
        where: { id: pdSessionId, teacherId },
      });

      if (!session) {
        return res.status(404).json({ error: "PD session not found" });
      }

      const reflection = await prisma.pDReflection.create({
        data: {
          teacherId,
          pdSessionId,
          moduleSlug: moduleSlug || null,
          whatWorked: whatWorked || null,
          whatToChange: whatToChange || null,
          studentObservations: studentObservations || null,
        },
      });

      res.status(201).json(reflection);
    } catch (err) {
      console.error("Error creating reflection:", err);
      res.status(500).json({ error: "Failed to create reflection" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Faculty Board
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/teacher/faculty-board — List posts (with optional moduleSlug filter)
router.get(
  "/teacher/faculty-board",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const { moduleSlug } = req.query;

      const where: Record<string, unknown> = { parentId: null }; // top-level posts only
      if (moduleSlug && moduleSlug !== "all") {
        where.moduleSlug = String(moduleSlug);
      }

      const posts = await prisma.facultyPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: { id: true, name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true } } },
          },
        },
      });

      res.json(posts);
    } catch (err) {
      console.error("Error fetching faculty posts:", err);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  },
);

// POST /api/teacher/faculty-board — Create a post
router.post(
  "/teacher/faculty-board",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const authorId = req.user!.id;
      const { title, content, moduleSlug } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      const post = await prisma.facultyPost.create({
        data: {
          authorId,
          title: title || null,
          content: content.trim(),
          moduleSlug: moduleSlug || null,
        },
        include: {
          author: { select: { id: true, name: true } },
          replies: true,
        },
      });

      res.status(201).json(post);
    } catch (err) {
      console.error("Error creating post:", err);
      res.status(500).json({ error: "Failed to create post" });
    }
  },
);

// POST /api/teacher/faculty-board/:id/reply — Reply to a post
router.post(
  "/teacher/faculty-board/:id/reply",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const authorId = req.user!.id;
      const parentId = req.params.id;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Verify parent post exists
      const parent = await prisma.facultyPost.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(404).json({ error: "Post not found" });
      }

      const reply = await prisma.facultyPost.create({
        data: {
          authorId,
          content: content.trim(),
          parentId,
          moduleSlug: parent.moduleSlug,
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });

      res.status(201).json(reply);
    } catch (err) {
      console.error("Error creating reply:", err);
      res.status(500).json({ error: "Failed to create reply" });
    }
  },
);

export default router;
