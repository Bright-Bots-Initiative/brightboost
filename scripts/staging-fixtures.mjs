#!/usr/bin/env node
/**
 * staging-fixtures — bounded synthetic fixtures for the STAGING database
 * (BRAND_R0). Proves the target is not production before any write, refuses
 * unknown hosts, never wipes a remote database, and leaves only synthetic
 * accounts with non-default passwords behind.
 *
 * What it does:
 *   1. Requires DATABASE_URL and STAGING_DB_TOKEN (a token that must appear in
 *      the URL's host or user — for Supabase, the staging project ref).
 *   2. Refuses when the URL contains any production token (the production
 *      Supabase ref), a loopback host (use the local seed for that), or lacks
 *      the staging token — "unknown host".
 *   3. Runs the curriculum + demo-account seed (prisma/seed.cjs) with the wipe
 *      forbidden (SEED_RESET=false) and the remote-write opt-in set for this
 *      one process. The seed creates modules/lessons/activities and the
 *      documented demo accounts — all synthetic.
 *   4. Rotates EVERY user's password (staging holds only synthetic users) to
 *      one generated value and writes it to a local 0600 file, so staging never
 *      runs with the publicly documented demo passwords.
 *
 * Usage:
 *   DATABASE_URL=<staging DIRECT_URL> STAGING_DB_TOKEN=<staging ref> node scripts/staging-fixtures.mjs
 *   Optional: STAGING_FIXTURE_PASSWORD=<value> to use a known password instead of generating one;
 *             STAGING_FIXTURE_CREDENTIALS_PATH to choose where the credentials file is written.
 *
 * Exit 0 = fixtures present; 1 = refused (no writes) or a step failed; 2 = usage.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describeDbUrl } from "./lib/db-target.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Tokens that identify the PRODUCTION database. Any match is refused. */
export const PRODUCTION_DB_TOKENS = ["rjpztbtkdwwdmnbbrqmm"];

/**
 * Pure: decide whether a URL may receive staging fixtures.
 * @returns {{ ok: true, host: string, database: string } | { ok: false, code: 1 | 2, reason: string }}
 */
export function evaluateStagingTarget(
  url,
  stagingToken,
  productionTokens = PRODUCTION_DB_TOKENS,
) {
  if (!url || !String(url).trim())
    return { ok: false, code: 2, reason: "DATABASE_URL is not set" };
  const token = String(stagingToken ?? "").trim();
  if (!token || token.length < 8)
    return {
      ok: false,
      code: 2,
      reason: "STAGING_DB_TOKEN must name the staging database (≥ 8 chars)",
    };
  const info = describeDbUrl(url);
  if (!info)
    return {
      ok: false,
      code: 2,
      reason: "DATABASE_URL is not a parseable URL",
    };
  const lower = String(url).toLowerCase();
  for (const prod of productionTokens) {
    if (lower.includes(prod.toLowerCase())) {
      return {
        ok: false,
        code: 1,
        reason: `refusing: DATABASE_URL matches the production token — this is the production database`,
      };
    }
  }
  const host = info.host.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return {
      ok: false,
      code: 1,
      reason:
        "refusing: loopback host — use the local seed (npm run seed) for a local database",
    };
  }
  if (productionTokens.some((p) => token.toLowerCase() === p.toLowerCase())) {
    return {
      ok: false,
      code: 1,
      reason: "refusing: STAGING_DB_TOKEN is the production token",
    };
  }
  let user = "";
  try {
    user = decodeURIComponent(new URL(url).username).toLowerCase();
  } catch {
    user = "";
  }
  if (
    !host.includes(token.toLowerCase()) &&
    !user.includes(token.toLowerCase())
  ) {
    return {
      ok: false,
      code: 1,
      reason: `refusing: unknown host — neither the host (${info.host}) nor the user names the staging token`,
    };
  }
  return { ok: true, host: info.host, database: info.database };
}

async function main() {
  const url = process.env.DATABASE_URL;
  const verdict = evaluateStagingTarget(url, process.env.STAGING_DB_TOKEN);
  if (!verdict.ok) {
    console.error(`[staging-fixtures] ${verdict.reason}. No writes performed.`);
    process.exit(verdict.code);
  }
  console.log(
    `[staging-fixtures] target host=${verdict.host} database=${verdict.database} — staging token matched, production token absent`,
  );

  // Step 1: curriculum + demo accounts via the existing seed, wipe forbidden.
  const seedEnv = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    SEED_RESET: "false",
    SEED_ALLOW_PRODUCTION: "true",
  };
  delete seedEnv.NODE_ENV;
  console.log(
    "[staging-fixtures] running prisma/seed.cjs with SEED_RESET=false (no wipe)",
  );
  const seed = spawnSync(
    process.execPath,
    [path.join(root, "prisma", "seed.cjs")],
    { env: seedEnv, stdio: "inherit" },
  );
  if (seed.status !== 0) {
    console.error(`[staging-fixtures] seed exited ${seed.status}`);
    process.exit(1);
  }

  // Step 2: rotate every password (staging holds only synthetic users).
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const password =
      process.env.STAGING_FIXTURE_PASSWORD?.trim() ||
      crypto.randomBytes(18).toString("base64url");
    const hash = await bcrypt.hash(password, 10);
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    for (const u of users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { password: hash },
      });
    }
    const outPath =
      process.env.STAGING_FIXTURE_CREDENTIALS_PATH ||
      path.join(process.cwd(), "staging-fixture-credentials.local.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          note: "synthetic staging accounts only — never production",
          rotatedAt: new Date().toISOString(),
          password,
          accounts: users.map((u) => u.email),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      `[staging-fixtures] rotated ${users.length} synthetic account password(s); credentials written to ${outPath} (local file, not printed)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    console.error(`[staging-fixtures] failed: ${err?.message ?? err}`);
    process.exit(1);
  });
}
