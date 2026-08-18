/**
 * Names Prisma will read for a database connection, derived from the schema.
 * Only connection keys: url / directUrl / shadowDatabaseUrl — not provider=env(...).
 * @param {string} schemaText
 * @returns {Set<string>}
 */
export function datasourceEnvNames(schemaText) {
  const names = new Set();
  const blocks = schemaText.matchAll(/datasource\s+\w+\s*\{([\s\S]*?)\}/g);
  for (const b of blocks) {
    const pairs = b[1].matchAll(
      /^\s*(url|directUrl|shadowDatabaseUrl)\s*=\s*env\(\s*"([^"]+)"\s*\)/gm,
    );
    for (const p of pairs) names.add(p[2]);
  }
  return names;
}
