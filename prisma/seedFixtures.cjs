/**
 * Deterministic demo/test fixture helpers for `prisma/seed.cjs` (#700).
 *
 * Three properties this module exists to guarantee:
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
 * 3. **Truthful cleanup.** `runSeedCleanup` reports which tables were actually
 *    cleared and which failed, so the seed can no longer print
 *    "Database cleaned." over a half-wiped database (#812).
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
    // Nothing to judge. Absence is handled as "could not run" by the callers,
    // not as a production signal.
    return false;
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    // Unparseable: cannot prove it is local, so treat it as production-shaped.
    return true;
  }
  // WHATWG URL keeps the brackets on an IPv6 host, so the literal is "[::1]".
  const host = parsed.hostname.toLowerCase();
  return !(host === "localhost" || host === "127.0.0.1" || host === "[::1]");
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
 * `code` follows the repo's reserved exit codes: 1 = property false (refused
 * on purpose), 2 = could not run. Missing configuration is checked first, so
 * an unset DATABASE_URL is reported here rather than surfacing later as a
 * Prisma stack trace (same posture as `scripts/e2e-seed.mjs`).
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ allowed: boolean, reason: string, code?: number }}
 */
function evaluateSeedTarget(env = {}) {
  if (!env.DATABASE_URL || String(env.DATABASE_URL).trim() === "") {
    return {
      allowed: false,
      code: 2,
      reason:
        "cannot seed: DATABASE_URL is not set. Point it at a local database (see SETUP.md).",
    };
  }
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
 * Decide whether the seed may WIPE the database before reseeding.
 *
 * Separate from `evaluateSeedTarget` on purpose: passing the write gate is not
 * consent to delete. `SEED_ALLOW_PRODUCTION=true` says "yes, write to this
 * target"; only `SEED_RESET=true` says "yes, delete what is there first".
 * Before that split, the documented hand-run
 * `SEED_ALLOW_PRODUCTION=true npx prisma db seed` from an operator shell (where
 * NODE_ENV is normally unset) passed the gate and then ran the full
 * users/progress/modules `deleteMany` against the remote target.
 *
 * Precedence, preserving the original semantics and adding the remote check:
 *   SEED_RESET=true   → wipe (explicit request; still wins everywhere)
 *   SEED_RESET=false  → no wipe
 *   NODE_ENV=production → no wipe (unchanged; this is the Railway path)
 *   non-local DATABASE_URL → no wipe (new)
 *   otherwise → wipe (local dev default)
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ shouldWipe: boolean, reason: string }}
 */
function evaluateSeedWipe(env = {}) {
  if (env.SEED_RESET === "true") {
    return {
      shouldWipe: true,
      reason: "SEED_RESET=true (explicitly requested)",
    };
  }
  if (env.SEED_RESET === "false") {
    return { shouldWipe: false, reason: "SEED_RESET=false" };
  }
  if (env.NODE_ENV === "production") {
    return { shouldWipe: false, reason: "NODE_ENV=production" };
  }
  if (isProductionShapedDatabaseUrl(env.DATABASE_URL)) {
    return {
      shouldWipe: false,
      reason: `DATABASE_URL is not a local database — ${ALLOW_PRODUCTION_ENV} permits writing, never deleting; set SEED_RESET=true to wipe on purpose`,
    };
  }
  return { shouldWipe: true, reason: "local target, SEED_RESET unset" };
}

/**
 * Tables the seed wipe clears, in FK-safe order (children before parents).
 *
 * This list is the *authorised* blast radius (#797), and it is deliberately
 * narrower than the schema: `Course`, `Enrollment`, the Pathways tables and
 * everything else holding real classroom rows are never deleted. Widening it
 * is a separate, gated decision — the seed must not quietly grow teeth.
 */
const SEED_WIPE_TABLES = Object.freeze([
  "matchTurn",
  "match",
  "unlockedAbility",
  "ability",
  "progress",
  "avatar",
  "activity",
  "lesson",
  "unit",
  "userBadge",
  "badge",
  "module",
  "user",
]);

/**
 * Run the wipe one table at a time and report what actually happened (#812).
 *
 * The old block wrapped the whole sequence in a single `catch` that logged a
 * warning and then printed "Database cleaned." regardless — so a half-wiped
 * database read as a clean one, which is the state an operator trusts and
 * acts on.
 *
 * Stops at the FIRST failure on purpose. The list is FK-ordered, so once a
 * delete fails every later one is unsound, and pushing on would delete MORE
 * than the pre-fix code ever did. The caller gets three sets instead of one
 * claim: cleared, the table that failed, and the tables never attempted.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {readonly string[]} tables
 * @returns {Promise<{ ok: boolean, cleared: string[], failed: null | { table: string, code: string | null, message: string }, notAttempted: string[] }>}
 */
async function runSeedCleanup(prisma, tables = SEED_WIPE_TABLES) {
  const cleared = [];
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    try {
      const delegate = prisma ? prisma[table] : null;
      if (!delegate || typeof delegate.deleteMany !== "function") {
        throw new Error(`no Prisma delegate named "${table}"`);
      }
      await delegate.deleteMany();
      cleared.push(table);
    } catch (error) {
      return {
        ok: false,
        cleared,
        failed: {
          table,
          code: (error && error.code) || null,
          message: (error && error.message) || String(error),
        },
        notAttempted: tables.slice(i + 1),
      };
    }
  }
  return { ok: true, cleared, failed: null, notAttempted: [] };
}

/**
 * Render a cleanup outcome. Shared by the seed and its tests so the wording an
 * operator reads is asserted rather than guessed.
 *
 * @param {Awaited<ReturnType<typeof runSeedCleanup>>} result
 * @returns {string}
 */
function formatSeedCleanupReport(result) {
  if (result.ok) {
    return `Database cleaned — ${result.cleared.length} tables: ${result.cleared.join(", ")}.`;
  }
  const { table, code, message } = result.failed;
  const lines = [
    `CLEANUP FAILED at ${table}.deleteMany()${code ? ` (${code})` : ""}: ${message}`,
    `  cleared:       ${result.cleared.length ? result.cleared.join(", ") : "(none)"}`,
    `  failed:        ${table}`,
    `  not attempted: ${result.notAttempted.length ? result.notAttempted.join(", ") : "(none)"}`,
    result.cleared.length
      ? "The database is PARTIALLY WIPED. It is not clean; do not treat it as clean."
      : "Nothing was deleted. The database is unchanged and was never cleaned.",
  ];
  if (code === "P2003" || /foreign key/i.test(message)) {
    lines.push(
      `A row outside the wipe list still references ${table}. Course.teacherId is the observed case (#812): the wipe never deletes Course, so any course — including the ones this seed itself created on an earlier run — blocks user.deleteMany().`,
      "Re-seed without wiping (SEED_RESET=false npx prisma db seed — the seed is idempotent and appends), or drop and recreate the local database. Widening the wipe to Course and its dependents is a separate, gated decision; this seed will not take it silently.",
    );
  }
  return lines.join("\n");
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
  SEED_WIPE_TABLES,
  describeTarget,
  evaluateSeedTarget,
  evaluateSeedWipe,
  formatSeedCleanupReport,
  isProductionShapedDatabaseUrl,
  runSeedCleanup,
  syncFixtureEnrollment,
};
