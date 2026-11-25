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
          select: {
            id: true,
            band: true,
            version: true,
            title: true,
            subtitle: true,
            status: true,
          },
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
    const band =
      typeof req.query.band === "string" ? req.query.band : undefined;
    const where: any = { status: "active" };
    if (band) where.band = band;

    const variants = await prisma.moduleVariant.findMany({
      where,
      include: {
        family: { select: { key: true, title: true, iconEmoji: true } },
      },
      orderBy: [{ family: { key: "asc" } }, { band: "asc" }],
    });
    if (req.query.playable === "true") {
      const slugs = variants.flatMap((v) =>
        v.moduleSlug ? [v.moduleSlug] : [],
      );
      const modules = await prisma.module.findMany({
        where: { slug: { in: slugs }, published: true },
        select: { slug: true },
      });
      const playable = new Set(modules.map((m) => m.slug));
      return res.json(
        variants
          .filter((v) => v.moduleSlug && playable.has(v.moduleSlug))
          .map(({ id, title, moduleSlug }) => ({ id, title, moduleSlug })),
      );
    }
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
          include: {
            family: { select: { key: true, title: true, iconEmoji: true } },
          },
        },
      },
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
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

    const input = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      // The same parent lock serializes appends and moves, including when
      // the class is still empty (there is no assignment row to lock).
      const [course] = await tx.$queryRaw<
        { id: string; gradeBand: string }[]
      >`SELECT "id","gradeBand" FROM "Course" WHERE "id"=${req.params.courseId} AND "teacherId"=${req.user!.id} FOR UPDATE`;
      if (!course) return { status: 404, body: { error: "Course not found" } };
      const variant = await tx.moduleVariant.findUnique({
        where: { id: input.moduleVariantId },
      });
      if (!variant)
        return { status: 404, body: { error: "Module variant not found" } };
      if (variant.band !== course.gradeBand)
        return { status: 400, body: { error: "module_band_mismatch" } };
      if (
        variant.status !== "active" ||
        !variant.moduleSlug ||
        !(await tx.module.findUnique({
          where: { slug: variant.moduleSlug, published: true },
          select: { id: true },
        }))
      ) {
        return { status: 409, body: { error: "module_not_playable" } };
      }
      const last = await tx.classModuleAssignment.aggregate({
        where: { courseId: course.id },
        _max: { orderIndex: true },
      });
      const dueAt = input.dueAt ? new Date(input.dueAt) : input.dueAt;
      const assignment = await tx.classModuleAssignment.upsert({
        where: {
          courseId_moduleVariantId: {
            courseId: course.id,
            moduleVariantId: variant.id,
          },
        },
        create: {
          courseId: course.id,
          moduleVariantId: variant.id,
          orderIndex: input.orderIndex ?? (last._max.orderIndex ?? -1) + 1,
          isLocked: input.isLocked ?? false,
          dueAt,
        },
        // A retry with no options must not move, unlock, or undate an existing item.
        update: {
          orderIndex: input.orderIndex,
          isLocked: input.isLocked,
          dueAt,
        },
        include: {
          moduleVariant: {
            include: { family: { select: { key: true, title: true } } },
          },
        },
      });
      return { status: 201, body: assignment };
    });
    res.status(result.status).json(result.body);
  },
);

// Move the item one position in the persisted order. Serialize competing
// moves and commit both sides together, including legacy tied index values.
router.post(
  "/teacher/courses/:courseId/module-assignments/:assignmentId/move",
  requireAuth,
  requireRole("teacher"),
  async (req, res) => {
    const direction = z.enum(["up", "down"]).safeParse(req.body.direction);
    if (!direction.success)
      return res.status(400).json({ error: "invalid_direction" });
    const result = await prisma.$transaction(async (tx) => {
      const courses = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "Course" WHERE "id"=${req.params.courseId} AND "teacherId"=${req.user!.id} FOR UPDATE`;
      if (!courses.length) return false;
      const rows = await tx.classModuleAssignment.findMany({
        where: { courseId: req.params.courseId },
        orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
        select: { id: true, orderIndex: true },
      });
      const from = rows.findIndex((row) => row.id === req.params.assignmentId);
      if (from < 0) return false;
      const to = from + (direction.data === "up" ? -1 : 1);
      if (to >= 0 && to < rows.length) {
        [rows[from], rows[to]] = [rows[to], rows[from]];
        for (const [i, row] of rows.entries())
          if (row.orderIndex !== i)
            await tx.classModuleAssignment.update({
              where: { id: row.id },
              data: { orderIndex: i },
            });
      }
      return true;
    });
    return result
      ? res.json({ moved: true })
      : res.status(404).json({ error: "Assignment not found" });
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
      where: {
        id: req.params.assignmentId,
        courseId: req.params.courseId,
        course: { teacherId: req.user!.id },
      },
    });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const updated = await prisma.classModuleAssignment.update({
      where: { id: assignment.id },
      data: {
        orderIndex: parsed.data.orderIndex,
        isLocked: parsed.data.isLocked,
        dueAt: parsed.data.dueAt
          ? new Date(parsed.data.dueAt)
          : parsed.data.dueAt === null
            ? null
            : undefined,
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
      where: {
        id: req.params.assignmentId,
        courseId: req.params.courseId,
        course: { teacherId: req.user!.id },
      },
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
              where: { isLocked: false, moduleVariant: { status: "active" } },
              include: {
                moduleVariant: {
                  include: {
                    family: {
                      select: { key: true, title: true, iconEmoji: true },
                    },
                  },
                },
              },
              orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
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
      modules: e.course.moduleAssignments
        .filter((a) => a.moduleVariant.band === e.course.gradeBand)
        .map((a) => ({
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
