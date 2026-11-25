import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import {
  creationCreateLimiter,
  creationUpdateLimiter,
} from "../utils/security";
import {
  MachineRequestError,
  machineDTO,
  machineFields,
  saveMachine,
  shelfQuery,
} from "../services/greatWorkMachines";

const router = Router();
const course = z.string().min(1).max(128);
const machineId = z.string().uuid();
const query = z.object({ courseId: course }).strict();
const write = z
  .object({
    courseId: course,
    expectedRevision: z
      .number()
      .int()
      .min(1)
      .max(Number.MAX_SAFE_INTEGER - 1)
      .nullable(),
    parentCreationId: machineId.optional(),
    content: z.unknown(),
  })
  .strict();

router.use(requireAuth, requireRole("student"));

router.get("/", async (req, res) => {
  const parsed = query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "invalid_course" });
  const studentId = req.user!.id;
  const { courseId } = parsed.data;
  const member = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
  if (!member) return res.status(403).json({ error: "not_enrolled" });
  const rows = await prisma.creation.findMany({
    where: shelfQuery(studentId, courseId),
    select: machineFields,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return res.json({ machines: rows.map(machineDTO) });
});

router.get("/:id", async (req, res) => {
  const parsed = query.safeParse(req.query);
  const id = machineId.safeParse(req.params.id);
  if (!parsed.success || !id.success)
    return res.status(400).json({ error: "invalid_machine_request" });
  const row = await prisma.creation.findFirst({
    where: { ...shelfQuery(req.user!.id, parsed.data.courseId), id: id.data },
    select: machineFields,
  });
  if (!row) return res.status(404).json({ error: "machine_not_found" });
  return res.json(machineDTO(row));
});

router.put(
  "/:id",
  (req, res, next) =>
    (req.body?.expectedRevision === null
      ? creationCreateLimiter
      : creationUpdateLimiter)(req, res, next),
  async (req, res) => {
    const id = machineId.safeParse(req.params.id);
    const parsed = write.safeParse(req.body);
    if (!parsed.success || !id.success)
      return res.status(400).json({ error: "invalid_machine_request" });
    try {
      const { machine, created } = await prisma.$transaction((tx) =>
        saveMachine(tx, {
          ...parsed.data,
          content: parsed.data.content,
          id: id.data,
          studentId: req.user!.id,
        }),
      );
      return res.status(created ? 201 : 200).json(machine);
    } catch (error) {
      if (error instanceof MachineRequestError)
        return res.status(error.status).json({ error: error.code });
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      )
        return res.status(409).json({ error: "machine_revision_conflict" });
      throw error;
    }
  },
);

export default router;
