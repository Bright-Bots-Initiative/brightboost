import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #849 (folded into #877/#878) — the reward transaction under POOL PRESSURE.
 *
 * This file binds the app to the designated test database with
 * `connection_limit=2`, so every completion's interactive transaction must
 * queue for one of two connections. Two things are measured on a real
 * PostgreSQL:
 *
 *   DB-849-1  Thirty concurrent completions for one learner, each a full
 *             claim + reward + level transaction, all answer 200, award
 *             exactly once each, and finish well inside the configured
 *             `timeout`. Per-request latency is printed as evidence.
 *   DB-849-2  A learner's Avatar row is held FOR UPDATE for 3 s while
 *             completions arrive. With two connections both stuck behind the
 *             row lock, every other transaction waits for a connection longer
 *             than Prisma's default `maxWait` of 2 s. On the pre-#849 client
 *             those fail with P2024 (answered 500); with `maxWait: 5000`
 *             they all wait the lock out and succeed. This is the evidence
 *             the chosen setting rests on: the wait is a queue for a
 *             connection, not a held resource, and a classroom burst on a
 *             small pooler-side pool is exactly this shape.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database.
 */
const BASE_URL = process.env.TEST_DATABASE_URL;
if (BASE_URL) {
  const u = new URL(BASE_URL);
  u.searchParams.set("connection_limit", "2");
  process.env.TEST_DATABASE_URL = u.toString();
}
const dbUrl = bindTestDatabase();

type Prisma = typeof import("../../utils/prisma").default;

