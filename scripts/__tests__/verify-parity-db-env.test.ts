/* @vitest-environment node */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

function pathToFileUrl(p: string): string {
  return pathToFileURL(p).href;
}

describe("verify-parity DB child env (round 3 / #740)", () => {
  const prod = "postgresql://u:p@prod.example.com:5432/brightboost";
  const prodDirect =
    "postgresql://u:p@prod-direct.example.com:5432/brightboost";
  const localTest = "postgresql://u:p@localhost:5432/brightboost_test";

  it("redirects DIRECT_URL and drops ambient prod-direct from the child env", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/parity-db-child-env.mjs"))
    );
    const schemaMod = await import(
      pathToFileUrl(
        path.join(repoRoot, "scripts/lib/prisma-datasource-env.mjs"),
      )
    );
    const schemaText = `
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
`;
    const schemaEnvNames = schemaMod.datasourceEnvNames(schemaText);
    const baseEnv = {
      PATH: "/usr/bin",
      DATABASE_URL: prod,
      DIRECT_URL: prodDirect,
      TEST_DATABASE_URL: localTest,
      NODE_ENV: "test",
    };
    const { child, mustSet } = mod.buildDbChildEnv(
      localTest,
      baseEnv,
      schemaEnvNames,
    );
    mod.assertNoAmbientDbLeak({
      child,
      mustSet,
      designatedUrl: localTest,
      baseEnv,
    });
    expect(child.DIRECT_URL).toBe(localTest);
    expect(Object.values(child).some((v) => v.includes("prod-direct"))).toBe(
      false,
    );
    expect(Object.values(child)).not.toContain(prodDirect);
  });

  it("drops unknown DB-shaped ambient values (class, not instance)", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/parity-db-child-env.mjs"))
    );
    const nonPooling = "postgresql://u:p@pooler.prod.example.com:5432/x";
    const pgHost = "prod.example.com";
    const baseEnv = {
      PATH: "/usr/bin",
      POSTGRES_URL_NON_POOLING: nonPooling,
      PGHOST: pgHost,
      HOME: "/home/dev",
    };
    const { child, mustSet } = mod.buildDbChildEnv(
      localTest,
      baseEnv,
      new Set(["DATABASE_URL", "DIRECT_URL"]),
    );
    mod.assertNoAmbientDbLeak({
      child,
      mustSet,
      designatedUrl: localTest,
      baseEnv,
    });
    expect(Object.values(child)).not.toContain(nonPooling);
    expect(Object.values(child)).not.toContain(pgHost);
    expect(child.POSTGRES_URL_NON_POOLING).toBeUndefined();
    expect(child.PGHOST).toBeUndefined();
  });

  it("derives SHADOW_DATABASE_URL into mustSet without runner edits", async () => {
    const schemaMod = await import(
      pathToFileUrl(
        path.join(repoRoot, "scripts/lib/prisma-datasource-env.mjs"),
      )
    );
    const envMod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/parity-db-child-env.mjs"))
    );
    const schemaText = `
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
`;
    const names = schemaMod.datasourceEnvNames(schemaText);
    expect(names.has("SHADOW_DATABASE_URL")).toBe(true);
    const { child, mustSet } = envMod.buildDbChildEnv(
      localTest,
      { PATH: "/usr/bin" },
      names,
    );
    expect(mustSet.has("SHADOW_DATABASE_URL")).toBe(true);
    expect(child.SHADOW_DATABASE_URL).toBe(localTest);
  });

  it("does not treat provider = env(...) as a connection URL name", async () => {
    const schemaMod = await import(
      pathToFileUrl(
        path.join(repoRoot, "scripts/lib/prisma-datasource-env.mjs"),
      )
    );
    const envMod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/parity-db-child-env.mjs"))
    );
    const schemaText = `
datasource db {
  provider  = env("DB_PROVIDER")
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
`;
    const names = schemaMod.datasourceEnvNames(schemaText);
    expect(names.has("DB_PROVIDER")).toBe(false);
    const { child } = envMod.buildDbChildEnv(
      localTest,
      { PATH: "/usr/bin", DB_PROVIDER: "postgresql" },
      names,
    );
    expect(child.DB_PROVIDER).toBe("postgresql");
    expect(child.DB_PROVIDER).not.toBe(localTest);
  });

  it("loadSchemaDatasourceEnvNames exits could-not-run (2) on unparseable schema", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const fs = await import("node:fs");
    const os = await import("node:os");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bb-schema-"));
    try {
      fs.mkdirSync(path.join(tmp, "prisma"), { recursive: true });
      fs.mkdirSync(path.join(tmp, "backend", "prisma"), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, "prisma", "schema.prisma"),
        "not a datasource block\n",
        "utf8",
      );
      fs.writeFileSync(
        path.join(tmp, "backend", "prisma", "schema.prisma"),
        'datasource db { provider = "postgresql" url = env("DATABASE_URL") }\n',
        "utf8",
      );
      const result = mod.loadSchemaDatasourceEnvNames(tmp);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(2);
        expect(result.reason).toMatch(/zero datasource env names/i);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("child keys matching DB_SHAPED_ENV are only those in mustSet", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/lib/parity-db-child-env.mjs"))
    );
    const baseEnv = {
      PATH: "/usr/bin",
      DATABASE_URL: prod,
      DIRECT_URL: prodDirect,
      TEST_DATABASE_URL: localTest,
      POSTGRES_URL: prod,
      POSTGRES_URL_NON_POOLING: "postgresql://leak",
      PGHOST: "evil.example.com",
      PRISMA_SCHEMA_ENGINE_BINARY: "/bin/engine",
    };
    const { child, mustSet } = mod.buildDbChildEnv(
      localTest,
      baseEnv,
      new Set(["DATABASE_URL", "DIRECT_URL"]),
    );
    for (const k of Object.keys(child)) {
      if (mod.DB_SHAPED_ENV.some((re: RegExp) => re.test(k))) {
        expect(mustSet.has(k), `unexpected DB-shaped key ${k}`).toBe(true);
      }
    }
  });
});
