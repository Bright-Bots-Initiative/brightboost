import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import {
  CREATION_TYPES,
  validateCreationContent,
  type CreationType,
} from "../services/creationContent";

// Phase 0 — Creations CRUD (the "kid makes something" foundation).
//
// Authorization model (child-safety critical):
//   - Writes (POST/PATCH) are AUTHOR-ONLY and student-only. A kid creates and
//     edits their own creation; nobody else can write it. `SHARED` (viewable
//     while unfinished) is therefore always kid-initiated by construction —
//     adults have no endpoint to change a kid's status.
//   - Reads (GET ?courseId=) are GROUP-SCOPED. A requester must belong to the
//     group (teacher/owner, admin, or enrolled student). The gallery exposes
//     only SHARED|COMPLETE creations, plus the requester's OWN drafts. Author
//     identity is exposed as a first name only — never email.

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createCreationSchema = z.object({
  courseId: z.string().min(1),
  type: z.enum(CREATION_TYPES),
  title: z.string().max(120).optional(),
  content: z.unknown(),
});

const patchCreationSchema = z
  .object({
    title: z.string().max(120).nullable().optional(),
    content: z.unknown().optional(),
    status: z.enum(["IN_PROGRESS", "SHARED", "COMPLETE"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "no fields to update",
  });

const listQuerySchema = z.object({
  courseId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Expose a first name / display name only — never a full name or email. */
function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * True if the user belongs to the group (Course). Teachers/admins by ownership,
 * students by enrollment. This is the single group-boundary gate for reads.
 */
async function isGroupMember(
  userId: string,
  role: string,
  courseId: string,
): Promise<boolean> {
  if (role === "admin") return true;

  if (role === "teacher") {
    const course = await prisma.course.findFirst({
      where: { id: courseId, teacherId: userId },
      select: { id: true },
    });
    return !!course;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId } },
    select: { id: true },
  });
  return !!enrollment;
}

type CreationDTO = {
  id: string;
  courseId: string;
  type: string;
  title: string | null;
  status: string;
  encouragements: number;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(c: {
  id: string;
  courseId: string;
  type: string;
  title: string | null;
  status: string;
  encouragements?: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author?: { name: string | null } | null;
}): CreationDTO {
  return {
    id: c.id,
    courseId: c.courseId,
    type: c.type,
    title: c.title,
    status: c.status,
    encouragements: c.encouragements ?? 0,
    authorId: c.authorId,
    authorName: firstName(c.author?.name),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// POST /creations — author (kid) creates a creation (status: IN_PROGRESS)
// ---------------------------------------------------------------------------

router.post(
  "/creations",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const parsed = createCreationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { courseId, type, title, content } = parsed.data;

    // Author must belong to the group they are publishing into.
    const enrolled = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: req.user!.id, courseId },
      },
      select: { id: true },
    });
    if (!enrolled) {
      return res.status(403).json({ error: "not a member of this group" });
    }

    const check = validateCreationContent(type as CreationType, content);
    if (!check.ok) {
      return res.status(422).json({ error: check.error });
    }

    const creation = await prisma.creation.create({
      data: {
        authorId: req.user!.id,
        courseId,
        type,
        title: title ?? null,
        content: content as object,
        // status defaults to IN_PROGRESS (private draft) at the DB layer.
      },
      include: { author: { select: { name: true } } },
    });

    return res.status(201).json(toDTO(creation));
  },
);

// ---------------------------------------------------------------------------
// PATCH /creations/:id — author-only edit (title/content/status)
// ---------------------------------------------------------------------------

router.patch(
  "/creations/:id",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const parsed = patchCreationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const existing = await prisma.creation.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, type: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "creation not found" });
    }
    // Author-only: even another enrolled kid cannot edit someone else's work.
    if (existing.authorId !== req.user!.id) {
      return res.status(403).json({ error: "not the author" });
    }

    const data: {
      title?: string | null;
      content?: object;
      status?: "IN_PROGRESS" | "SHARED" | "COMPLETE";
    } = {};

    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.content !== undefined) {
      const check = validateCreationContent(
        existing.type as CreationType,
        parsed.data.content,
      );
      if (!check.ok) {
        return res.status(422).json({ error: check.error });
      }
      data.content = parsed.data.content as object;
    }

    const updated = await prisma.creation.update({
      where: { id: existing.id },
      data,
      include: { author: { select: { name: true } } },
    });

    return res.json(toDTO(updated));
  },
);

// ---------------------------------------------------------------------------
// GET /creations?courseId= — group-scoped gallery read
// ---------------------------------------------------------------------------

router.get(
  "/creations",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "courseId is required" });
    }
    const { courseId } = parsed.data;

    const member = await isGroupMember(
      req.user!.id,
      req.user!.role,
      courseId,
    );
    if (!member) {
      return res.status(403).json({ error: "not a member of this group" });
    }

    // Gallery shows SHARED|COMPLETE to the group; the author additionally sees
    // their own IN_PROGRESS drafts.
    const creations = await prisma.creation.findMany({
      where: {
        courseId,
        OR: [
          { status: { in: ["SHARED", "COMPLETE"] } },
          { authorId: req.user!.id },
        ],
      },
      include: { author: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(creations.map(toDTO));
  },
);

// ---------------------------------------------------------------------------
// GET /creations/:id — single creation WITH content (to play it). Group-scoped.
// ---------------------------------------------------------------------------

router.get(
  "/creations/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const creation = await prisma.creation.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { name: true } } },
    });
    if (!creation) {
      return res.status(404).json({ error: "creation not found" });
    }

    const member = await isGroupMember(
      req.user!.id,
      req.user!.role,
      creation.courseId,
    );
    if (!member) {
      return res.status(403).json({ error: "not a member of this group" });
    }

    // Visible only if shared/complete to the group, or the requester is author.
    const visible =
      creation.status === "SHARED" ||
      creation.status === "COMPLETE" ||
      creation.authorId === req.user!.id;
    if (!visible) {
      return res.status(403).json({ error: "creation is not shared" });
    }

    // Single-get includes content so the creation can actually be played.
    return res.json({ ...toDTO(creation), content: creation.content });
  },
);

// ---------------------------------------------------------------------------
// POST /creations/:id/encourage — adult-only, text-free "give a boost".
// Teachers/parents (teacher role) or admins, scoped to their group. No kid
// reactions in Phase 0, so this is the only write a non-author can make.
// ---------------------------------------------------------------------------

router.post(
  "/creations/:id/encourage",
  requireAuth,
  async (req: Request, res: Response) => {
    if (req.user!.role !== "teacher" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "only adults can encourage" });
    }

    const creation = await prisma.creation.findUnique({
      where: { id: req.params.id },
      select: { id: true, courseId: true },
    });
    if (!creation) {
      return res.status(404).json({ error: "creation not found" });
    }

    const member = await isGroupMember(
      req.user!.id,
      req.user!.role,
      creation.courseId,
    );
    if (!member) {
      return res.status(403).json({ error: "not a member of this group" });
    }

    const updated = await prisma.creation.update({
      where: { id: creation.id },
      data: { encouragements: { increment: 1 } },
      select: { encouragements: true },
    });

    return res.json({ encouragements: updated.encouragements });
  },
);

export default router;
