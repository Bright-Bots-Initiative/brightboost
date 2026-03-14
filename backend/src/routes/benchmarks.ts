import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireRole } from "../utils/auth";

const router = Router();

// ── Validation ──────────────────────────────────────────────────────────────

const assignSchema = z.object({
  templateId: z.string().min(1),
  kind: z.enum(["PRE", "POST"]),
});

const submitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string(), selectedIndex: z.number().int().min(0) }))
    .min(1),
  timeSpentS: z.number().int().min(0),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]),
});

// ── Teacher endpoints ───────────────────────────────────────────────────────

// GET /api/teacher/benchmark-templates — List available templates
router.get(
  "/teacher/benchmark-templates",
  requireRole("teacher"),
  async (_req: Request, res: Response) => {
    try {
      const templates = await prisma.benchmarkTemplate.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, gradeRange: true, subject: true, createdAt: true },
      });
      res.json(templates);
    } catch (err) {
      console.error("Error fetching benchmark templates:", err);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  },
);

// POST /api/teacher/courses/:courseId/benchmarks — Assign a benchmark
router.post(
  "/teacher/courses/:courseId/benchmarks",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
      });
      if (!course) return res.status(404).json({ error: "Course not found" });

      const parsed = assignSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const { templateId, kind } = parsed.data;

      // Verify template exists
      const template = await prisma.benchmarkTemplate.findUnique({ where: { id: templateId } });
      if (!template) return res.status(404).json({ error: "Template not found" });

      const assignment = await prisma.benchmarkAssignment.create({
        data: { courseId: course.id, templateId, kind },
      });
      res.status(201).json(assignment);
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ error: "This benchmark is already assigned for this course and kind" });
      }
      console.error("Error assigning benchmark:", err);
      res.status(500).json({ error: "Failed to assign benchmark" });
    }
  },
);

// GET /api/teacher/courses/:courseId/benchmarks — List assignments + summary
router.get(
  "/teacher/courses/:courseId/benchmarks",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
        include: { enrollments: true },
      });
      if (!course) return res.status(404).json({ error: "Course not found" });

      const assignments = await prisma.benchmarkAssignment.findMany({
        where: { courseId: course.id },
        include: {
          template: { select: { id: true, title: true, gradeRange: true, subject: true } },
          attempts: { select: { score: true, totalQuestions: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const enrolledCount = course.enrollments.length;

      const result = assignments.map((a) => {
        const completedCount = a.attempts.length;
        const avgScore =
          completedCount > 0
            ? Math.round((a.attempts.reduce((s, t) => s + t.score, 0) / completedCount) * 10) / 10
            : null;
        const avgPercent =
          completedCount > 0 && a.attempts[0]?.totalQuestions > 0
            ? Math.round(
                (a.attempts.reduce((s, t) => s + t.score / t.totalQuestions, 0) /
                  completedCount) *
                  1000,
              ) / 10
            : null;

        return {
          id: a.id,
          kind: a.kind,
          status: a.status,
          template: a.template,
          enrolledCount,
          completedCount,
          avgScore,
          avgPercent,
          createdAt: a.createdAt,
        };
      });

      res.json(result);
    } catch (err) {
      console.error("Error fetching benchmarks:", err);
      res.status(500).json({ error: "Failed to fetch benchmarks" });
    }
  },
);

// PATCH /api/teacher/courses/:courseId/benchmarks/:id — Update status
router.patch(
  "/teacher/courses/:courseId/benchmarks/:id",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
      });
      if (!course) return res.status(404).json({ error: "Course not found" });

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const updated = await prisma.benchmarkAssignment.updateMany({
        where: { id: req.params.id, courseId: course.id },
        data: { status: parsed.data.status },
      });

      if (updated.count === 0) return res.status(404).json({ error: "Assignment not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("Error updating benchmark:", err);
      res.status(500).json({ error: "Failed to update benchmark" });
    }
  },
);

// ── Student endpoints ───────────────────────────────────────────────────────

