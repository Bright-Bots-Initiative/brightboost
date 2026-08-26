/* @vitest-environment node */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression guards for #700 — "seed enrolls explorer before courses exist
 * (findFirst by teacherId) — on re-seeds explorer resolves g3_5".
 *
 * Root cause: `prisma/seed.cjs` resolved the explorer's class with
 * `course.findFirst({ where: { teacherId } })` executed BEFORE any course was
 * created. Fresh DB → null (explorer in no class). Re-seed → the first course
 * the DB returned, the g3_5 GRADE35 class — and `useGradeBand` reports g3_5
 * when ANY enrolled course is g3_5, so the documented K-2 demo account
 * silently exercised the grade 3-5 band.
 *
 * Two layers of proof:
 *  - behavioral: the extracted reconciliation + environment gate
 *    (`prisma/seedFixtures.cjs`) run against an in-memory store / a real
 *    child process;
 *  - wiring: the seed source actually uses them, in the right order. A
 *    mocked-prisma test cannot see "the resolution ran before the class
 *    existed" — that is a property of the seed's statement order.
 */

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const {
  ALLOW_PRODUCTION_ENV,
  evaluateSeedTarget,
  evaluateSeedWipe,
  isProductionShapedDatabaseUrl,
  syncFixtureEnrollment,
} = require_("../seedFixtures.cjs");

const LOCAL_URL = "postgresql://u:p@127.0.0.1:5435/brightboost";
const REMOTE_URL = "postgresql://u:p@db.example.supabase.co:5432/postgres";

const ROOT_SEED = path.resolve(here, "../seed.cjs");
const BACKEND_SEED = path.resolve(repoRoot, "backend/prisma/seed.cjs");
const ROOT_FIXTURES = path.resolve(here, "../seedFixtures.cjs");
const BACKEND_FIXTURES = path.resolve(
  repoRoot,
  "backend/prisma/seedFixtures.cjs",
);

const seedSrc = readFileSync(ROOT_SEED, "utf8");

// ---------------------------------------------------------------------------
// In-memory stand-in for the two Prisma calls the reconciliation makes.
// ---------------------------------------------------------------------------

type Row = { studentId: string; courseId: string };

function makeStore(initial: Row[] = []) {
  const rows: Row[] = initial.map((r) => ({ ...r }));
  return {
    rows,
    enrollment: {
      async deleteMany({
        where,
      }: {
        where: { studentId: string; courseId?: { not?: string } };
      }) {
        const keepCourseId = where.courseId?.not;
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          if (row.studentId !== where.studentId) continue;
          if (keepCourseId !== undefined && row.courseId === keepCourseId)
            continue;
          rows.splice(i, 1);
          count++;
        }
        return { count };
      },
      async upsert({
        where,
        create,
      }: {
        where: { studentId_courseId: Row };
        create: Row;
        update: Record<string, unknown>;
      }) {
        const key = where.studentId_courseId;
        const found = rows.find(
          (r) => r.studentId === key.studentId && r.courseId === key.courseId,
        );
        if (found) return found;
        const row = { ...create };
        rows.push(row);
        return row;
      },
    },
  };
}

/** The band rule `useGradeBand` applies: g3_5 wins if ANY enrolled course is g3_5. */
const COURSE_BANDS: Record<string, "k2" | "g3_5"> = {
  "course-stars1": "k2",
  "course-grade35": "g3_5",
};

function resolveBand(rows: Row[], studentId: string): "k2" | "g3_5" {
  const enrolled = rows.filter((r) => r.studentId === studentId);
  return enrolled.some((r) => COURSE_BANDS[r.courseId] === "g3_5")
    ? "g3_5"
    : "k2";
}

function snapshot(rows: Row[]) {
  return rows
    .map((r) => `${r.studentId}->${r.courseId}`)
    .sort()
    .join("|");
}

/** Every fixture enrollment the seed performs, in seed order. */
async function runFixtureEnrollments(store: ReturnType<typeof makeStore>) {
  await syncFixtureEnrollment(store, "student-123", "course-stars1");
  await syncFixtureEnrollment(store, "explorer-set2", "course-stars1");
  await syncFixtureEnrollment(store, "jordan-g35", "course-grade35");
}

