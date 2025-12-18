import { PrismaClient } from "@prisma/client";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();

function makeInviteCode() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(randomInt(chars.length));
  }
  return result;
}

export async function createClass(teacherId: string, name: string) {
  const inviteCode = makeInviteCode();
  return prisma.class.create({
    data: { teacherId, name, inviteCode },
  });
}

export async function listClasses(teacherId: string) {
  // Optimization: Fetch enrollment counts in the same query using _count
  // This reduces the number of database round-trips from 2 to 1
  const classes = await prisma.class.findMany({
    where: { teacherId, isArchived: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { Enrollments: true },
      },
    },
  });

  return classes.map((c) => {
    const { _count, ...rest } = c;
    return {
      ...rest,
      enrollmentCount: _count.Enrollments,
    };
  });
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
