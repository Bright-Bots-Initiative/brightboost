import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function makeInviteCode() {
  const n = Math.floor(Math.random() * 36 ** 6);
  return n.toString(36).padStart(6, "0").toUpperCase();
}

export async function createClass(teacherId: string, name: string) {
  const inviteCode = makeInviteCode();
  return prisma.class.create({
    data: { teacherId, name, inviteCode },
  });
}

export async function listClasses(teacherId: string) {
  const classes = await prisma.class.findMany({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });
  const ids = classes.map((c) => c.id);
  if (ids.length === 0) return [];
  const counts = await prisma.enrollment.groupBy({
    by: ["classId"],
    where: { classId: { in: ids } },
    _count: { classId: true },
  });
  const countMap = new Map(counts.map((c) => [c.classId, c._count.classId]));
  return classes.map((c) => ({
    ...c,
    enrollmentCount: countMap.get(c.id) ?? 0,
  }));
}

export async function joinClass(inviteCode: string, studentId: string) {
  const cls = await prisma.class.findUnique({ where: { inviteCode } });
  if (!cls || cls.isArchived) throw new Error("Invalid invite code");

  const existing = await prisma.enrollment.findFirst({
    where: { classId: cls.id, studentId },
  });
  if (existing) return { classId: cls.id, alreadyEnrolled: true };

  await prisma.enrollment.create({ data: { classId: cls.id, studentId } });
  return { classId: cls.id, alreadyEnrolled: false };
}