// ---------------------------------------------------------------------------

describe("fixture enrollment is deterministic across re-seeds (#700)", () => {
  it("puts the K-2 demo students in the k2 class and Jordan in the g3_5 class", async () => {
    const store = makeStore();
    await runFixtureEnrollments(store);

    expect(snapshot(store.rows)).toBe(
      "explorer-set2->course-stars1|jordan-g35->course-grade35|student-123->course-stars1",
    );
    expect(resolveBand(store.rows, "explorer-set2")).toBe("k2");
    expect(resolveBand(store.rows, "student-123")).toBe("k2");
    expect(resolveBand(store.rows, "jordan-g35")).toBe("g3_5");
  });

  it("two consecutive runs produce byte-identical fixture state", async () => {
    const store = makeStore();
    await runFixtureEnrollments(store);
    const afterFirst = snapshot(store.rows);
    await runFixtureEnrollments(store);
    const afterSecond = snapshot(store.rows);

    expect(afterSecond).toBe(afterFirst);
    expect(resolveBand(store.rows, "explorer-set2")).toBe("k2");
  });

  it("is idempotent — repeat runs never duplicate an enrollment", async () => {
    const store = makeStore();
    await runFixtureEnrollments(store);
    await runFixtureEnrollments(store);
    await runFixtureEnrollments(store);

    expect(store.rows).toHaveLength(3);
    expect(
      store.rows.filter((r) => r.studentId === "explorer-set2"),
    ).toHaveLength(1);
  });

  it("heals a database still carrying the pre-fix g3_5 enrollment", async () => {
    // Exactly what a re-seeded DB looked like before this fix: the K-2 demo
    // account sitting in the grade 3-5 class.
    const store = makeStore([
      { studentId: "explorer-set2", courseId: "course-grade35" },
    ]);
    expect(resolveBand(store.rows, "explorer-set2")).toBe("g3_5");

    await runFixtureEnrollments(store);

    expect(
      store.rows.filter((r) => r.studentId === "explorer-set2"),
    ).toStrictEqual([
      { studentId: "explorer-set2", courseId: "course-stars1" },
    ]);
    expect(resolveBand(store.rows, "explorer-set2")).toBe("k2");
  });

  it("only touches the fixture student it is given", async () => {
    const store = makeStore([
      { studentId: "real-kid", courseId: "course-grade35" },
    ]);
    await runFixtureEnrollments(store);

    expect(store.rows).toContainEqual({
      studentId: "real-kid",
      courseId: "course-grade35",
    });
  });
});