// GET /api/student/courses/:courseId/benchmarks — Available benchmarks
router.get(
  "/student/courses/:courseId/benchmarks",
  requireRole("student"),
  async (req: Request, res: Response) => {
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user!.id, courseId: req.params.courseId },
      });
      if (!enrollment) return res.status(403).json({ error: "Not enrolled in this course" });

      const assignments = await prisma.benchmarkAssignment.findMany({
        where: { courseId: req.params.courseId, status: "OPEN" },
        include: {
          template: { select: { id: true, title: true, gradeRange: true, subject: true } },
          attempts: {
            where: { studentId: req.user!.id },
            select: { id: true, score: true, totalQuestions: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Check PRE completion for POST lock logic
      const preAttemptsByTemplate = new Map<string, boolean>();
      for (const a of assignments) {
        if (a.kind === "PRE" && a.attempts.length > 0) {
          preAttemptsByTemplate.set(a.templateId, true);
        }
      }

      const result = assignments.map((a) => {
        const myAttempt = a.attempts[0] ?? null;
        const locked = a.kind === "POST" && !preAttemptsByTemplate.get(a.templateId);
        return {
          id: a.id,
          kind: a.kind,
          template: a.template,
          completed: !!myAttempt,
          attempt: myAttempt,
          locked,
        };
      });

      res.json(result);
    } catch (err) {
      console.error("Error fetching student benchmarks:", err);
      res.status(500).json({ error: "Failed to fetch benchmarks" });
    }
  },
);

// GET /api/student/benchmarks/:assignmentId — Get questions (sanitized, no answer key)
router.get(
  "/student/benchmarks/:assignmentId",
  requireRole("student"),
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.benchmarkAssignment.findUnique({
        where: { id: req.params.assignmentId },
        include: { template: true, course: { include: { enrollments: true } } },
      });

      if (!assignment) return res.status(404).json({ error: "Assignment not found" });
      if (assignment.status !== "OPEN") return res.status(400).json({ error: "Benchmark is closed" });

      const enrolled = assignment.course.enrollments.some((e) => e.studentId === req.user!.id);
      if (!enrolled) return res.status(403).json({ error: "Not enrolled in this course" });

      // Check for existing attempt
      const existing = await prisma.benchmarkAttempt.findUnique({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.user!.id } },
      });
      if (existing) return res.status(409).json({ error: "Already completed", attempt: existing });

      // POST lock: require PRE completion first
      if (assignment.kind === "POST") {
        const preAssignment = await prisma.benchmarkAssignment.findFirst({
          where: { courseId: assignment.courseId, templateId: assignment.templateId, kind: "PRE" },
        });
        if (preAssignment) {
          const preAttempt = await prisma.benchmarkAttempt.findUnique({
            where: { assignmentId_studentId: { assignmentId: preAssignment.id, studentId: req.user!.id } },
          });
          if (!preAttempt) return res.status(403).json({ error: "Complete the PRE benchmark first" });
        }
      }

      // Sanitize questions — strip correctIndex
      const raw = assignment.template.questions as any[];
      const questions = raw.map((q: any) => ({
        id: q.id,
        prompt: q.prompt,
        choices: q.choices,
        skillTag: q.skillTag,
      }));

      res.json({
        assignmentId: assignment.id,
        kind: assignment.kind,
        templateTitle: assignment.template.title,
        questions,
      });
    } catch (err) {
      console.error("Error fetching benchmark questions:", err);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  },
);

// POST /api/student/benchmarks/:assignmentId/submit — Submit answers
router.post(
  "/student/benchmarks/:assignmentId/submit",
  requireRole("student"),
  async (req: Request, res: Response) => {
    try {
      const assignment = await prisma.benchmarkAssignment.findUnique({
        where: { id: req.params.assignmentId },
        include: { template: true, course: { include: { enrollments: true } } },
      });

      if (!assignment) return res.status(404).json({ error: "Assignment not found" });
      if (assignment.status !== "OPEN") return res.status(400).json({ error: "Benchmark is closed" });

      const enrolled = assignment.course.enrollments.some((e) => e.studentId === req.user!.id);
      if (!enrolled) return res.status(403).json({ error: "Not enrolled in this course" });

      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const { answers: rawAnswers, timeSpentS } = parsed.data;
      const questions = assignment.template.questions as any[];

      if (questions.length === 0) {
        return res.status(400).json({ error: "Benchmark has no questions" });
      }

      // Build answer map for quick lookup
      const qMap = new Map(questions.map((q: any) => [q.id, q]));

      // Score and enrich answers
      let score = 0;
      const enrichedAnswers = rawAnswers.map((a) => {
        const q = qMap.get(a.questionId) as any;
        const isCorrect = q ? a.selectedIndex === q.correctIndex : false;
        if (isCorrect) score++;
        return {
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
          isCorrect,
          skillTag: q?.skillTag ?? "unknown",
        };
      });

      const attempt = await prisma.benchmarkAttempt.create({
        data: {
          assignmentId: assignment.id,
          studentId: req.user!.id,
          answers: enrichedAnswers,
          score,
          totalQuestions: questions.length,
          timeSpentS,
        },
      });

      res.status(201).json(attempt);
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ error: "Already submitted" });
      }
      console.error("Error submitting benchmark:", err);
      res.status(500).json({ error: "Failed to submit benchmark" });
    }
  },
);

export default router;
