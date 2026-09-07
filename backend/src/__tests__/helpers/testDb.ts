/**
 * Disposable-PostgreSQL test harness.
 *
 * Suites that need real database semantics (unique constraints, transactions,
 * concurrent writers) opt in with:
 *
 *   const dbUrl = vi.hoisted(() => bindTestDatabase());
 *   describe.skipIf(!dbUrl)("...", () => { ... });
 *
 * `bindTestDatabase()` returns the designated test URL and points
 * `DATABASE_URL` / `DIRECT_URL` at it *before* the app's PrismaClient is
 * constructed (call it inside `vi.hoisted`, which runs ahead of imports).
 * It returns `null` — and the suite skips — when `TEST_DATABASE_URL` is unset.
 *
 * Safety: the database name must carry a bounded `test` / `tests` / `e2e`
 * token (same rule as scripts/lib/db-target.mjs). Anything else is refused
 * before any Prisma call, so a production-shaped URL can never be migrated
 * against or written to by a test run.
 */

const TEST_DB_NAME = /(^|[_-])(test|tests|e2e)([_-]|$)/i;

export function describeDbUrl(
  url: string,
): { host: string; database: string } | null {
  try {
    const u = new URL(url);
    const database = decodeURIComponent(
      (u.pathname || "").split("?")[0].replace(/^\//, ""),
    ).split("/")[0];
    return { host: u.hostname, database: database || "" };
  } catch {
    return null;
  }
}

export function isDesignatedTestDbUrl(url: string): boolean {
  const info = describeDbUrl(url);
  return !!info && TEST_DB_NAME.test(info.database);
}

export function bindTestDatabase(): string | null {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  if (!isDesignatedTestDbUrl(url)) {
    throw new Error(
      `refusing TEST_DATABASE_URL: database name must contain a test/e2e token (e.g. brightboost_test); got "${describeDbUrl(url)?.database ?? "?"}"`,
    );
  }
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  return url;
}

/** Unique-per-run suffix so parallel or repeated runs never collide on ids/emails. */
export function runTag(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
