/**
 * Pathways relationship consent and history boundary (#874).
 *
 * A PathwayEnrollment is an access relationship between a learner and a
 * cohort. A facilitator may see a learner — roster, profile fields, milestones,
 * exports, aggregates, gamification, CTF activity — only through a **trusted**
 * row: `status in (active, completed)` and `acceptedAt` set. `acceptedAt` is
 * the learner's own act: joining by code, self-registering with a code, or
 * accepting an invitation while signed in as the invited account.
 *
 * Facilitators never create a trusted row. "Add learner by email" records a
 * PathwayInvite for the typed address — whether or not an account exists — and
 * the response is identical either way. Only the authenticated learner whose
 * account email matches may accept it, once; wrong user, expired, declined or
 * revoked invitations grant nothing.
 *
 * Rows created before this rule carry `source = "legacy"` and no `acceptedAt`.
 * They are not trusted: the learner keeps learning, and re-entering the join
 * code confirms the relationship. Revoked rows stay in the table (status
 * `revoked`) so a stale join or acceptance cannot silently re-activate them.
 *
 * History boundary: cohort membership is not consent to a learner's whole
 * past. A facilitator sees a milestone only if it belongs to one of the
 * cohort's tracks and was touched (`updatedAt`) at or after the learner's
 * acceptance for that cohort; detail fields (artifacts, homework text) are
 * withheld for milestones that were started before acceptance. XP events,
 * badges and CTF activity are filtered by their own timestamps the same way.
 */
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma";

export type PathwaysAccessErrorCode =
  | "cohort_not_found"
  | "invalid_join_code"
  | "enrollment_revoked"
  | "invite_not_found"
  | "invite_expired"
  | "invite_not_pending"
  | "invalid_email";

export class PathwaysAccessError extends Error {
  constructor(
    public readonly code: PathwaysAccessErrorCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = "PathwaysAccessError";
    Object.setPrototypeOf(this, PathwaysAccessError.prototype);
  }
}

export const PATHWAY_INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const inviteEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email")
  .max(255, "Email too long");

// ── Trust predicate ─────────────────────────────────────────────────────────

export const TRUSTED_STATUSES = ["active", "completed"] as const;

/** Prisma `where` fragment selecting trusted enrollment rows. */
export const TRUSTED_ENROLLMENT_WHERE: Prisma.PathwayEnrollmentWhereInput = {
  status: { in: [...TRUSTED_STATUSES] },
  acceptedAt: { not: null },
};

export function isTrustedEnrollment(e: {
  status: string;
  acceptedAt: Date | null;
}): boolean {
  return (
    (TRUSTED_STATUSES as readonly string[]).includes(e.status) &&
    e.acceptedAt !== null
  );
}

// ── History boundary ────────────────────────────────────────────────────────

export type Boundary = { trackIds: readonly string[]; since: Date };

type MilestoneLike = {
  trackSlug: string;
  createdAt: Date;
  updatedAt: Date;
};

export function milestoneVisible(m: MilestoneLike, b: Boundary): boolean {
  return b.trackIds.includes(m.trackSlug) && m.updatedAt >= b.since;
}

/**
 * Milestones a facilitator may see for one learner, given every trusted
 * (cohort) boundary that learner has with this facilitator. A milestone is
 * visible if any boundary admits it; detail fields are withheld unless the
 * milestone was created at or after the earliest admitting acceptance.
 */
export function visibleMilestones<T extends MilestoneLike>(
  milestones: T[],
  boundaries: Boundary[],
): T[] {
  const out: T[] = [];
  for (const m of milestones) {
    const admitting = boundaries.filter((b) => milestoneVisible(m, b));
    if (admitting.length === 0) continue;
    const earliest = admitting.reduce(
      (min, b) => (b.since < min ? b.since : min),
      admitting[0].since,
    );
    out.push(redactMilestone(m, earliest));
  }
  return out;
}

/** Withhold free-text / artifact detail for work started before consent. */
export function redactMilestone<T extends { createdAt: Date }>(
  m: T,
  since: Date,
): T {
  if (m.createdAt >= since) return m;
  const copy = { ...m } as T & {
    artifacts?: unknown;
    homeworkResponse?: string | null;
  };
  if ("artifacts" in copy) copy.artifacts = null;
  if ("homeworkResponse" in copy) copy.homeworkResponse = null;
  return copy;
}

