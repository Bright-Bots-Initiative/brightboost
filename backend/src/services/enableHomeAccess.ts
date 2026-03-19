import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../utils/prisma";

export const enableHomeAccessSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  managedByParent: z.boolean().optional().default(true),
  parentEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("")),
});

export async function enableHomeAccess(userId: string, rawInput: unknown) {
  const input = enableHomeAccessSchema.parse(rawInput);

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      loginIcon: true,
      email: true,
      homeAccessEnabled: true,
    },
  });

  if (!existing || existing.role !== "student") {
    throw new Error("Student not found");
  }

  const emailTaken = await prisma.user.findFirst({
    where: {
      email: input.email,
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (emailTaken) {
    throw new Error("Email already in use");
  }

  const hashed = await bcrypt.hash(input.password, 10);

  return prisma.user.update({
    where: { id: userId },
    data: {
      email: input.email,
      password: hashed,
      homeAccessEnabled: true,
      managedByParent: input.managedByParent,
      parentEmail: input.parentEmail || null,
      accountMode: existing.loginIcon
        ? "CLASS_CODE_PLUS_HOME_ACCESS"
        : "EMAIL_ONLY",
    },
    select: {
      id: true,
      email: true,
      homeAccessEnabled: true,
      managedByParent: true,
      parentEmail: true,
      accountMode: true,
    },
  });
}