describe("seed wiring: no order-dependent course resolution (#700)", () => {
  it("never resolves a fixture class with findFirst-by-teacherId", () => {
    expect(seedSrc).not.toContain("prisma.course.findFirst");
  });

  it("enrolls the fixture students only after the K-2 class is created", () => {
    const starsIdx = seedSrc.indexOf('joinCode: "STARS1"');
    const fixtureIdx = seedSrc.indexOf("fixtureEnrollments");
    expect(starsIdx).toBeGreaterThan(-1);
    expect(fixtureIdx).toBeGreaterThan(-1);
    expect(fixtureIdx).toBeGreaterThan(starsIdx);
  });

  it("names each fixture student's class explicitly", () => {
    const block = seedSrc.slice(
      seedSrc.indexOf("const fixtureEnrollments"),
      seedSrc.indexOf("const fixtureEnrollments") + 400,
    );
    expect(block).toMatch(/user: student,\s*course: starsClass/);
    expect(block).toMatch(/user: explorer,\s*course: starsClass/);
    expect(block).toMatch(/user: jordan,\s*course: g35Class/);
  });

  it("checks the environment gate before the client is built and before any write", () => {
    const gateIdx = seedSrc.indexOf("evaluateSeedTarget(process.env)");
    const clientIdx = seedSrc.indexOf("new PrismaClient()");
    const firstWriteIdx = seedSrc.indexOf("await prisma.");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(firstWriteIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(clientIdx);
    expect(gateIdx).toBeLessThan(firstWriteIdx);
  });

  it("keeps root and backend seed trees byte-identical (sync invariant)", () => {
    expect(readFileSync(BACKEND_SEED, "utf8")).toBe(seedSrc);
    expect(readFileSync(BACKEND_FIXTURES, "utf8")).toBe(
      readFileSync(ROOT_FIXTURES, "utf8"),
    );
  });
});

describe("seed environment gate refuses production targets (#700)", () => {
  it("allows a local environment", () => {
    expect(
      evaluateSeedTarget({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://u:p@localhost:5435/brightboost",
      }).allowed,
    ).toBe(true);
    expect(
      evaluateSeedTarget({
        DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/brightboost_test",
      }).allowed,
    ).toBe(true);
    // WHATWG URL reports an IPv6 host with its brackets — "[::1]", not "::1".
    expect(
      evaluateSeedTarget({ DATABASE_URL: "postgresql://u:p@[::1]:5432/bb" })
        .allowed,
    ).toBe(true);
    expect(
      isProductionShapedDatabaseUrl("postgresql://u:p@[::1]:5432/bb"),
    ).toBe(false);
  });

  it("refuses a missing or empty DATABASE_URL as could-not-run (code 2)", () => {
    for (const env of [{}, { DATABASE_URL: "" }, { DATABASE_URL: "   " }]) {
      const verdict = evaluateSeedTarget(env);
      expect(verdict.allowed).toBe(false);
      expect(verdict.code, "missing config is 2, not property-false 1").toBe(2);
      expect(verdict.reason).toMatch(/DATABASE_URL is not set/);
    }
    // Not even the operator opt-in can seed a target that was never named.
    expect(evaluateSeedTarget({ [ALLOW_PRODUCTION_ENV]: "true" }).allowed).toBe(
      false,
    );
  });

  it("refuses NODE_ENV=production", () => {
    const verdict = evaluateSeedTarget({
      NODE_ENV: "production",
      DATABASE_URL: LOCAL_URL,
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.code ?? 1).toBe(1);
    expect(verdict.reason).toMatch(/NODE_ENV=production/);
  });

  it("refuses a non-local DATABASE_URL even without NODE_ENV", () => {
    const verdict = evaluateSeedTarget({ DATABASE_URL: REMOTE_URL });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/not a local database/);
    expect(isProductionShapedDatabaseUrl("postgresql://u:p@host/db")).toBe(
      true,
    );
    expect(isProductionShapedDatabaseUrl("not-a-url")).toBe(true);
  });

  it('honours the explicit operator opt-in, exact "true" only', () => {
    expect(
      evaluateSeedTarget({
        NODE_ENV: "production",
        DATABASE_URL: LOCAL_URL,
        [ALLOW_PRODUCTION_ENV]: "true",
      }).allowed,
    ).toBe(true);
    for (const value of ["TRUE", "1", "yes", ""]) {
      expect(
        evaluateSeedTarget({
          NODE_ENV: "production",
          DATABASE_URL: LOCAL_URL,
          [ALLOW_PRODUCTION_ENV]: value,
        }).allowed,
        `${ALLOW_PRODUCTION_ENV}=${JSON.stringify(value)} must not enable the seed`,
      ).toBe(false);
    }
  });
});

describe("write permission is not delete permission (#700 review B1)", () => {
  it("does NOT wipe on the documented operator-shell override", () => {
    // DEPLOYMENT.md tells an operator to run
    //   SEED_ALLOW_PRODUCTION=true npx prisma db seed
    // from a shell where NODE_ENV is normally unset. That passes the write
    // gate; it must not also authorise the users/progress/modules deleteMany.
    const env = {
      [ALLOW_PRODUCTION_ENV]: "true",
      DATABASE_URL: REMOTE_URL,
    };
    expect(evaluateSeedTarget(env).allowed).toBe(true);
    const wipe = evaluateSeedWipe(env);
    expect(wipe.shouldWipe).toBe(false);
    expect(wipe.reason).toMatch(/not a local database/);
  });

  it("does NOT wipe a remote target even with no flags at all", () => {
    expect(evaluateSeedWipe({ DATABASE_URL: REMOTE_URL }).shouldWipe).toBe(
      false,
    );
  });

  it("leaves the Railway path unchanged (NODE_ENV=production never wipes)", () => {
    expect(
      evaluateSeedWipe({ NODE_ENV: "production", DATABASE_URL: LOCAL_URL })
        .shouldWipe,
    ).toBe(false);
    expect(
      evaluateSeedWipe({ NODE_ENV: "production", DATABASE_URL: REMOTE_URL })
        .shouldWipe,
    ).toBe(false);
  });

  it("still wipes a local target by default, and honours SEED_RESET both ways", () => {
    expect(evaluateSeedWipe({ DATABASE_URL: LOCAL_URL }).shouldWipe).toBe(true);
    expect(
      evaluateSeedWipe({ DATABASE_URL: LOCAL_URL, SEED_RESET: "false" })
        .shouldWipe,
    ).toBe(false);
    // SEED_RESET=true is the wipe's own opt-in and still wins everywhere.
    expect(
      evaluateSeedWipe({
        DATABASE_URL: REMOTE_URL,
        NODE_ENV: "production",
        SEED_RESET: "true",
      }).shouldWipe,
    ).toBe(true);
  });

  it("decides the wipe before the Prisma client is constructed", () => {
    const wipeIdx = seedSrc.indexOf("evaluateSeedWipe(process.env)");
    const clientIdx = seedSrc.indexOf("new PrismaClient()");
    const deleteIdx = seedSrc.indexOf("deleteMany()");
    expect(wipeIdx).toBeGreaterThan(-1);
    expect(wipeIdx).toBeLessThan(clientIdx);
    expect(wipeIdx).toBeLessThan(deleteIdx);
    // The old predicate must be gone — it keyed the wipe on NODE_ENV only.
    expect(seedSrc).not.toContain("!isProduction && !forceNoReset");
  });
});

function runSeed(
  env: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["prisma/seed.cjs"], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: `${output}\nspawn timeout\n` });
    }, timeoutMs);
    const collect = (chunk: Buffer | string) => {
      output += String(chunk);
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: 2, output: `${output}\n${err.message}` });
    });
  });
}

