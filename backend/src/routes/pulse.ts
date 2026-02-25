import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const submitPulseSchema = z.object({
  courseId: z.string().min(1).max(50),
  kind: z.enum(["PRE", "POST"]),
  score: z.number().int().min(1).max(5),
  answers: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Submit pulse response (student)
// ---------------------------------------------------------------------------

router.post(
  "/pulse",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = submitPulseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    // Verify student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user!.id,
          courseId: parsed.data.courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ error: "Not enrolled in this course" });
    }

    const pulse = await prisma.pulseResponse.create({
      data: {
        respondentId: req.user!.id,
        courseId: parsed.data.courseId,
        kind: parsed.data.kind,
        score: parsed.data.score,
        answers: parsed.data.answers ?? undefined,
      },
    });

    res.status(201).json(pulse);
  },
);

// ---------------------------------------------------------------------------
// Teacher: pulse summary for a course
// ---------------------------------------------------------------------------

router.get(
  "/teacher/courses/:courseId/pulse/summary",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const preResponses = await prisma.pulseResponse.findMany({
      where: { courseId: req.params.courseId, kind: "PRE" },
      select: { score: true },
    });

    const postResponses = await prisma.pulseResponse.findMany({
      where: { courseId: req.params.courseId, kind: "POST" },
      select: { score: true },
    });

    const avgPre =
      preResponses.length > 0
        ? Math.round(
            (preResponses.reduce((s, r) => s + r.score, 0) /
              preResponses.length) *
              10,
          ) / 10
        : null;

    const avgPost =
      postResponses.length > 0
        ? Math.round(
            (postResponses.reduce((s, r) => s + r.score, 0) /
              postResponses.length) *
              10,
          ) / 10
        : null;

    const delta =
      avgPre !== null && avgPost !== null
        ? Math.round((avgPost - avgPre) * 10) / 10
        : null;

    res.json({
      preCount: preResponses.length,
      postCount: postResponses.length,
      avgPre,
      avgPost,
      delta,
    });
  },
);

export default router;
