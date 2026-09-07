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
import crypto from "crypto";
import { z } from "zod";
import prisma from "../utils/prisma";

export type PathwaysAccessErrorCode =
  | "cohort_not_found"
  | "invalid_join_code"
  | "enrollment_revoked"
  | "invite_not_found"
  | "invite_expired"
  | "invite_not_pending"
  | "invalid_email"
  | "consent_ref_required"
  | "preview_required"
  | "preview_changed";

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
//
// Strict post-consent sharing. A facilitator sees, for each admitted
// milestone, only the facts that provably happened at or after the learner's
// acceptance. A row's `updatedAt` proves that *something* happened after
// consent — not that its contents were earned then — so it admits the row but
// never its historical values. Field-level provenance comes from:
//   - `completedAt`, written by the learner routes at the moment of completion
//     → status "completed" and the completion date;
//   - PathwayXpEvent rows the learner routes write at the moment of each act,
//     keyed by module slug with the track recorded in metadata: `section`
//     (metadata.section = hook|reading|lesson|practice|homework), `quiz`, and
//     `homework` (the free-text submission route) — each awarded only on the
//     first false→true transition, so an event proves the act and the row's
//     current flag proves it still stands.
// Everything without provenance is withheld — never guessed, relabelled or
// reset: a score (any learner route can refresh `completedAt` without writing
// one), artifacts, cumulative time, the pre-consent start date, quiz scores
// (no route writes them), and homework text unless the submission itself is
// post-consent. The learner's own rows and routes are untouched.

export type Boundary = { trackIds: readonly string[]; since: Date };

/** trackSlug → ISO boundary, stored on PathwayEnrollment.trackBoundaries. */
export type TrackBoundaries = Record<string, string>;

/**
 * The tracks a learner is consenting to share, each with its boundary. A
 * track already in `existing` keeps its earlier boundary — even one the
 * cohort does not list right now, so a temporarily unlisted track does not
 * lose the learner's consent; `boundariesOf` hides it while unlisted. A track
 * the cohort added since starts at `at` (the learner's re-entry of the join
 * code, or the acceptance itself).
 */
export function withTrackBoundaries(
  existing: unknown,
  trackIds: readonly string[],
  at: Date,
): TrackBoundaries {
  const prev =
    existing && typeof existing === "object"
      ? (existing as Record<string, unknown>)
      : {};
  const out: TrackBoundaries = {};
  for (const [t, iso] of Object.entries(prev)) {
    if (typeof iso === "string") out[t] = iso;
  }
  for (const t of trackIds) {
    if (typeof out[t] !== "string") out[t] = at.toISOString();
  }
  return out;
}

/**
 * Boundaries for one trusted relationship: one per track the learner
 * consented to that the cohort still lists, never earlier than the
 * acceptance. A row without a snapshot has consented to no track yet — it
 * shares nothing until the learner confirms (which writes the snapshot), so
 * a cohort that gains a track can never widen it unasked.
 */
export function boundariesOf(
  cohortTrackIds: readonly string[],
  acceptedAt: Date,
  snapshot: unknown,
): Boundary[] {
  const snap =
    snapshot && typeof snapshot === "object"
      ? (snapshot as Record<string, unknown>)
      : null;
  if (!snap) return [];
  const out: Boundary[] = [];
  for (const t of cohortTrackIds) {
    const iso = snap[t];
    if (typeof iso !== "string") continue; // never consented to this track
    const since = new Date(iso);
    out.push({
      trackIds: [t],
      since: isNaN(since.getTime()) || since < acceptedAt ? acceptedAt : since,
    });
  }
  return out;
}

type MilestoneRow = Prisma.PathwayMilestoneGetPayload<object>;

/** A milestone as a facilitator may see it. */
export type VisibleMilestone = Omit<
  MilestoneRow,
  "createdAt" | "timeSpentMinutes"
> & {
  createdAt: Date | null;
  timeSpentMinutes: number | null;
  /** true when the row predates consent and historical values were withheld */
  historyWithheld: boolean;
};

/** Post-consent acts proven by the learner's own XP events, for one module. */
export type ModuleEvidence = {
  /** section keys (hook|reading|lesson|practice|homework) with a `section` event */
  sections: ReadonlySet<string>;
  /** a `quiz` event */
  quiz: boolean;
  /** a `homework` event — the free-text submission route */
  homework: boolean;
};