export function lastActiveOf(
  milestones: { completedAt: Date | null; updatedAt: Date }[],
): Date | null {
  return milestones.reduce<Date | null>((latest, m) => {
    const d = m.completedAt ?? m.updatedAt;
    return !latest || d > latest ? d : latest;
  }, null);
}

// ── Facilitator scope ───────────────────────────────────────────────────────

const SCOPE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  ageBand: true,
} as const;

export type ScopeCohort = {
  id: string;
  name: string;
  band: string;
  status: string;
  trackIds: string[];
};

export type ScopeEnrollment = {
  id: string;
  userId: string;
  cohortId: string;
  status: string;
  enrolledAt: Date;
  acceptedAt: Date;
  source: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    ageBand: string | null;
  };
};

export type FacilitatorScope = {
  cohorts: ScopeCohort[];
  /** Trusted enrollments only. */
  enrollments: ScopeEnrollment[];
  userIds: string[];
  boundariesByUser: Map<string, Boundary[]>;
  /** Earliest acceptance per learner across this facilitator's cohorts. */
  sinceByUser: Map<string, Date>;
};

/**
 * Everything a facilitator is allowed to look at: their cohorts (optionally
 * one), the trusted enrollments in them, and the per-learner history
 * boundaries. Untrusted rows never enter the scope.
 */
export async function loadFacilitatorScope(
  facilitatorId: string,
  cohortId?: string,
): Promise<FacilitatorScope | null> {
  const cohorts = await prisma.pathwayCohort.findMany({
    where: cohortId ? { id: cohortId, facilitatorId } : { facilitatorId },
    select: {
      id: true,
      name: true,
      band: true,
      status: true,
      trackIds: true,
      enrollments: {
        where: TRUSTED_ENROLLMENT_WHERE,
        select: {
          id: true,
          userId: true,
          cohortId: true,
          status: true,
          enrolledAt: true,
          acceptedAt: true,
          source: true,
          user: { select: SCOPE_USER_SELECT },
        },
      },
    },
  });
  if (cohortId && cohorts.length === 0) return null;

  const enrollments: ScopeEnrollment[] = [];
  const boundariesByUser = new Map<string, Boundary[]>();
  const sinceByUser = new Map<string, Date>();
  for (const c of cohorts) {
    for (const e of c.enrollments) {
      if (!e.acceptedAt) continue; // typed as nullable; the where excludes it
      enrollments.push({ ...e, acceptedAt: e.acceptedAt });
      const list = boundariesByUser.get(e.userId) ?? [];
      list.push({ trackIds: c.trackIds, since: e.acceptedAt });
      boundariesByUser.set(e.userId, list);
      const prev = sinceByUser.get(e.userId);
      if (!prev || e.acceptedAt < prev) sinceByUser.set(e.userId, e.acceptedAt);
    }
  }
  return {
    cohorts: cohorts.map(({ id, name, band, status, trackIds }) => ({
      id,
      name,
      band,
      status,
      trackIds,
    })),
    enrollments,
    userIds: Array.from(boundariesByUser.keys()),
    boundariesByUser,
    sinceByUser,
  };
}

/** Boundary-filtered milestones per learner for a scope. */
export async function loadVisibleMilestones(scope: FacilitatorScope) {
  if (scope.userIds.length === 0) {
    return new Map<string, Prisma.PathwayMilestoneGetPayload<object>[]>();
  }
  const rows = await prisma.pathwayMilestone.findMany({
    where: { userId: { in: scope.userIds } },
  });
  const byUser = new Map<string, typeof rows>();
  for (const userId of scope.userIds) {
    const mine = rows.filter((m) => m.userId === userId);
    byUser.set(
      userId,
      visibleMilestones(mine, scope.boundariesByUser.get(userId) ?? []),
    );
  }
  return byUser;
}

/** Count of rows in a cohort that grant no visibility (legacy, unaccepted). */
export async function countUnconfirmedLegacy(cohortId: string) {
  return prisma.pathwayEnrollment.count({
    where: {
      cohortId,
      status: { in: [...TRUSTED_STATUSES] },
      acceptedAt: null,
    },
  });
}

