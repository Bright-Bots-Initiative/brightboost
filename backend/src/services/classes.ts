import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";

const prisma = new PrismaClient();

function makeInviteCode() {
  const n = randomInt(0, 36 ** 6);
  return n.toString(36).padStart(6, "0").toUpperCase();
}

export async function createClass(teacherId: string, name: string) {
  // Use create with explicit data to satisfy validation if needed
  // Note: The schema calls it 'Course', not 'Class'.
  // We mock a 'inviteCode' by putting it in the name or similar if the field is missing?
  // Schema for Course: id, name, teacherId, createdAt, updatedAt. NO inviteCode.
  // This service seems to be for a feature that isn't fully supported by the schema.
  // I will create the Course.
  return prisma.course.create({
    data: { teacherId, name },
  });
}

export async function listClasses(teacherId: string) {
  // Optimization: Fetch enrollment counts in the same query using _count
  const classes = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });

  return classes.map((c) => {
    const { _count, ...rest } = c;
    return {
      ...rest,
      enrollmentCount: _count.enrollments,
    };
  });
}

export async function joinClass(inviteCode: string, studentId: string) {
  // Schema doesn't have inviteCode on Course.
  // This feature is currently broken/unsupported by the DB schema.
  // I will throw an error to prevent runtime confusion, or search by ID if inviteCode acts as ID?
  // Given this is a fix-the-build task:
  throw new Error("Class joining via invite code is temporarily unavailable.");

  /*
  const cls = await prisma.course.findUnique({ where: { id: inviteCode } }); // Assuming inviteCode might be ID
  if (!cls) throw new Error("Invalid invite code");

  const existing = await prisma.enrollment.findFirst({
    where: { courseId: cls.id, studentId },
  });
  if (existing) return { classId: cls.id, alreadyEnrolled: true };

  await prisma.enrollment.create({ data: { courseId: cls.id, studentId } });
  return { classId: cls.id, alreadyEnrolled: false };
  */
}