export type ProvenanceEvent = {
  source: string;
  sourceRefId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export const PROVENANCE_SOURCES = ["section", "quiz", "homework"] as const;

/** Evidence for one (track, module) from events dated at/after `since`. */
export function moduleEvidence(
  events: ProvenanceEvent[],
  trackSlug: string,
  moduleSlug: string,
  since: Date,
): ModuleEvidence {
  const sections = new Set<string>();
  let quiz = false;
  let homework = false;
  for (const ev of events) {
    if (ev.sourceRefId !== moduleSlug || ev.createdAt < since) continue;
    const meta = (ev.metadata ?? null) as {
      section?: unknown;
      trackSlug?: unknown;
    } | null;
    // Events are keyed by module slug alone; the track recorded at award
    // time must match this row, or the act is not proven for it.
    if (meta?.trackSlug !== trackSlug) continue;
    if (ev.source === "section") {
      if (typeof meta.section === "string") sections.add(meta.section);
    } else if (ev.source === "quiz") {
      quiz = true;
    } else if (ev.source === "homework") {
      homework = true;
    }
  }
  return { sections, quiz, homework };
}

/** Admission: the row is on the cohort's tracks and was touched at/after consent. */
export function milestoneAdmitted(
  m: { trackSlug: string; createdAt: Date; updatedAt: Date },
  b: Boundary,
): boolean {
  return (
    b.trackIds.includes(m.trackSlug) &&
    (m.createdAt >= b.since || m.updatedAt >= b.since)
  );
}

/**
 * Project one admitted row for a facilitator whose earliest admitting
 * acceptance is `since`. A row created at/after `since` is entirely
 * post-consent and is shown whole. An older row shows only proven post-consent
 * facts; its status is "completed" only if the completion itself happened at
 * or after `since`, otherwise "in_progress" (post-consent activity exists,
 * nothing more is claimed). A flag is shown only when it is currently set
 * AND a post-consent event proves it was earned.
 */
export function projectMilestone(
  m: MilestoneRow,
  since: Date,
  evidence: ModuleEvidence,
): VisibleMilestone {
  if (m.createdAt >= since) return { ...m, historyWithheld: false };
  const completedSince =
    m.status === "completed" &&
    m.completedAt !== null &&
    m.completedAt >= since;
  const proven = (flag: boolean, key: string) =>
    flag && evidence.sections.has(key);
  const homeworkSubmitted =
    m.homeworkSubmitted &&
    (evidence.homework || evidence.sections.has("homework"));
  return {
    ...m,
    createdAt: null,
    status: completedSince
      ? "completed"
      : m.status === "not_started"
        ? "not_started"
        : "in_progress",
    score: null,
    artifacts: null,
    completedAt: completedSince ? m.completedAt : null,
    hookCompleted: proven(m.hookCompleted, "hook"),
    readingCompleted: proven(m.readingCompleted, "reading"),
    lessonCompleted: proven(m.lessonCompleted, "lesson"),
    practiceCompleted: proven(m.practiceCompleted, "practice"),
    quizCompleted: m.quizCompleted && evidence.quiz,
    quizScore: null,
    homeworkSubmitted,
    homeworkResponse:
      m.homeworkSubmitted && evidence.homework ? m.homeworkResponse : null,
    timeSpentMinutes: null,
    historyWithheld: true,
  };
}

/**
 * Milestones a facilitator may see for one learner, given every trusted
 * (cohort) boundary that learner has with this facilitator and the learner's
 * provenance events. A row is admitted if any boundary admits it; the
 * projection uses the earliest admitting acceptance.
 */
export function visibleMilestones(
  milestones: MilestoneRow[],
  boundaries: Boundary[],
  events: ProvenanceEvent[],
): VisibleMilestone[] {
  const out: VisibleMilestone[] = [];
  for (const m of milestones) {
    const admitting = boundaries.filter((b) => milestoneAdmitted(m, b));
    if (admitting.length === 0) continue;
    const since = admitting.reduce(
      (min, b) => (b.since < min ? b.since : min),
      admitting[0].since,
    );
    out.push(
      projectMilestone(
        m,
        since,
        moduleEvidence(events, m.trackSlug, m.moduleSlug, since),
      ),
    );
  }
  return out;
}

/**
 * Mean of the scores that are actually visible, or null when none are. A
 * withheld score must not count as zero: that would report a false low.
 */
export function averageVisibleScore(
  milestones: { score: number | null }[],
): number | null {
  const scored = milestones.filter((m) => m.score !== null);
  if (scored.length === 0) return null;
  return Math.round(
    scored.reduce((sum, m) => sum + (m.score as number), 0) / scored.length,
  );
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
          trackBoundaries: true,
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
      // A relationship whose snapshot covers none of the cohort's tracks
      // (no snapshot yet, or only tracks the cohort no longer lists) shares
      // nothing at all — not even identity or gamification — until the
      // learner confirms.
      const bounds = boundariesOf(c.trackIds, e.acceptedAt, e.trackBoundaries);
      if (bounds.length === 0) continue;
      enrollments.push({ ...e, acceptedAt: e.acceptedAt });
      const list = boundariesByUser.get(e.userId) ?? [];
      list.push(...bounds);
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
export async function loadVisibleMilestones(
  scope: FacilitatorScope,
): Promise<Map<string, VisibleMilestone[]>> {
  const byUser = new Map<string, VisibleMilestone[]>();
  if (scope.userIds.length === 0) return byUser;
  // Nothing older than the earliest acceptance in scope can be visible, so
  // push that bound into both queries instead of filtering it away in memory.
  const earliest = Array.from(scope.sinceByUser.values()).reduce(
    (min, d) => (d < min ? d : min),
    new Date(8640000000000000),
  );
  const [rows, events] = await Promise.all([
    prisma.pathwayMilestone.findMany({
      where: { userId: { in: scope.userIds }, updatedAt: { gte: earliest } },
    }),
    prisma.pathwayXpEvent.findMany({
      where: {
        userId: { in: scope.userIds },
        source: { in: [...PROVENANCE_SOURCES] },
        createdAt: { gte: earliest },
      },
      select: {
        userId: true,
        source: true,
        sourceRefId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);
  for (const userId of scope.userIds) {
    byUser.set(
      userId,
      visibleMilestones(
        rows.filter((m) => m.userId === userId),
        scope.boundariesByUser.get(userId) ?? [],
        events.filter((e) => e.userId === userId),
      ),
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

// ── Learner-initiated consent: preview, then confirm ───────────────────────
//
// The learner previews exactly what a confirmation would share — the cohort,
// its facilitator, the tracks, and which of them are new for this learner —
// and confirms with the preview's `version`. The server recomputes the
// version from what it reads inside the confirming transaction, so the grant
// can only ever cover the cohort and tracks the learner actually saw: a
// cohort whose tracks changed since the preview answers 409 with a fresh
// preview and needs a new confirmation. Preview writes nothing; confirmation
// is the learner's own act of consent (a trusted row, a confirmed legacy row,
// or new boundaries for tracks the cohort listed since). A revoked row stays
// revoked. Nothing here is reachable without the learner's session.

export type ConsentRef = { joinCode?: string; cohortId?: string };

export type ConsentPreview = {
  cohort: {
    id: string;
    name: string;
    band: string;
    sitePartner: string | null;
    facilitatorName: string | null;
  };
  tracks: { slug: string; consentedSince: string | null; requested: boolean }[];
  enrollment: {
    state: "none" | "legacy" | "trusted" | "revoked";
    acceptedAt: string | null;
    source: string | null;
  };
  /** track slugs a confirmation would start sharing from now on */
  newSharing: string[];
  canConfirm: boolean;
  reason: "enrollment_revoked" | "nothing_new" | null;
  version: string;
};

const CONSENT_COHORT_SELECT = {
  id: true,
  name: true,
  band: true,
  sitePartner: true,
  trackIds: true,
  facilitator: { select: { name: true } },
} as const;
type ConsentCohort = Prisma.PathwayCohortGetPayload<{
  select: typeof CONSENT_COHORT_SELECT;
}>;
type EnrollmentRow = Prisma.PathwayEnrollmentGetPayload<object>;

function snapshotEntries(row: EnrollmentRow | null): [string, string][] {
  const raw = row?.trackBoundaries;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter((e): e is [string, string] => typeof e[1] === "string")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Identifies exactly which (cohort, tracks, existing consent) a preview
 * showed. Not a secret: it proves consistency, not authority — the session
 * is the authority, and a mismatch only ever refuses a grant.
 */
export function consentVersion(
  userId: string,
  cohortId: string,
  trackIds: readonly string[],
  row: EnrollmentRow | null,
): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        userId,
        cohortId,
        [...trackIds].sort(),
        row?.status ?? null,
        row?.acceptedAt?.toISOString() ?? null,
        snapshotEntries(row),
      ]),
    )
    .digest("hex");
}

/**
 * The boundary each currently listed track has for a trusted row — the same
 * rule `boundariesOf` applies for facilitators: the snapshot's entries, or,
 * for a row without a snapshot (operator-written), every listed track at
 * the acceptance moment. Empty for rows that are not trusted.
 */
function effectiveBoundaries(
  row: EnrollmentRow | null,
  cohortTrackIds: readonly string[],
): Map<string, string> {
  const out = new Map<string, string>();
  if (!row || !isTrustedEnrollment(row)) return out;
  for (const b of boundariesOf(
    cohortTrackIds,
    row.acceptedAt!,
    row.trackBoundaries,
  )) {
    out.set(b.trackIds[0], b.since.toISOString());
  }
  return out;
}

export function buildConsentPreview(
  userId: string,
  cohort: ConsentCohort,
  row: EnrollmentRow | null,
): ConsentPreview {
  const state: ConsentPreview["enrollment"]["state"] = !row
    ? "none"
    : row.status === "revoked"
      ? "revoked"
      : isTrustedEnrollment(row)
        ? "trusted"
        : "legacy";
  if (state === "revoked") {
    // Nothing can be granted, so nothing about the cohort as it is now is
    // shown — only that this relationship ended and how it can come back.
    return {
      cohort: {
        id: cohort.id,
        name: cohort.name,
        band: cohort.band,
        sitePartner: null,
        facilitatorName: null,
      },
      tracks: [],
      enrollment: { state, acceptedAt: null, source: row?.source ?? null },
      newSharing: [],
      canConfirm: false,
      reason: "enrollment_revoked",
      version: "",
    };
  }
  const consented = effectiveBoundaries(row, cohort.trackIds);
  const tracks = cohort.trackIds.map((slug) => {
    const since = consented.get(slug) ?? null;
    return { slug, consentedSince: since, requested: since === null };
  });
  const newSharing = tracks.filter((t) => t.requested).map((t) => t.slug);
  const canConfirm = newSharing.length > 0;
  return {
    cohort: {
      id: cohort.id,
      name: cohort.name,
      band: cohort.band,
      // The site partner is shown once the learner has a relationship here;
      // a code alone shows the cohort, its band, tracks and facilitator.
      sitePartner: row ? cohort.sitePartner : null,
      facilitatorName: cohort.facilitator.name,
    },
    tracks,
    enrollment: {
      state,
      acceptedAt: row?.acceptedAt?.toISOString() ?? null,
      source: row?.source ?? null,
    },
    newSharing,
    canConfirm,
    reason: canConfirm ? null : "nothing_new",
    version: consentVersion(userId, cohort.id, cohort.trackIds, row),
  };
}

/**
 * The cohort a preview or confirmation is about, and this learner's row in
 * it. By join code (any case, trimmed) for joining; by cohort id only when
 * the learner already has a row there (the home's "confirm sharing" prompt),
 * so an id never reveals a cohort the learner has no relationship with.
 */
/**
 * Serialize writers of one (learner, cohort) row: a confirmation, an
 * invitation acceptance or a revocation that runs at the same time waits
 * here, and the read that follows sees what it committed — so no writer can
 * overwrite another's boundaries from a stale read.
 */
async function lockEnrollmentRow(
  tx: Prisma.TransactionClient,
  userId: string,
  cohortId: string,
) {
  // A transaction-scoped advisory lock on the (learner, cohort) pair: unlike
  // a row lock it also serializes writers before the row exists (two first
  // joins, a first join racing an invitation acceptance).
  // `pg_advisory_xact_lock` returns void, which Prisma cannot deserialize;
  // the IS NULL projection yields a boolean column instead.
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${userId}::text),
      hashtext(${cohortId}::text)
    ) IS NULL AS locked`;
}

async function resolveConsentCohort(
  db: Prisma.TransactionClient,
  userId: string,
  ref: ConsentRef,
  lock = false,
): Promise<{ cohort: ConsentCohort; row: EnrollmentRow | null }> {
  // Both "not found" answers are the same status and code, so an id cannot
  // be used to learn which cohorts exist.
  let cohort: ConsentCohort | null = null;
  if (ref.joinCode && ref.joinCode.trim()) {
    cohort = await db.pathwayCohort.findFirst({
      where: {
        joinCode: {
          equals: ref.joinCode.trim().toUpperCase(),
          mode: "insensitive",
        },
      },
      select: CONSENT_COHORT_SELECT,
    });
    if (!cohort) throw new PathwaysAccessError("invalid_join_code", 404);
  } else if (ref.cohortId) {
    const member = await db.pathwayEnrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId: ref.cohortId } },
      select: { id: true },
    });
    cohort = member
      ? await db.pathwayCohort.findUnique({
          where: { id: ref.cohortId },
          select: CONSENT_COHORT_SELECT,
        })
      : null;
    if (!cohort) throw new PathwaysAccessError("invalid_join_code", 404);
  } else {
    throw new PathwaysAccessError("consent_ref_required", 400);
  }
  if (lock) await lockEnrollmentRow(db, userId, cohort.id);
  const row = await db.pathwayEnrollment.findUnique({
    where: { userId_cohortId: { userId, cohortId: cohort.id } },
  });
  return { cohort, row };
}

/** Read-only: what confirming would share. Writes nothing, consumes nothing. */
export async function previewCohortConsent(
  userId: string,
  ref: ConsentRef,
): Promise<ConsentPreview> {
  const { cohort, row } = await resolveConsentCohort(prisma, userId, ref);
  return buildConsentPreview(userId, cohort, row);
}

/**
 * Confirm what the preview identified by `version` showed. Inside one
 * transaction: re-read the cohort and the learner's row; a revoked row is
 * refused; when nothing is left to share the call is an idempotent no-op
 * (a duplicate submit cannot grant anything); otherwise the version must
 * match what is read now — a cohort whose tracks changed since the preview
 * answers 409 so the learner sees the change and confirms again. The grant
 * is then exactly the tracks read here. Any pending invitation for this
 * account in the cohort is closed, as with acceptance.
 */
export async function confirmCohortConsent(
  userId: string,
  ref: ConsentRef,
  version: string,
  retried = false,
): Promise<{
  cohort: { id: string; name: string };
  enrollment: EnrollmentRow;
  changed: boolean;
  preview: ConsentPreview;
}> {
  const now = new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const { cohort, row: existing } = await resolveConsentCohort(
        tx,
        userId,
        ref,
        true,
      );
      if (existing?.status === "revoked") {
        throw new PathwaysAccessError("enrollment_revoked", 403);
      }
      const before = buildConsentPreview(userId, cohort, existing);
      let row: EnrollmentRow;
      let changed = false;
      if (
        existing &&
        isTrustedEnrollment(existing) &&
        before.newSharing.length === 0
      ) {
        // Nothing new to share: idempotent. Re-read so the reply reflects a
        // revocation that committed after the first read.
        row = await tx.pathwayEnrollment.findUniqueOrThrow({
          where: { id: existing.id },
        });
        if (row.status === "revoked") {
          throw new PathwaysAccessError("enrollment_revoked", 403);
        }
      } else {
        if (!version) throw new PathwaysAccessError("preview_required", 400);
        if (version !== before.version) {
          throw new PathwaysAccessError("preview_changed", 409);
        }
        if (!existing) {
          row = await tx.pathwayEnrollment.create({
            data: {
              userId,
              cohortId: cohort.id,
              status: "active",
              source: "join_code",
              acceptedAt: now,
              trackBoundaries: withTrackBoundaries(null, cohort.trackIds, now),
            },
          });
          changed = true;
        } else if (isTrustedEnrollment(existing)) {
          // Already trusted: the consent moment is unchanged; the tracks the
          // cohort listed since start their boundary now. Count-guarded so a
          // revocation that committed after the first read is never
          // overwritten; re-read so the reply reflects it.
          await tx.pathwayEnrollment.updateMany({
            where: { id: existing.id, status: { not: "revoked" } },
            data: {
              trackBoundaries: withTrackBoundaries(
                existing.trackBoundaries,
                cohort.trackIds,
                now,
              ),
            },
          });
          row = await tx.pathwayEnrollment.findUniqueOrThrow({
            where: { id: existing.id },
          });
          if (row.status === "revoked") {
            throw new PathwaysAccessError("enrollment_revoked", 403);
          }
          changed = true;
        } else {
          // A row that is not trusted: a legacy row (no consent moment yet)
          // or one whose status lapsed. This confirmation is its consent
          // moment — an existing acceptance moment is kept. Count-guarded so
          // a revocation that committed after the first read is never
          // overwritten; re-read so the reply reflects it.
          const confirmed = await tx.pathwayEnrollment.updateMany({
            where: { id: existing.id, status: { not: "revoked" } },
            data: {
              acceptedAt: existing.acceptedAt ?? now,
              source: existing.acceptedAt ? existing.source : "join_code",
              status: "active",
              trackBoundaries: withTrackBoundaries(
                existing.trackBoundaries,
                cohort.trackIds,
                now,
              ),
            },
          });
          row = await tx.pathwayEnrollment.findUniqueOrThrow({
            where: { id: existing.id },
          });
          if (confirmed.count !== 1 || row.status === "revoked") {
            throw new PathwaysAccessError("enrollment_revoked", 403);
          }
          changed = true;
        }
      }
      await closePendingInvitesForUser(tx, userId, cohort.id, now);
      return {
        cohort: { id: cohort.id, name: cohort.name },
        enrollment: row,
        changed,
        preview: buildConsentPreview(userId, cohort, row),
      };
    });
  } catch (e) {
    // Two simultaneous first joins: the loser's create hits the unique key
    // after the transaction rolled back. Re-run once; it now finds the row
    // and, with nothing left to share, answers idempotently.
    if (
      !retried &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return confirmCohortConsent(userId, ref, version, true);
    }
    throw e;
  }
}

/** Per-enrollment consent summary for the learner's own home. */
export function consentSummary(
  row: EnrollmentRow,
  cohortTrackIds: readonly string[],
): { accepted: boolean; newTracks: string[] } {
  if (!isTrustedEnrollment(row)) {
    return { accepted: false, newTracks: [...cohortTrackIds] };
  }
  const consented = effectiveBoundaries(row, cohortTrackIds);
  return {
    accepted: true,
    newTracks: cohortTrackIds.filter((t) => !consented.has(t)),
  };
}

/** Enrollment created while the learner registers with a cohort code. */
export function selfRegisteredEnrollmentData(
  userId: string,
  cohortId: string,
  trackIds: readonly string[],
) {
  const now = new Date();
  return {
    userId,
    cohortId,
    status: "active",
    source: "self_register",
    acceptedAt: now,
    trackBoundaries: withTrackBoundaries(null, trackIds, now),
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
    select: MATCHABLE_USER_SELECT,
  });
  const email = matchableEmail(user);
  if (!email) return;
  await tx.pathwayInvite.updateMany({
    where: { cohortId, email, status: "pending" },
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

  // An accepted invitation whose learner still holds a trusted row stays
  // accepted (re-accepting could not move their consent moment anyway, but
  // there is nothing for them to accept). If that learner was removed since,
  // the invitation is refreshed to pending: a fresh invitation is the way
  // back for a revoked learner. This reads only ids already on the invite
  // row — never the typed address — so it adds no account-existence oracle.
  const current = await prisma.pathwayInvite.findUnique({
    where: { cohortId_email: { cohortId: cohort.id, email } },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      acceptedById: true,
    },
  });
  if (current?.status === "accepted" && current.acceptedById) {
    const stillTrusted = await prisma.pathwayEnrollment.findFirst({
      where: {
        userId: current.acceptedById,
        cohortId: cohort.id,
        ...TRUSTED_ENROLLMENT_WHERE,
      },
      select: { id: true },
    });
    if (stillTrusted) {
      return {
        id: current.id,
        email: current.email,
        status: current.status,
        expiresAt: current.expiresAt,
      };
    }
  }

  const expiresAt = new Date(Date.now() + PATHWAY_INVITE_TTL_MS);
  // Re-inviting refreshes a pending / expired / declined / revoked invite.
  const invite = await prisma.pathwayInvite.upsert({
    where: { cohortId_email: { cohortId: cohort.id, email } },
    create: {
      cohortId: cohort.id,
      email,
      invitedById: params.facilitatorId,
      status: "pending",
      expiresAt,
    },
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
    // Same writer lock as confirmation and acceptance: a revocation never
    // interleaves with a grant on this (learner, cohort) pair.
    await lockEnrollmentRow(tx, userId, cohortId);
    await tx.pathwayEnrollment.updateMany({
      where: { cohortId, userId, status: { not: "revoked" } },
      data: { status: "revoked", revokedAt: now },
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      // Includes the accepted invitation that created this relationship, so
      // a later re-invite starts a fresh pending one instead of finding
      // "already accepted".
      await tx.pathwayInvite.updateMany({
        where: {
          cohortId,
          email: user.email.toLowerCase(),
          status: { in: ["pending", "declined", "accepted"] },
        },
        data: { status: "revoked", revokedAt: now },
      });
    }
  });
}

// ── Learner-side invitations ────────────────────────────────────────────────

/**
 * The address an invitation may be matched against. A home-access login
 * (#872) can put an *adult's* email on a minor's classroom account: the
 * account is managed by a parent and its login email is that parent's
 * address. An invitation addressed to that adult must never be listable or
 * acceptable by the child's account, so such accounts match nothing. A
 * learner whose home login carries their own address (parent email differs,
 * or no parent) matches normally.
 */
export function matchableEmail(
  user: {
    email: string | null;
    homeAccessEnabled: boolean;
    managedByParent: boolean;
    parentEmail: string | null;
  } | null,
): string | null {
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (
    user.homeAccessEnabled &&
    user.managedByParent &&
    user.parentEmail?.toLowerCase() === email
  ) {
    return null;
  }
  return email;
}

const MATCHABLE_USER_SELECT = {
  email: true,
  homeAccessEnabled: true,
  managedByParent: true,
  parentEmail: true,
} as const;

async function learnerEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: MATCHABLE_USER_SELECT,
  });
  return matchableEmail(user);
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
          trackIds: true,
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
    trackIds: r.cohort.trackIds,
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
    // The tracks this acceptance shares are read here, under the same row
    // lock every other writer of this (learner, cohort) row takes.
    await lockEnrollmentRow(tx, userId, invite.cohortId);
    const cohort = await tx.pathwayCohort.findUnique({
      where: { id: invite.cohortId },
      select: { trackIds: true },
    });
    const trackIds = cohort?.trackIds ?? [];
    const claimed = await tx.pathwayInvite.updateMany({
      where: { id: invite.id, status: "pending", expiresAt: { gt: now } },
      data: { status: "accepted", acceptedById: userId, acceptedAt: now },
    });
    if (claimed.count !== 1) {
      throw new PathwaysAccessError("invite_not_pending", 409);
    }
    // A learner who already holds a trusted (non-revoked) row keeps their
    // original consent moment; only a missing or revoked row starts now.
    const existing = await tx.pathwayEnrollment.findUnique({
      where: { userId_cohortId: { userId, cohortId: invite.cohortId } },
      select: { acceptedAt: true, status: true, trackBoundaries: true },
    });
    const stillTrusted =
      !!existing?.acceptedAt && existing.status !== "revoked";
    const keepAcceptedAt = stillTrusted ? existing!.acceptedAt! : now;
    // A fresh relationship (or one re-established after revocation) snapshots
    // the cohort's tracks from now; a still-trusted one keeps its earlier
    // boundaries and adds any track the cohort listed since.
    const trackBoundaries = withTrackBoundaries(
      stillTrusted ? existing!.trackBoundaries : null,
      trackIds,
      now,
    );
    await tx.pathwayEnrollment.upsert({
      where: { userId_cohortId: { userId, cohortId: invite.cohortId } },
      create: {
        userId,
        cohortId: invite.cohortId,
        status: "active",
        source: "facilitator_invite",
        acceptedAt: now,
        invitedById: invite.invitedById,
        trackBoundaries,
      },
      update: {
        status: "active",
        source: "facilitator_invite",
        acceptedAt: keepAcceptedAt,
        revokedAt: null,
        invitedById: invite.invitedById,
        trackBoundaries,
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
