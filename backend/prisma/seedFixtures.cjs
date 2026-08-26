/**
 * Deterministic demo/test fixture helpers for `prisma/seed.cjs` (#700).
 *
 * Two properties this module exists to guarantee:
 *
 * 1. **Deterministic enrollment.** The seed used to resolve the explorer's
 *    class with `course.findFirst({ where: { teacherId } })`, executed BEFORE
 *    any course was created: null on a fresh DB (explorer in no class) and,
 *    on a re-seed, whichever course the DB happened to return first — the
 *    `g3_5` GRADE35 class. The documented K-2 account therefore resolved band
 *    `g3_5` (`useGradeBand` returns `g3_5` if ANY enrolled course is `g3_5`).
 *    `syncFixtureEnrollment` replaces that with an explicit, reconciled
 *    enrollment: the fixture student ends every run enrolled in exactly one
 *    course — the one the fixture names.
 *
 * 2. **Environment gating.** These are fixtures, not an auth path: the seed
 *    creates demo accounts with documented plaintext passwords and refreshes
 *    their hashes on every run. `evaluateSeedTarget` refuses production
 *    conditions before any write unless an operator opts in explicitly.
 *    (`predeploy.sh` already gates the deploy-time call behind `RUN_SEED`;
 *    this guard also covers `npx prisma db seed` run by hand.)
 *
 * Mirrored byte-for-byte at `backend/prisma/seedFixtures.cjs`, like the seed
 * itself — see the sync assertion in `prisma/__tests__/`.
 */

/** Operator opt-in for production-shaped targets. Exact "true" only, matching the RUN_SEED convention. */
const ALLOW_PRODUCTION_ENV = "SEED_ALLOW_PRODUCTION";

/**
 * Is this connection string pointed at something production-shaped?
 * Loopback is the only shape treated as safe. Mirrors the G-002 rule already
 * enforced for the E2E seed (`scripts/e2e-seed.mjs`); duplicated rather than
 * imported because the seed is CommonJS and that helper is ESM.
 *
 * @param {string | undefined} urlString
 * @returns {boolean}
 */
function isProductionShapedDatabaseUrl(urlString) {
  if (!urlString || String(urlString).trim() === "") {
    // Nothing to judge — Prisma will fail on its own; not a production signal.
    return false;
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    // Unparseable: cannot prove it is local, so treat it as production-shaped.
    return true;
  }
  const host = parsed.hostname.toLowerCase();
  return !(host === "localhost" || host === "127.0.0.1" || host === "::1");
}

/**
 * Host + database only — never echo credentials (seed logs get pasted into PRs).
 *
 * @param {string | undefined} urlString
 * @returns {{ host: string, database: string } | null}
 */
function describeTarget(urlString) {
  try {
    const u = new URL(String(urlString));
    const database = decodeURIComponent(
      (u.pathname || "").split("?")[0].replace(/^\//, ""),
    ).split("/")[0];
    return { host: u.hostname, database };
  } catch {
    return null;
  }
}

/**
 * Decide whether the demo seed may write to this target.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ allowed: boolean, reason: string }}
 */
function evaluateSeedTarget(env = {}) {
  if (env[ALLOW_PRODUCTION_ENV] === "true") {
    return {
      allowed: true,
      reason: `${ALLOW_PRODUCTION_ENV}=true — production guard explicitly overridden by the operator`,
    };
  }
  if (env.NODE_ENV === "production") {
    return {
      allowed: false,
      reason: `refusing to seed: NODE_ENV=production. The seed is a demo/test fixture (it creates demo accounts and rewrites their password hashes). Set ${ALLOW_PRODUCTION_ENV}=true to bootstrap a fresh production database on purpose.`,
    };
  }
  if (isProductionShapedDatabaseUrl(env.DATABASE_URL)) {
    return {
      allowed: false,
      reason: `refusing to seed: DATABASE_URL is not a local database. The seed is a demo/test fixture (it creates demo accounts and rewrites their password hashes). Set ${ALLOW_PRODUCTION_ENV}=true to seed a remote database on purpose.`,
    };
  }
  return { allowed: true, reason: "local/non-production target" };
}

/**
 * Enroll a fixture student in exactly one course, converging on repeat runs.
 *
 * Deletes the student's enrollments in every OTHER course first, so a database
 * carrying the pre-#700 enrollment (explorer in the g3_5 GRADE35 class) heals
 * on the next seed instead of keeping two bands live. Scoped to the single
 * synthetic fixture student passed in — it never touches real rosters.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string} studentId
 * @param {string} courseId
 */
async function syncFixtureEnrollment(prisma, studentId, courseId) {
  await prisma.enrollment.deleteMany({
    where: { studentId, courseId: { not: courseId } },
  });
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: { studentId, courseId },
    update: {},
  });
}

module.exports = {
  ALLOW_PRODUCTION_ENV,
  describeTarget,
  evaluateSeedTarget,
  isProductionShapedDatabaseUrl,
  syncFixtureEnrollment,
};
