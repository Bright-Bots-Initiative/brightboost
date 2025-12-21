import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";

const prisma = new PrismaClient();

function makeInviteCode() {
  const n = randomInt(0, 36 ** 6);
  return n.toString(36).padStart(6, "0").toUpperCase();
}

export async function createClass(teacherId: string, name: string) {
  // Use course instead of class
  return prisma.course.create({
    data: { teacherId, name },
  });
}

export async function listClasses(teacherId: string) {
  // Optimization: Fetch enrollment counts in the same query using _count
  // This reduces the number of database round-trips from 2 to 1
  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });

  return courses.map((c: any) => {
    const { _count, ...rest } = c;
    return {
      ...rest,
      enrollmentCount: _count.enrollments,
    };
  });
}

export async function joinClass(inviteCode: string, studentId: string) {
  // Invite code not in schema for Course?
  // Assuming no invite code logic for now or needs update
  throw new Error("Invite code not implemented for Course model");
}