describe("seed process refuses to run in production (#700)", () => {
  it("exits 1 with no writes when NODE_ENV=production", async () => {
    const env = {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: LOCAL_URL,
    };
    delete env[ALLOW_PRODUCTION_ENV];
    const { status, output } = await runSeed(env);

    expect(
      status,
      `NODE_ENV=production must exit 1, got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/SEED REFUSED/);
    expect(output).toMatch(/No writes performed/);
    expect(output).not.toMatch(/Cleaning up database/);
    expect(output).not.toMatch(/Seeding users/);
    expect(output).not.toMatch(/SEED COMPLETED SUCCESSFULLY/);
    // The refusal happens before a Prisma client is even constructed.
    expect(output).not.toMatch(/@prisma\/client/);
    expect(output).not.toMatch(/Can't reach database/i);
  });

  it("exits 2 when DATABASE_URL is missing (could not run, not property false)", async () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env[ALLOW_PRODUCTION_ENV];
    const { status, output } = await runSeed(env);

    expect(
      status,
      `missing DATABASE_URL must exit 2, got ${status}:\n${output}`,
    ).toBe(2);
    expect(status).not.toBe(1);
    expect(output).toMatch(/DATABASE_URL is not set/);
    expect(output).not.toMatch(/Cleaning up database/);
    expect(output).not.toMatch(/SEED COMPLETED SUCCESSFULLY/);
  });

  it("never wipes on the documented operator-shell override (B1)", async () => {
    // The exact scenario the review reproduced: NODE_ENV unset, the operator
    // opt-in set, and a production-shaped target. 127.0.0.2 is non-loopback by
    // the gate's host rule but refuses the TCP connection instantly, so the
    // case stays fast and DNS-free wherever it runs.
    const env = {
      ...process.env,
      [ALLOW_PRODUCTION_ENV]: "true",
      DATABASE_URL: "postgresql://u:p@127.0.0.2:5432/brightboost",
    };
    delete env.NODE_ENV;
    delete env.SEED_RESET;
    const { output } = await runSeed(env);

    expect(output).toMatch(/Cleanup: skipped/);
    expect(output).toMatch(/not a local database/);
    expect(
      output,
      `the override must never authorise a wipe:\n${output}`,
    ).not.toMatch(/Cleaning up database/);
    expect(output).not.toMatch(/Database cleaned/);
  });
});
