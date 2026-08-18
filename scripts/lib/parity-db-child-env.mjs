/**
 * Deny-by-default child env for parity CI-14 / CI-16 (ticket #740 round 3).
 * Schema-derived names are explicitly SET (never stripped) so Prisma dotenv
 * cannot refill an ambient production URL from disk.
 */

/** Any env var that could steer a Postgres/Prisma connection. */
export const DB_SHAPED_ENV = [
  /DATABASE_URL$/i, // DATABASE_URL, TEST_DATABASE_URL, SHADOW_DATABASE_URL, …
  /^DIRECT_URL$/i,
  /POSTGRES/i, // POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING
  /^PG[A-Z]+$/, // PGHOST PGUSER PGPASSWORD PGDATABASE PGPORT PGSSLMODE
  /^PRISMA_.*URL$/i,
];

/**
 * @param {string} designatedUrl
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} baseEnv
 * @param {Iterable<string>} schemaEnvNames
 * @returns {{ child: Record<string, string>, mustSet: Set<string> }}
 */
export function buildDbChildEnv(designatedUrl, baseEnv, schemaEnvNames) {
  /** @type {Record<string, string>} */
  const child = {};
  for (const [k, v] of Object.entries(baseEnv)) {
    if (v === undefined) continue;
    if (DB_SHAPED_ENV.some((re) => re.test(k))) continue;
    child[k] = v;
  }
  const mustSet = new Set([
    ...schemaEnvNames,
    "TEST_DATABASE_URL",
    "POSTGRES_URL",
  ]);
  for (const name of mustSet) {
    child[name] = designatedUrl;
  }
  return { child, mustSet };
}

/**
 * Positive: every readable name points at the designated database.
 * Negative: no ambient database value survives anywhere in the child env.
 * @param {{
 *   child: Record<string, string>,
 *   mustSet: Set<string>,
 *   designatedUrl: string,
 *   baseEnv: NodeJS.ProcessEnv | Record<string, string | undefined>,
 * }} args
 */
export function assertNoAmbientDbLeak({
  child,
  mustSet,
  designatedUrl,
  baseEnv,
}) {
  for (const name of mustSet) {
    if (child[name] !== designatedUrl) {
      throw new Error(`DB env not redirected: ${name}`);
    }
  }
  const ambientDbValues = Object.entries(baseEnv)
    .filter(([k]) => DB_SHAPED_ENV.some((re) => re.test(k)))
    .map(([, v]) => v)
    .filter((v) => v && v !== designatedUrl);
  for (const [k, v] of Object.entries(child)) {
    if (ambientDbValues.includes(v)) {
      throw new Error(`ambient DB value leaked into child env via ${k}`);
    }
  }
}
