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

// GET /api/teacher/courses/:courseId/benchmarks/growth — Growth report
// Template pairing: uses ?templateId if provided; otherwise auto-selects the
// most recently assigned template that has at least one PRE or POST assignment.
// Retake handling: @@unique(assignmentId, studentId) enforces one attempt per
// student per assignment, so there is always exactly 0 or 1 attempt per kind.
router.get(
  "/teacher/courses/:courseId/benchmarks/growth",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
        include: {
          enrollments: { include: { student: { select: { id: true, name: true } } } },
        },
      });
      if (!course) return res.status(404).json({ error: "Course not found" });

      // Resolve template
      let templateId = req.query.templateId ? String(req.query.templateId) : null;

      if (!templateId) {
        // Auto-select: most recently assigned template for this course
        const latest = await prisma.benchmarkAssignment.findFirst({
          where: { courseId: course.id },
          orderBy: { createdAt: "desc" },
          select: { templateId: true },
        });
        if (!latest) {
          return res.json({
            templateId: null, templateTitle: null,
            preAssignmentId: null, postAssignmentId: null,
            hasPreAssignment: false, hasPostAssignment: false,
            hasPreAttempts: false, hasPostAttempts: false,
            classSummary: null, students: [], skills: [],
          });
        }
        templateId = latest.templateId;
      }

      const template = await prisma.benchmarkTemplate.findUnique({ where: { id: templateId } });
      if (!template) return res.status(404).json({ error: "Template not found" });

      // Find PRE and POST assignments for this template+course
      const assignments = await prisma.benchmarkAssignment.findMany({
        where: { courseId: course.id, templateId },
        include: {
          attempts: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
      });

      const preAssignment = assignments.find((a) => a.kind === "PRE") ?? null;
      const postAssignment = assignments.find((a) => a.kind === "POST") ?? null;

      const preAttempts = preAssignment?.attempts ?? [];
      const postAttempts = postAssignment?.attempts ?? [];

      const hasPreAssignment = !!preAssignment;
      const hasPostAssignment = !!postAssignment;
      const hasPreAttempts = preAttempts.length > 0;
      const hasPostAttempts = postAttempts.length > 0;

      // Build per-student maps (one attempt per student per kind, enforced by DB)
      const preByStudent = new Map(preAttempts.map((a) => [a.studentId, a]));
      const postByStudent = new Map(postAttempts.map((a) => [a.studentId, a]));

      const enrolledCount = course.enrollments.length;

      // Class summary
      const prePercents = preAttempts.map((a) => (a.score / a.totalQuestions) * 100);
      const postPercents = postAttempts.map((a) => (a.score / a.totalQuestions) * 100);
      const avgPre = prePercents.length > 0 ? Math.round(prePercents.reduce((s, v) => s + v, 0) / prePercents.length * 10) / 10 : null;
      const avgPost = postPercents.length > 0 ? Math.round(postPercents.reduce((s, v) => s + v, 0) / postPercents.length * 10) / 10 : null;
      const delta = avgPre !== null && avgPost !== null ? Math.round((avgPost - avgPre) * 10) / 10 : null;

      // Student detail — sorted by name ascending
      const students = course.enrollments
        .map((e) => {
          const pre = preByStudent.get(e.studentId);
          const post = postByStudent.get(e.studentId);
          const totalQ = pre?.totalQuestions ?? post?.totalQuestions ?? 0;
          const prePercent = pre && totalQ > 0 ? Math.round((pre.score / totalQ) * 1000) / 10 : null;
          const postPercent = post && totalQ > 0 ? Math.round((post.score / totalQ) * 1000) / 10 : null;
          const studentDelta = prePercent !== null && postPercent !== null ? Math.round((postPercent - prePercent) * 10) / 10 : null;
          return {
            id: e.studentId,
            name: e.student.name,
            preScore: pre?.score ?? null,
            postScore: post?.score ?? null,
            totalQuestions: totalQ,
            prePercent,
            postPercent,
            delta: studentDelta,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // Skill breakdown — aggregate isCorrect by skillTag across PRE and POST
      type SkillBucket = { preCorrect: number; preTotal: number; postCorrect: number; postTotal: number };
      const skillMap = new Map<string, SkillBucket>();

      const addToSkill = (answers: any[], kind: "pre" | "post") => {
        for (const a of answers) {
          const tag = a.skillTag ?? "unknown";
          const bucket = skillMap.get(tag) ?? { preCorrect: 0, preTotal: 0, postCorrect: 0, postTotal: 0 };
          if (kind === "pre") {
            bucket.preTotal++;
            if (a.isCorrect) bucket.preCorrect++;
          } else {
            bucket.postTotal++;
            if (a.isCorrect) bucket.postCorrect++;
          }
          skillMap.set(tag, bucket);
        }
      };

      for (const a of preAttempts) addToSkill(a.answers as any[], "pre");
      for (const a of postAttempts) addToSkill(a.answers as any[], "post");

      const skills = [...skillMap.entries()].map(([skillTag, b]) => {
        const preRate = b.preTotal > 0 ? Math.round((b.preCorrect / b.preTotal) * 1000) / 10 : null;
        const postRate = b.postTotal > 0 ? Math.round((b.postCorrect / b.postTotal) * 1000) / 10 : null;
        const skillDelta = preRate !== null && postRate !== null ? Math.round((postRate - preRate) * 10) / 10 : null;
        return { skillTag, preCorrectRate: preRate, postCorrectRate: postRate, delta: skillDelta, questionCount: (new Set([...preAttempts.flatMap((a) => (a.answers as any[]).filter((ans: any) => ans.skillTag === skillTag).map((ans: any) => ans.questionId)), ...postAttempts.flatMap((a) => (a.answers as any[]).filter((ans: any) => ans.skillTag === skillTag).map((ans: any) => ans.questionId))])).size };
      });

      res.json({
        templateId,
        templateTitle: template.title,
        preAssignmentId: preAssignment?.id ?? null,
        postAssignmentId: postAssignment?.id ?? null,
        hasPreAssignment,
        hasPostAssignment,
        hasPreAttempts,
        hasPostAttempts,
        classSummary: {
          enrolledCount,
          preCompleted: preAttempts.length,
          postCompleted: postAttempts.length,
          avgPrePercent: avgPre,
          avgPostPercent: avgPost,
          delta,
        },
        students,
        skills,
      });
    } catch (err) {
      console.error("Error fetching benchmark growth:", err);
      res.status(500).json({ error: "Failed to fetch growth report" });
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
