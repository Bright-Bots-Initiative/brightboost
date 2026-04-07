/**
 * Module Catalog & Class Assignment routes.
 *
 * Provides grade-band-filtered module browsing and teacher assignment
 * management for the upper-elementary expansion.
 */
import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ── Validation ──────────────────────────────────────────────────────────────

const bandSchema = z.enum(["k2", "g3_5"]);

const assignModuleSchema = z.object({
  moduleVariantId: z.string().min(1),
  orderIndex: z.number().int().min(0).optional(),
  isLocked: z.boolean().optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

const updateAssignmentSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  isLocked: z.boolean().optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

const updateCourseBandSchema = z.object({
  gradeBand: bandSchema,
});

// ── Public: list module families ────────────────────────────────────────────

router.get(
  "/module-catalog/families",
  requireAuth,
  async (_req: Request, res: Response) => {
    const families = await prisma.moduleFamily.findMany({
      include: {
        variants: {
          where: { status: "active" },
          select: { id: true, band: true, version: true, title: true, subtitle: true, status: true },
        },
      },
      orderBy: { key: "asc" },
    });
    res.json(families);
  },
);

// ── Public: list module variants by band ────────────────────────────────────

router.get(
  "/module-catalog/variants",
  requireAuth,
  async (req: Request, res: Response) => {
    const band = typeof req.query.band === "string" ? req.query.band : undefined;
    const where: any = { status: "active" };
    if (band) where.band = band;

    const variants = await prisma.moduleVariant.findMany({
      where,
      include: { family: { select: { key: true, title: true, iconEmoji: true } } },
      orderBy: [{ family: { key: "asc" } }, { band: "asc" }],
    });
    res.json(variants);
  },
);

// ── Teacher: update course grade band ───────────────────────────────────────

router.put(
  "/teacher/courses/:courseId/band",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = updateCourseBandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { gradeBand: parsed.data.gradeBand },
    });

    res.json({ id: updated.id, gradeBand: updated.gradeBand });
  },
);

// ── Teacher: list assignments for a class ───────────────────────────────────

router.get(
  "/teacher/courses/:courseId/module-assignments",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const assignments = await prisma.classModuleAssignment.findMany({
      where: { courseId: course.id },
      include: {
        moduleVariant: {
          include: { family: { select: { key: true, title: true, iconEmoji: true } } },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    res.json({ gradeBand: course.gradeBand, assignments });
  },
);

// ── Teacher: assign a module variant to a class ─────────────────────────────

router.post(
  "/teacher/courses/:courseId/module-assignments",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = assignModuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Verify the variant exists and matches the class band
    const variant = await prisma.moduleVariant.findUnique({
      where: { id: parsed.data.moduleVariantId },
    });
    if (!variant) {
      return res.status(404).json({ error: "Module variant not found" });
    }
    if (variant.band !== course.gradeBand) {
      return res.status(400).json({ error: `Module band "${variant.band}" does not match class band "${course.gradeBand}"` });
    }

    // Auto-compute order index if not provided
    let orderIndex = parsed.data.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await prisma.classModuleAssignment.aggregate({
        where: { courseId: course.id },
        _max: { orderIndex: true },
      });
      orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    }

    const assignment = await prisma.classModuleAssignment.upsert({
      where: {
        courseId_moduleVariantId: { courseId: course.id, moduleVariantId: variant.id },
      },
      create: {
        courseId: course.id,
        moduleVariantId: variant.id,
        orderIndex,
        isLocked: parsed.data.isLocked ?? false,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
      update: {
        orderIndex,
        isLocked: parsed.data.isLocked ?? false,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
      include: {
        moduleVariant: {
          include: { family: { select: { key: true, title: true } } },
        },
      },
    });

    res.status(201).json(assignment);
  },
);

// ── Teacher: update an assignment ───────────────────────────────────────────

router.put(
  "/teacher/courses/:courseId/module-assignments/:assignmentId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = updateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const assignment = await prisma.classModuleAssignment.findFirst({
      where: { id: req.params.assignmentId, course: { teacherId: req.user!.id } },
    });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const updated = await prisma.classModuleAssignment.update({
      where: { id: assignment.id },
      data: {
        orderIndex: parsed.data.orderIndex,
        isLocked: parsed.data.isLocked,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : parsed.data.dueAt === null ? null : undefined,
      },
    });

    res.json(updated);
  },
);

// ── Teacher: remove an assignment ───────────────────────────────────────────

router.delete(
  "/teacher/courses/:courseId/module-assignments/:assignmentId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const assignment = await prisma.classModuleAssignment.findFirst({
      where: { id: req.params.assignmentId, course: { teacherId: req.user!.id } },
    });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    await prisma.classModuleAssignment.delete({ where: { id: assignment.id } });
    res.json({ deleted: true });
  },
);

// ── Student: get assigned modules by enrollment ─────────────────────────────

router.get(
  "/student/assigned-modules",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        course: {
          include: {
            moduleAssignments: {
              where: { isLocked: false },
              include: {
                moduleVariant: {
                  include: { family: { select: { key: true, title: true, iconEmoji: true } } },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    // Group by class for clarity
    const result = enrollments.map((e) => ({
      classId: e.course.id,
      className: e.course.name,
      gradeBand: e.course.gradeBand,
      modules: e.course.moduleAssignments.map((a) => ({
        assignmentId: a.id,
        variantId: a.moduleVariant.id,
        familyKey: a.moduleVariant.family.key,
        familyTitle: a.moduleVariant.family.title,
        familyIcon: a.moduleVariant.family.iconEmoji,
        band: a.moduleVariant.band,
        title: a.moduleVariant.title,
        subtitle: a.moduleVariant.subtitle,
        moduleSlug: a.moduleVariant.moduleSlug,
        contentConfig: a.moduleVariant.contentConfig,
        orderIndex: a.orderIndex,
        dueAt: a.dueAt,
      })),
    }));

    res.json(result);
  },
);

// ── Helper ──────────────────────────────────────────────────────────────────

export default router;