// ── Learner-initiated consent ───────────────────────────────────────────────

/**
 * Join (or confirm) a cohort by code. Creates a trusted row, confirms a legacy
 * row, is idempotent for an already-accepted row, and refuses a revoked row —
 * the facilitator removed this learner, and the shared code is not a new
 * invitation. Any pending invitation for this account's email in the cohort
 * is closed as accepted, since joining is the stronger act of consent.
 */
export async function enrollByJoinCode(userId: string, joinCode: string) {
  const cohort = await prisma.pathwayCohort.findUnique({
    where: { joinCode },
    select: { id: true, name: true },
  });
  if (!cohort) throw new PathwaysAccessError("invalid_join_code", 404);

  const existing = await prisma.pathwayEnrollment.findUnique({
    where: { userId_cohortId: { userId, cohortId: cohort.id } },
  });
  if (existing?.status === "revoked") {
    throw new PathwaysAccessError("enrollment_revoked", 403);
  }

  const now = new Date();
  const enrollment = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.pathwayEnrollment.update({
          where: { id: existing.id },
          data: existing.acceptedAt
            ? {}
            : { acceptedAt: now, source: "join_code", status: "active" },
        })
      : await tx.pathwayEnrollment.create({
          data: {
            userId,
            cohortId: cohort.id,
            status: "active",
            source: "join_code",
            acceptedAt: now,
          },
        });
    await closePendingInvitesForUser(tx, userId, cohort.id, now);
    return row;
  });

  return { cohort, enrollment };
}

/** Enrollment created while the learner registers with a cohort code. */
export function selfRegisteredEnrollmentData(userId: string, cohortId: string) {
  return {
    userId,
    cohortId,
    status: "active",
    source: "self_register",
    acceptedAt: new Date(),
  };
}

async function closePendingInvitesForUser(
  tx: Prisma.TransactionClient,
  userId: string,
  cohortId: string,
  now: Date,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return;
  await tx.pathwayInvite.updateMany({
    where: { cohortId, email: user.email.toLowerCase(), status: "pending" },
    data: { status: "accepted", acceptedById: userId, acceptedAt: now },
  });
}

// ── Facilitator invitations ─────────────────────────────────────────────────

/**
 * Record an invitation for an email address. Does not look the address up,
 * does not create an enrollment, and returns the same shape every time, so
 * neither the response nor the roster can reveal whether an account exists.
 */
export async function inviteLearnerByEmail(params: {
  cohortId: string;
  facilitatorId: string;
  rawEmail: unknown;
}) {
  const parsed = inviteEmailSchema.safeParse(params.rawEmail);
  if (!parsed.success) throw new PathwaysAccessError("invalid_email", 400);
  const email = parsed.data;

  const cohort = await prisma.pathwayCohort.findFirst({
    where: { id: params.cohortId, facilitatorId: params.facilitatorId },
    select: { id: true },
  });
  if (!cohort) throw new PathwaysAccessError("cohort_not_found", 404);

  const expiresAt = new Date(Date.now() + PATHWAY_INVITE_TTL_MS);
  const invite = await prisma.pathwayInvite.upsert({
    where: { cohortId_email: { cohortId: cohort.id, email } },
    create: {
      cohortId: cohort.id,
      email,
      invitedById: params.facilitatorId,
      status: "pending",
      expiresAt,
    },
    // Re-inviting refreshes a pending/expired/declined/revoked invite; an
    // accepted one stays accepted (the enrollment already exists).
    update: {
      invitedById: params.facilitatorId,
      expiresAt,
      status: "pending",
      declinedAt: null,
      revokedAt: null,
    },
    select: { id: true, email: true, status: true, expiresAt: true },
  });
  return invite;
}

const PENDING_INVITE_SELECT = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  createdAt: true,
} as const;

/** What the facilitator roster shows for a cohort's outstanding invitations. */
export async function listCohortInvites(cohortId: string) {
  const now = new Date();
  const rows = await prisma.pathwayInvite.findMany({
    where: { cohortId, status: { in: ["pending", "declined"] } },
    select: PENDING_INVITE_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    ...r,
    status: r.status === "pending" && r.expiresAt <= now ? "expired" : r.status,
  }));
}

