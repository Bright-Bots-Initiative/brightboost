import type { Prisma } from "@prisma/client";
import { MACHINE_TYPE, machineDTO, machineFields } from "./greatWorkMachines";

export type GreatWorkSaveProof = { id: string; revision: number };

/** Finish a saved machine once. Reopening the studio and saving drafts never call this. */
export async function finishGreatWork(
  tx: Prisma.TransactionClient,
  input: {
    studentId: string;
    activityId: string;
    moduleSlug: string;
    lessonId: string;
    proof: GreatWorkSaveProof;
    timeSpentS: number;
    attemptId?: string;
  },
) {
  const {
    studentId,
    activityId,
    moduleSlug,
    lessonId,
    proof,
    timeSpentS,
    attemptId,
  } = input;
  const row = await tx.creation.findFirst({
    where: {
      id: proof.id,
      authorId: studentId,
      type: MACHINE_TYPE,
      course: { enrollments: { some: { studentId } } },
    },
    select: machineFields,
  });
  if (!row) return null;
  const machine = machineDTO(row);
  if (
    proof.revision !== machine.revision ||
    !machine.lastRun.produced.some((p) => p.count > 0)
  )
    return null;

  const key = { studentId_activityId: { studentId, activityId } };
  // An activity may already have one or more ordinary time checkpoints.
  // A unique first finish acquires the completion even across parallel requests.
  await tx.progress.createMany({
    data: {
      studentId,
      activityId,
      moduleSlug,
      lessonId,
      status: "IN_PROGRESS",
    },
    skipDuplicates: true,
  });
  const first = await tx.progress.updateMany({
    where: { studentId, activityId, status: "IN_PROGRESS" },
    data: { status: "COMPLETED", timeSpentS: { increment: timeSpentS } },
  });
  const progress = await tx.progress.findUniqueOrThrow({ where: key });
  if (attemptId)
    await tx.activityFinishReceipt.createMany({
      data: { progressId: progress.id, attemptId, isReplay: first.count === 0 },
      skipDuplicates: true,
    });
  return { progress, isReplay: first.count === 0 };
}
