/**
 * Home-access credential authority (#872).
 *
 * Two separate capabilities, neither reachable from a classroom session:
 *
 * (A) First-time binding — proof based. The teacher (or home-group parent) who
 *     owns a Course the student is enrolled in invites an adult by email. The
 *     email carries a single-use, 72-hour token; only the token holder can
 *     bind a login email + password, and only to a *never-bound* account
 *     (no email, no password, home access off). Accounts that already hold
 *     independent credentials — email signups, Pathways registrants, or an
 *     already-enabled home login — can never be rebound through this path.
 *
 *     An invitation is bound to the exact relationship that authorized it:
 *     the Enrollment row (`enrollmentId`), its Course and the inviting owner.
 *     It loses authority the moment that relationship ends — the enrollment
 *     or class is deleted, the course changes owner, or the inviter is no
 *     longer a teacher. A relationship that is removed and recreated is a
 *     new row with a new id, so an old token can never revive. The check is
 *     made *inside* the accepting transaction, with the three rows share-
 *     locked, so a revocation that commits first prevents the binding and an
 *     acceptance that commits first is never undone by a later removal (home
 *     credentials are never deleted when an enrollment ends). Class deletion
 *     and a fresh invitation for the same student also revoke every unused
 *     token explicitly (`revokedAt`). The inviter must still hold the exact
 *     authority that issued the token — the owning *teacher* — so a role
 *     change in either direction (including promotion to admin) fails closed.
 *
 * (B) Reauthenticated changes — the credential holder, signed in with the home
 *     email + password (`req.user.auth === "password"`), re-enters the current
 *     password to change the login email, password, or parent relationship.
 *
 * Every failure leaves credentials, flags, relationships and the invite row
 * exactly as they were: the accept path runs in one transaction with
 * count-guarded updates, and the unique-email violation is mapped after the
 * transaction has rolled back.
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma";

export type HomeAccessErrorCode =
  | "course_not_found"
  | "student_not_enrolled"
  | "home_access_already_configured"
  | "invite_not_found"
  | "invite_used"
  | "invite_expired"
  | "invite_revoked"
  | "email_in_use"
  | "home_access_not_enabled"
  | "invalid_current_password"
  | "nothing_to_update"
  | "mail_unavailable";

export class HomeAccessError extends Error {
  constructor(
    public readonly code: HomeAccessErrorCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = "HomeAccessError";
    Object.setPrototypeOf(this, HomeAccessError.prototype);
  }
}

export const HOME_ACCESS_INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export const homeAccessPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const homeAccessEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email")
  .max(255, "Email too long");

export const inviteHomeAccessSchema = z.object({
  adultEmail: homeAccessEmailSchema,
  currentPassword: z.string().min(1, "Current password is required").max(100),
});

export const acceptHomeAccessInviteSchema = z.object({
  token: z.string().min(1).max(200),
  email: homeAccessEmailSchema,
  password: homeAccessPasswordSchema,
});

export const updateHomeCredentialsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(100),
  email: homeAccessEmailSchema.optional(),
  password: homeAccessPasswordSchema.optional(),
  parentEmail: homeAccessEmailSchema.or(z.literal("")).optional(),
  managedByParent: z.boolean().optional(),
});

/** Only the SHA-256 of the emailed token is stored. */
export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * A student account with no independent credentials of its own. This — not
 * `homeAccessEnabled` alone — is what first-time binding requires: an email
 * signup or a Pathways registrant has `homeAccessEnabled = false` too.
 */
export const NEVER_BOUND_STUDENT = {
  role: "student",
  email: null,
  password: null,
  homeAccessEnabled: false,
} as const;