describe.skipIf(!dbUrl)(
  "#849 reward transaction under pool pressure (connection_limit=2)",
  () => {
    const tag = runTag();
    const ids = {
      teacher: `t-849-${tag}`,
      burst: `s-849-burst-${tag}`,
      held: `s-849-held-${tag}`,
      module: `m-849-${tag}`,
      slug: `k2-pool-${tag}`,
      unit: `u-849-${tag}`,
      lesson: `l-849-${tag}`,
      activities: Array.from({ length: 30 }, (_, i) => `a-849-${i}-${tag}`),
    };

    let app: typeof import("../../server").default;
    let prisma: Prisma;

    let ipSeq = 0;
    const asStudent = (id: string) => {
      ipSeq += 1;
      const block = ipSeq % 2 === 0 ? "198.51.100" : "203.0.113";
      return {
        "x-user-id": id,
        "x-role": "student",
        "X-Forwarded-For": `${block}.${(Math.floor(ipSeq / 2) % 250) + 1}`,
      };
    };
    const complete = (studentId: string, activityId: string) =>
      request(app)
        .post("/api/progress/complete-activity")
        .set(asStudent(studentId))
        .send({ moduleSlug: ids.slug, activityId, timeSpentS: 40 });

    const timed = async <T>(p: Promise<T>) => {
      const t0 = Date.now();
      const v = await p;
      return { v, ms: Date.now() - t0 };
    };
    const pct = (xs: number[], q: number) => {
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(q * s.length))];
    };

    beforeAll(async () => {
      process.env.ALLOW_DEV_ROLE_HEADER = "1";
      app = (await import("../../server")).default;
      prisma = (await import("../../utils/prisma")).default;
      expect(process.env.DATABASE_URL).toBe(dbUrl);
      expect(process.env.DATABASE_URL).toContain("connection_limit=2");

      await prisma.user.createMany({
        data: [
          {
            id: ids.teacher,
            name: "T",
            role: "teacher",
            email: `${ids.teacher}@t.test`,
          },
          {
            id: ids.burst,
            name: "Burst",
            role: "student",
            email: `${ids.burst}@s.test`,
          },
          {
            id: ids.held,
            name: "Held",
            role: "student",
            email: `${ids.held}@s.test`,
          },
        ],
      });
      await prisma.module.create({
        data: {
          id: ids.module,
          slug: ids.slug,
          title: "Pool",
          description: "#849",
          level: "K-2",
          published: true,
        },
      });
      await prisma.unit.create({
        data: {
          id: ids.unit,
          moduleId: ids.module,
          title: "Unit",
          order: 1,
          teacherId: ids.teacher,
        },
      });
      await prisma.lesson.create({
        data: { id: ids.lesson, unitId: ids.unit, title: "Lesson", order: 1 },
      });
      await prisma.activity.createMany({
        data: ids.activities.map((id, i) => ({
          id,
          lessonId: ids.lesson,
          title: `Game ${i}`,
          kind: "INTERACT",
          order: i + 1,
          content: "{}",
        })),
      });
      await prisma.avatar.createMany({
        data: [ids.burst, ids.held].map((studentId) => ({
          studentId,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        })),
      });
    });

    afterAll(async () => {
      const students = [ids.burst, ids.held];
      await prisma.gamePersonalBest.deleteMany({
        where: { studentId: { in: students } },
      });
      await prisma.progress.deleteMany({
        where: { studentId: { in: students } },
      });
      await prisma.activity.deleteMany({ where: { lessonId: ids.lesson } });
      await prisma.lesson.delete({ where: { id: ids.lesson } });
      await prisma.unit.delete({ where: { id: ids.unit } });
      await prisma.module.delete({ where: { id: ids.module } });
      await prisma.user.deleteMany({
        where: { id: { in: [ids.teacher, ...students] } },
      });
      await prisma.$disconnect();
    });

    it("DB-849-1: thirty concurrent completions queue on two connections, all answer, and award exactly once each", async () => {
      const single = await timed(complete(ids.burst, ids.activities[0]));
      expect(single.v.status).toBe(200);

      const t0 = Date.now();
      const results = await Promise.all(
        ids.activities.slice(1).map((a) => timed(complete(ids.burst, a))),
      );
      const wall = Date.now() - t0;
      const latencies = results.map((r) => r.ms);
      const statuses = results.map((r) => r.v.status);
      console.log(
        `[DB-849-1] single completion ${single.ms} ms; 29 concurrent on connection_limit=2: wall ${wall} ms, p50 ${pct(latencies, 0.5)} ms, p95 ${pct(latencies, 0.95)} ms, max ${Math.max(...latencies)} ms, statuses ${JSON.stringify([...new Set(statuses)])}`,
      );
      expect(statuses.every((s) => s === 200)).toBe(true);
      // Every request queued and finished well inside the transaction timeout.
      expect(Math.max(...latencies)).toBeLessThan(5000);

      const avatar = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: ids.burst },
      });
      // 30 completions → level 1 + ⌊30/2⌋ = 16 → 15 transitions × 100, plus 30 × 50.
      expect(avatar.level).toBe(16);
      expect(avatar.xp).toBe(30 * 50 + 15 * 100);
      const xpSum =
        single.v.body.reward.xpDelta +
        results.reduce((s, r) => s + r.v.body.reward.xpDelta, 0);
      expect(xpSum).toBe(avatar.xp);
      const levelSum =
        single.v.body.reward.levelDelta +
        results.reduce((s, r) => s + r.v.body.reward.levelDelta, 0);
      expect(levelSum).toBe(15);
      expect(
        await prisma.progress.count({
          where: { studentId: ids.burst, status: "COMPLETED" },
        }),
      ).toBe(30);
    });

    it("DB-849-2: with the Avatar row held for 3 s, queued completions outlast Prisma's default maxWait and still succeed under the configured one", async () => {
      let release: () => void = () => {};
      let acquired: () => void = () => {};
      const acquiredP = new Promise<void>((r) => (acquired = r));
      const releaseP = new Promise<void>((r) => (release = r));
      const held = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Avatar" WHERE "studentId" = ${ids.held} FOR UPDATE`;
          acquired();
          await releaseP;
        },
        { maxWait: 5000, timeout: 30000 },
      );
      await acquiredP;

      // Eight completions: the first to get the single remaining connection
      // blocks behind the row lock; the rest wait for a connection for the
      // whole 3 s hold — longer than the 2 s Prisma default maxWait.
      const t0 = Date.now();
      const pending = ids.activities
        .slice(0, 8)
        .map((a) => timed(complete(ids.held, a)));
      await new Promise((r) => setTimeout(r, 3000));
      release();
      await held;
      const results = await Promise.all(pending);
      const wall = Date.now() - t0;
      const statuses = results.map((r) => r.v.status);
      console.log(
        `[DB-849-2] lock held 3000 ms; 8 completions on connection_limit=2: wall ${wall} ms, max latency ${Math.max(...results.map((r) => r.ms))} ms, statuses ${JSON.stringify(statuses)}`,
      );
      // RED on the pre-#849 client (maxWait 2000): P2024 → 500 for the queued
      // requests. GREEN with maxWait 5000: every request waited the lock out.
      expect(statuses.every((s) => s === 200)).toBe(true);
      const avatar = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: ids.held },
      });
      expect(avatar.xp).toBe(8 * 50 + 4 * 100);
      expect(avatar.level).toBe(5);
      expect(
        await prisma.progress.count({
          where: { studentId: ids.held, status: "COMPLETED" },
        }),
      ).toBe(8);
    }, 30000);
  },
);
