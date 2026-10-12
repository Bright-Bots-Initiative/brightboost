import prisma from "../utils/prisma";

/**
 * #889: POST requires this learner's completed PRE in the same class and
 * template. Missing PRE is locked; closing an already-completed PRE does not
 * erase the baseline. Share the query across listing, reading and writing.
 */
export async function completedPreTemplates(
  studentId: string,
  courseId: string,
  templateIds: string[],
): Promise<Set<string>> {
  if (templateIds.length === 0) return new Set();
  const attempts = await prisma.benchmarkAttempt.findMany({
    where: {
      studentId,
      assignment: { courseId, kind: "PRE", templateId: { in: templateIds } },
    },
    select: { assignment: { select: { templateId: true } } },
  });
  return new Set(attempts.map((attempt) => attempt.assignment.templateId));
}