function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export async function createHomeAccessInvite(params: {
  teacherId: string;
  courseId: string;
  studentId: string;
  adultEmail: string;
}) {
  const course = await prisma.course.findFirst({
    where: { id: params.courseId, teacherId: params.teacherId },
    select: { id: true },
  });
  if (!course) throw new HomeAccessError("course_not_found", 404);

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: params.studentId,
        courseId: params.courseId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          password: true,
          homeAccessEnabled: true,
        },
      },
    },
  });
  if (!enrollment || enrollment.student.role !== "student") {
    throw new HomeAccessError("student_not_enrolled", 404);
  }
  const student = enrollment.student;
  if (
    student.email !== null ||
    student.password !== null ||
    student.homeAccessEnabled
  ) {
    throw new HomeAccessError("home_access_already_configured", 409);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  // A fresh invitation supersedes every earlier unused one for this student
  // (a mis-addressed email must not stay claimable), in the same transaction
  // that issues the new token.
  const [, invite] = await prisma.$transaction([
    prisma.homeAccessInvite.updateMany({
      where: { studentId: student.id, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.homeAccessInvite.create({
      data: {
        studentId: student.id,
        invitedById: params.teacherId,
        // The exact relationship instance that authorizes this invitation.
        courseId: course.id,
        enrollmentId: enrollment.id,
        adultEmail: params.adultEmail,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(now.getTime() + HOME_ACCESS_INVITE_TTL_MS),
      },
      select: { id: true, expiresAt: true },
    }),
  ]);

  return {
    token,
    inviteId: invite.id,
    expiresAt: invite.expiresAt,
    studentFirstName: firstName(student.name),
  };
}

/** Roll back an invite whose email could not be delivered. */
export async function discardHomeAccessInvite(inviteId: string) {
  await prisma.homeAccessInvite.deleteMany({
    where: { id: inviteId, usedAt: null },
  });
}

type InviteRow = Prisma.HomeAccessInviteGetPayload<{
  include: { student: { select: { id: true; name: true; loginIcon: true } } };
}>;

async function findInvite(token: string): Promise<InviteRow | null> {
  return prisma.homeAccessInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { student: { select: { id: true, name: true, loginIcon: true } } },
  });
}

/**
 * Does the relationship that authorized this invitation still exist, exactly
 * as it was? The same Enrollment row (not merely the same student/course
 * pair), still in the same Course, still owned by the inviter, who is still a
 * teacher. Invitations without provenance (`enrollmentId` null — including
 * any whose enrollment was deleted) are never valid.
 *
 * `lock` makes the reads `FOR SHARE` on the accepting transaction's
 * connection so a concurrent deletion / owner change / role change must wait
 * for the acceptance to commit, and one that already committed is seen.
 */
async function relationshipStillAuthorizes(
  db: Prisma.TransactionClient,
  invite: InviteRow,
  lock: boolean,
): Promise<boolean> {
  if (!invite.enrollmentId || !invite.courseId) return false;
  if (lock) {
    // Lock order (Enrollment → Course → User) matches class deletion, which
    // removes enrollments before the course row, so the two cannot deadlock.
    const enrollment = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Enrollment"
      WHERE "id" = ${invite.enrollmentId}
        AND "studentId" = ${invite.studentId}
        AND "courseId" = ${invite.courseId}
      FOR SHARE`;
    if (enrollment.length !== 1) return false;
    const course = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Course"
      WHERE "id" = ${invite.courseId} AND "teacherId" = ${invite.invitedById}
      FOR SHARE`;
    if (course.length !== 1) return false;
    const inviter = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "User"
      WHERE "id" = ${invite.invitedById} AND "role" = 'teacher'
      FOR SHARE`;
    return inviter.length === 1;
  }
  const enrollment = await db.enrollment.findFirst({
    where: {
      id: invite.enrollmentId,
      studentId: invite.studentId,
      courseId: invite.courseId,
      course: { teacherId: invite.invitedById, teacher: { role: "teacher" } },
    },
    select: { id: true },
  });
  return !!enrollment;
}

function assertClaimable(invite: InviteRow | null, now: Date): InviteRow {
  if (!invite) throw new HomeAccessError("invite_not_found", 404);
  if (invite.usedAt) throw new HomeAccessError("invite_used", 409);
  if (invite.revokedAt) throw new HomeAccessError("invite_revoked", 410);
  if (invite.expiresAt <= now) throw new HomeAccessError("invite_expired", 410);
  return invite;
}

/** What the accept page may show the token holder. */
export async function readHomeAccessInvite(token: string) {
  const invite = assertClaimable(await findInvite(token), new Date());
  if (!(await relationshipStillAuthorizes(prisma, invite, false))) {
    throw new HomeAccessError("invite_revoked", 410);
  }
  return {
    studentFirstName: firstName(invite.student.name),
    adultEmail: invite.adultEmail,
    expiresAt: invite.expiresAt,
  };
}

/**
 * Bind a home login to the invited student. Exactly-one-winner and
 * relationship-checked in one transaction: the issuing Enrollment, Course and
 * inviter are share-locked and re-verified, then the invite row and the user
 * row are claimed with count-guarded `updateMany`. A replayed token, a second
 * token for the same student, a login email already in use, or a
 * relationship that ended all roll back with nothing written — the token
 * stays unused and the student stays unbound.
 */
export async function acceptHomeAccessInvite(rawInput: unknown) {
  const input = acceptHomeAccessInviteSchema.parse(rawInput);

  const now = new Date();
  const invite = assertClaimable(await findInvite(input.token), now);
  if (!(await relationshipStillAuthorizes(prisma, invite, false))) {
    throw new HomeAccessError("invite_revoked", 410);
  }

  // Hash before the transaction so the row locks are held only for the writes.
  const hashed = await bcrypt.hash(input.password, 10);

  try {
    await prisma.$transaction(
      async (tx) => {
        // Authority is checked under lock, on this connection, at commit time.
        if (!(await relationshipStillAuthorizes(tx, invite, true))) {
          throw new HomeAccessError("invite_revoked", 410);
        }

        // Compare-and-swap against the provenance that was just verified: if
        // the row's relationship fields moved since the pre-check, no claim.
        const claimed = await tx.homeAccessInvite.updateMany({
          where: {
            id: invite.id,
            enrollmentId: invite.enrollmentId,
            courseId: invite.courseId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });
        if (claimed.count !== 1) throw new HomeAccessError("invite_used", 409);

        const bound = await tx.user.updateMany({
          where: { id: invite.studentId, ...NEVER_BOUND_STUDENT },
          data: {
            email: input.email,
            password: hashed,
            homeAccessEnabled: true,
            managedByParent: true,
            parentEmail: invite.adultEmail,
            accountMode: invite.student.loginIcon
              ? "CLASS_CODE_PLUS_HOME_ACCESS"
              : "EMAIL_ONLY",
          },
        });
        if (bound.count !== 1) {
          throw new HomeAccessError("home_access_already_configured", 409);
        }
      },
      { maxWait: 5000, timeout: 10000 },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HomeAccessError("email_in_use", 409);
    }
    throw e;
  }

  return {
    studentId: invite.studentId,
    email: input.email,
    adultEmail: invite.adultEmail,
  };
}

/**
 * Reauthenticated change of the home login or parent relationship by the
 * credential holder. The route has already required a password-provenance
 * student session; this re-checks the account state and the current password.
 */
export async function updateHomeCredentials(userId: string, rawInput: unknown) {
  const input = updateHomeCredentialsSchema.parse(rawInput);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, password: true, homeAccessEnabled: true },
  });
  if (
    !user ||
    user.role !== "student" ||
    !user.homeAccessEnabled ||
    !user.password
  ) {
    throw new HomeAccessError("home_access_not_enabled", 403);
  }

  const valid = await bcrypt.compare(input.currentPassword, user.password);
  if (!valid) throw new HomeAccessError("invalid_current_password", 403);

  const data: Prisma.UserUpdateInput = {};
  if (input.email !== undefined) data.email = input.email;
  if (input.password !== undefined) {
    data.password = await bcrypt.hash(input.password, 10);
  }
  if (input.parentEmail !== undefined) {
    data.parentEmail = input.parentEmail || null;
  }
  if (input.managedByParent !== undefined) {
    data.managedByParent = input.managedByParent;
  }
  if (Object.keys(data).length === 0) {
    throw new HomeAccessError("nothing_to_update", 400);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        homeAccessEnabled: true,
        managedByParent: true,
        parentEmail: true,
        accountMode: true,
      },
    });
    return { user: updated, changedFields: Object.keys(data) };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HomeAccessError("email_in_use", 409);
    }
    throw e;
  }
}
