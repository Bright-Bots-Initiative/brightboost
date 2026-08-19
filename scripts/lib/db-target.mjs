/**
 * Designated test-database target checks.
 * Extracted from verify-parity.mjs so other CLIs can reuse them without
 * importing that file's dotenv / main() side effects.
 *
 * Host is not a safety property (SSH tunnels / port-forwards present as localhost).
 * Database name is the URL path segment only (not the host).
 * Token-boundary matching: `contest` must fail; `brightboost_test` must pass.
 */

/**
 * Host + database only — never echo credentials (logs are pasted into PRs).
 * @param {string} url
 * @returns {{ host: string, database: string } | null}
 */
export function describeDbUrl(url) {
  try {
    const u = new URL(url);
    const rawPath = u.pathname || "";
    const withoutQuery = rawPath.split("?")[0];
    const database = decodeURIComponent(withoutQuery.replace(/^\//, "")).split(
      "/",
    )[0];
    return { host: u.hostname, database: database || "" };
  } catch {
    return null;
  }
}

/** Token-boundary test/e2e database names (not substring — `contest` must fail). */
const TEST_DB_NAME = /(^|[_-])(test|tests|e2e)([_-]|$)/i;

/**
 * @param {string} name
 */
export function isDesignatedTestDbName(name) {
  return TEST_DB_NAME.test(name);
}

/**
 * Designated test DB: database name must contain a test/e2e token on a boundary.
 * Host is not a safety property (SSH tunnels / port-forwards present as localhost).
 * @param {string} url
 * @returns {{ ok: true, host: string, database: string } | { ok: false, reason: string, host?: string, database?: string, code?: number }}
 */
export function isDesignatedTestDbUrl(url) {
  const info = describeDbUrl(url);
  if (!info) {
    return {
      ok: false,
      code: 2,
      reason: "TEST_DATABASE_URL is not a parseable URL (could not check)",
    };
  }
  if (isDesignatedTestDbName(info.database)) {
    return { ok: true, host: info.host, database: info.database };
  }
  return {
    ok: false,
    reason: `refusing: database "${info.database}" is not a designated test database (name must contain a test/e2e token, e.g. brightboost_test)`,
    host: info.host,
    database: info.database,
  };
}