export async function revokeInvite(cohortId: string, inviteId: string) {
  const res = await prisma.pathwayInvite.updateMany({
    where: { id: inviteId, cohortId, status: { in: ["pending", "declined"] } },
    data: { status: "revoked", revokedAt: new Date() },
  });
  return res.count === 1;
}

/**
 * Remove a learner: the enrollment row is kept as `revoked` so a stale join
 * or acceptance cannot re-activate it, and any open invitation for the same
 * account email in this cohort is revoked too.
 */
export async function revokeEnrollment(cohortId: string, userId: string) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.pathwayEnrollment.updateMany({
      where: { cohortId, userId, status: { not: "revoked" } },
      data: { status: "revoked", revokedAt: now },
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      await tx.pathwayInvite.updateMany({
        where: {
          cohortId,
          email: user.email.toLowerCase(),
          status: { in: ["pending", "declined"] },
        },
        data: { status: "revoked", revokedAt: now },
      });
    }
  });
}

// ── Learner-side invitations ────────────────────────────────────────────────

async function learnerEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ? user.email.toLowerCase() : null;
}

export async function listInvitationsForLearner(userId: string) {
  const email = await learnerEmail(userId);
  if (!email) return [];
  const rows = await prisma.pathwayInvite.findMany({
    where: { email, status: "pending", expiresAt: { gt: new Date() } },
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
      cohort: {
        select: {
          id: true,
          name: true,
          band: true,
          sitePartner: true,
          facilitator: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    cohortId: r.cohort.id,
    cohortName: r.cohort.name,
    band: r.cohort.band,
    sitePartner: r.cohort.sitePartner,
    facilitatorName: r.cohort.facilitator.name,
    invitedAt: r.createdAt,
    expiresAt: r.expiresAt,
  }));
}

/**
 * Accept an invitation as the intended learner. Exactly one transition: the
 * invite row is claimed with a count-guarded update inside the transaction
 * that creates (or re-activates) the enrollment. A replay by the same account
 * is a no-op success; a different account, an unknown id, or a declined or
 * revoked invite is 404; an expired one is 410.
 */
export async function acceptInvitation(userId: string, inviteId: string) {
  const email = await learnerEmail(userId);
  const invite = email
    ? await prisma.pathwayInvite.findFirst({ where: { id: inviteId, email } })
    : null;
  if (!invite) throw new PathwaysAccessError("invite_not_found", 404);

  if (invite.status === "accepted" && invite.acceptedById === userId) {
    return { alreadyAccepted: true, cohortId: invite.cohortId };
  }
  if (invite.status !== "pending") {
    throw new PathwaysAccessError("invite_not_found", 404);
  }
  const now = new Date();
  if (invite.expiresAt <= now) {
    throw new PathwaysAccessError("invite_expired", 410);
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.pathwayInvite.updateMany({
      where: { id: invite.id, status: "pending", expiresAt: { gt: now } },
      data: { status: "accepted", acceptedById: userId, acceptedAt: now },
    });
    if (claimed.count !== 1) {
      throw new PathwaysAccessError("invite_not_pending", 409);
    }
    await tx.pathwayEnrollment.upsert({
      where: { userId_cohortId: { userId, cohortId: invite.cohortId } },
      create: {
        userId,
        cohortId: invite.cohortId,
        status: "active",
        source: "facilitator_invite",
        acceptedAt: now,
        invitedById: invite.invitedById,
      },
      update: {
        status: "active",
        source: "facilitator_invite",
        acceptedAt: now,
        revokedAt: null,
        invitedById: invite.invitedById,
      },
    });
    return { alreadyAccepted: false, cohortId: invite.cohortId };
  });
  return result;
}

export async function declineInvitation(userId: string, inviteId: string) {
  const email = await learnerEmail(userId);
  const res = email
    ? await prisma.pathwayInvite.updateMany({
        where: { id: inviteId, email, status: "pending" },
        data: { status: "declined", declinedAt: new Date() },
      })
    : { count: 0 };
  if (res.count !== 1) throw new PathwaysAccessError("invite_not_found", 404);
}
