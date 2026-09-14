import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #877 (DATA-01) + #878 (DATA-02) — the authoritative reward operation on a
 * real PostgreSQL, with CONTROLLED interleavings and fault injection.
 *
 * Interleaving technique: a test transaction takes the learner's Avatar row
 * `FOR UPDATE` and holds it. Completion requests fired meanwhile claim their
 * Progress row and then block at the route's own `FOR UPDATE`; the test
 * proves they are pending (contested), then releases the lock and lets the
 * database serialise them. That is the exact region #878 races in.
 *
 * Fault-injection technique: a trigger scoped to this run's learner raises at
 * one boundary of the reward transaction (base reward, level transition, or
 * ability grant). Nothing in production code exists only for the test.
 *
 * RED on the pre-fix tree (fc48ed31, PR A): DB-878-1 ends at level 2 with a
 * 200 XP bonus and one completion's energy/HP increment overwritten;
 * DB-877-1/2/3 answer 200 with xpDelta 0 while the row is COMPLETED, and the
 * retry is reward-free, so the reward is lost for good; DB-REPAIR-1 ends with
 * the newer reward overwritten by the repair.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database (see
 * helpers/testDb.ts). Locally:
 *   TEST_DATABASE_URL=postgresql://postgres:brightboostpass@127.0.0.1:5435/brightboost_test
 */
const dbUrl = bindTestDatabase();

type Prisma = typeof import("../../utils/prisma").default;

describe.skipIf(!dbUrl)(
  "#877/#878 reward transaction (real PostgreSQL)",
  () => {
    const tag = runTag();
    const ids = {
      teacher: `t-877-${tag}`,
      module: `m-877-${tag}`,
      slug: `k2-rewards-${tag}`,
      unit: `u-877-${tag}`,
      lesson: `l-877-${tag}`,
      activities: Array.from({ length: 8 }, (_, i) => `a-877-${i}-${tag}`),
      abilityA: `ab-877-a-${tag}`,
      abilityB: `ab-877-b-${tag}`,
    };
    const student = (k: string) => `s-877-${k}-${tag}`;
    const STUDENTS = [
      "boundary",
      "lvl",
      "base",
      "abil",
      "dup",
      "fresh",
      "repair",
      "replay",
    ];

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
    const complete = (studentId: string, activityId: string, timeSpentS = 45) =>
      request(app)
        .post("/api/progress/complete-activity")
        .set(asStudent(studentId))
        .send({ moduleSlug: ids.slug, activityId, timeSpentS });

    const completedRow = (studentId: string, activityId: string) => ({
      studentId,
      moduleSlug: ids.slug,
      lessonId: ids.lesson,
      activityId,
      status: "COMPLETED" as const,
      timeSpentS: 10,
    });

    /** Hold the learner's Avatar row FOR UPDATE until `release()` resolves. */
    function holdAvatarLock(
      studentId: string,
      beforeRelease?: (
        tx: Parameters<Parameters<Prisma["$transaction"]>[0]>[0],
      ) => Promise<void>,
    ) {
      let release: () => void = () => {};
      let acquired: () => void = () => {};
      const acquiredP = new Promise<void>((r) => (acquired = r));
      const releaseP = new Promise<void>((r) => (release = r));
      const done = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Avatar" WHERE "studentId" = ${studentId} FOR UPDATE`;
          acquired();
          await releaseP;
          if (beforeRelease) await beforeRelease(tx);
        },
        { maxWait: 5000, timeout: 30000 },
      );
      return { acquired: acquiredP, release, done };
    }

    /** True when the promise is still pending after `ms`. */
    async function stillPending(p: Promise<unknown>, ms: number) {
      const sentinel = Symbol("pending");
      const r = await Promise.race([
        p.then(
          () => "settled" as const,
          () => "settled" as const,
        ),
        new Promise<typeof sentinel>((res) =>
          setTimeout(() => res(sentinel), ms),
        ),
      ]);
      return r === sentinel;
    }

    const raiseFn = `raise_877_${tag.replace(/[^a-z0-9]/gi, "")}`;

    beforeAll(async () => {
      process.env.ALLOW_DEV_ROLE_HEADER = "1";
      app = (await import("../../server")).default;
      prisma = (await import("../../utils/prisma")).default;
      expect(process.env.DATABASE_URL).toBe(dbUrl);

      await prisma.user.createMany({
        data: [
          {
            id: ids.teacher,
            name: "T",
            role: "teacher",
            email: `${ids.teacher}@t.test`,
          },
          ...STUDENTS.map((k) => ({
            id: student(k),
            name: k,
            role: "student",
            email: `${student(k)}@s.test`,
          })),
        ],
      });
      await prisma.module.create({
        data: {
          id: ids.module,
          slug: ids.slug,
          title: "Rewards",
          description: "#877",
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
          // The last activity declares a game so replays carry a personal best.
          content: i === 7 ? JSON.stringify({ gameKey: "move_measure" }) : "{}",
        })),
      });
      await prisma.ability.createMany({
        data: [
          {
            id: ids.abilityA,
            name: "A",
            archetype: "AI",
            reqLevel: 2,
            config: {},
          },
          {
            id: ids.abilityB,
            name: "B",
            archetype: "AI",
            reqLevel: 2,
            config: {},
          },
        ],
      });
      await prisma.$executeRawUnsafe(
        `CREATE OR REPLACE FUNCTION ${raiseFn}() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected fault (#877 test)'; END; $$ LANGUAGE plpgsql;`,
      );
    });

    afterAll(async () => {
      const all = STUDENTS.map(student);
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS ${raiseFn}() CASCADE;`,
      );
      // Order matters: Unit.teacherId → User and GamePersonalBest → User are
      // RESTRICT, so curriculum and records go before the users.
      await prisma.gamePersonalBest.deleteMany({
        where: { studentId: { in: all } },
      });
      await prisma.progress.deleteMany({ where: { studentId: { in: all } } });
      await prisma.activity.deleteMany({ where: { lessonId: ids.lesson } });
      await prisma.lesson.delete({ where: { id: ids.lesson } });
      await prisma.unit.delete({ where: { id: ids.unit } });
      await prisma.module.delete({ where: { id: ids.module } });
      await prisma.user.deleteMany({
        where: { id: { in: [ids.teacher, ...all] } },
      });
      await prisma.ability.deleteMany({
        where: { id: { in: [ids.abilityA, ids.abilityB] } },
      });
      await prisma.$disconnect();
    });

    it("DB-878-1: two distinct completions contesting one level boundary award it once and keep both stat gains, including capped values", async () => {
      const sid = student("boundary");
      // Level 1 with one completion already: the next completion crosses to level 2.
      // energy 98 / hp 99 / speed 99 sit under their caps so both increments are
      // visible only if the second is computed from the first's committed row.
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 98,
          hp: 99,
          speed: 99,
          control: 0,
          focus: 0,
        },
      });
      await prisma.progress.create({
        data: completedRow(sid, ids.activities[0]),
      });

      const lock = holdAvatarLock(sid);
      await lock.acquired;
      const r1 = complete(sid, ids.activities[1]);
      const r2 = complete(sid, ids.activities[2]);
      // Both requests have claimed their Progress rows and are now blocked at
      // the route's FOR UPDATE: the contested execution has actually happened.
      expect(await stillPending(r1, 400)).toBe(true);
      expect(await stillPending(r2, 50)).toBe(true);
      lock.release();
      await lock.done;

      const [a, b] = await Promise.all([r1, r2]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      const rewards = [a.body.reward, b.body.reward].sort(
        (x, y) => x.xpDelta - y.xpDelta,
      );
      // One completion carried the level-2 transition (+100 bonus), the other did not.
      expect(rewards[0]).toEqual({
        xpDelta: 50,
        levelDelta: 0,
        energyDelta: expect.any(Number),
        hpDelta: expect.any(Number),
        newAbilitiesDelta: 0,
      });
      expect(rewards[1]).toEqual({
        xpDelta: 150,
        levelDelta: 1,
        energyDelta: expect.any(Number),
        hpDelta: expect.any(Number),
        newAbilitiesDelta: 0,
      });
      // Deltas are against each request's own locked snapshot: the first sees
      // +2 energy (98→100), the second sees +0 (already capped) — never a
      // stale +5 that would attribute the other completion's change.
      const energyDeltas = [
        a.body.reward.energyDelta,
        b.body.reward.energyDelta,
      ].sort();
      expect(energyDeltas).toEqual([0, 2]);
      const hpDeltas = [a.body.reward.hpDelta, b.body.reward.hpDelta].sort();
      expect(hpDeltas).toEqual([0, 1]);

      const avatar = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: sid },
      });
      expect(avatar.level).toBe(2);
      expect(avatar.xp).toBe(50 + 50 + 100);
      expect(avatar.energy).toBe(100);
      expect(avatar.hp).toBe(100);
      // timeSpentS 45 → speed +2 each; no score → control +1, focus +1 each.
      expect(avatar.speed).toBe(100); // 99 + 2 capped, then +2 capped
      expect(avatar.control).toBe(2);
      expect(avatar.focus).toBe(2);
      expect(
        await prisma.progress.count({
          where: { studentId: sid, status: "COMPLETED" },
        }),
      ).toBe(3);
    });

    it("DB-877-1: a failure after the base reward but before the level transition rolls back the claim; the retry awards exactly once", async () => {
      const sid = student("lvl");
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        },
      });
      await prisma.progress.create({
        data: completedRow(sid, ids.activities[0]),
      });
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER trg_877_lvl BEFORE UPDATE ON "Avatar" FOR EACH ROW WHEN (NEW."studentId" = '${sid}' AND NEW.level > OLD.level) EXECUTE FUNCTION ${raiseFn}();`,
      );
      try {
        const failed = await complete(sid, ids.activities[1]);
        expect(failed.status).toBe(500);
        // Nothing partial: the base reward that succeeded inside the transaction
        // is gone with the claim.
        const after = await prisma.avatar.findUniqueOrThrow({
          where: { studentId: sid },
        });
        expect(after).toMatchObject({ level: 1, xp: 0, energy: 50, hp: 50 });
        expect(
          await prisma.progress.count({
            where: {
              studentId: sid,
              activityId: ids.activities[1],
              status: "COMPLETED",
            },
          }),
        ).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS trg_877_lvl ON "Avatar";`,
        );
      }
      const retry = await complete(sid, ids.activities[1]);
      expect(retry.status).toBe(200);
      expect(retry.body.reward).toMatchObject({
        xpDelta: 150,
        levelDelta: 1,
        energyDelta: 5,
        hpDelta: 2,
      });
      const again = await complete(sid, ids.activities[1]);
      expect(again.status).toBe(200);
      expect(again.body.reward.xpDelta).toBe(0);
      const final = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: sid },
      });
      expect(final).toMatchObject({ level: 2, xp: 150, energy: 55, hp: 52 });
    });

    it("DB-877-2: a failure on the base reward itself leaves the completion unclaimed; the retry awards exactly once", async () => {
      const sid = student("base");
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        },
      });
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER trg_877_base BEFORE UPDATE ON "Avatar" FOR EACH ROW WHEN (NEW."studentId" = '${sid}') EXECUTE FUNCTION ${raiseFn}();`,
      );
      try {
        const failed = await complete(sid, ids.activities[1]);
        expect(failed.status).toBe(500);
        expect(
          await prisma.progress.count({
            where: { studentId: sid, status: "COMPLETED" },
          }),
        ).toBe(0);
        expect(
          (await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }))
            .xp,
        ).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS trg_877_base ON "Avatar";`,
        );
      }
      const retry = await complete(sid, ids.activities[1]);
      expect(retry.status).toBe(200);
      expect(retry.body.reward).toMatchObject({
        xpDelta: 50,
        levelDelta: 0,
        energyDelta: 5,
        hpDelta: 2,
      });
      expect(
        (await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }))
          .xp,
      ).toBe(50);
    });

    it("DB-877-3: a failure during ability grants rolls back the level and the base reward; the retry grants once", async () => {
      const sid = student("abil");
      const avatar = await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "SPECIALIZED",
          archetype: "AI",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        },
      });
      await prisma.progress.create({
        data: completedRow(sid, ids.activities[0]),
      });
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER trg_877_abil BEFORE INSERT ON "UnlockedAbility" FOR EACH ROW WHEN (NEW."avatarId" = '${avatar.id}') EXECUTE FUNCTION ${raiseFn}();`,
      );
      try {
        const failed = await complete(sid, ids.activities[1]);
        expect(failed.status).toBe(500);
        expect(
          await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }),
        ).toMatchObject({ level: 1, xp: 0 });
        expect(
          await prisma.unlockedAbility.count({
            where: { avatarId: avatar.id },
          }),
        ).toBe(0);
        expect(
          await prisma.progress.count({
            where: {
              studentId: sid,
              activityId: ids.activities[1],
              status: "COMPLETED",
            },
          }),
        ).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS trg_877_abil ON "UnlockedAbility";`,
        );
      }
      const retry = await complete(sid, ids.activities[1]);
      expect(retry.status).toBe(200);
      // Every AI ability at or below level 2 in this database is granted once
      // (the two tagged ones at least; a seeded database may carry more).
      const eligible = await prisma.ability.count({
        where: { archetype: "AI", reqLevel: { lte: 2 } },
      });
      expect(eligible).toBeGreaterThanOrEqual(2);
      expect(retry.body.reward).toMatchObject({
        xpDelta: 150,
        levelDelta: 1,
        newAbilitiesDelta: eligible,
      });
      expect(
        await prisma.unlockedAbility.count({ where: { avatarId: avatar.id } }),
      ).toBe(eligible);
      expect(
        await prisma.unlockedAbility.count({
          where: {
            avatarId: avatar.id,
            abilityId: { in: [ids.abilityA, ids.abilityB] },
          },
        }),
      ).toBe(2);
      expect(
        await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }),
      ).toMatchObject({ level: 2, xp: 150 });
    });

    it("DB-821-1: the same activity completed twice while contested awards once; the loser is a replay", async () => {
      const sid = student("dup");
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        },
      });
      // #850 matrix: the contested activity already has an IN_PROGRESS row
      // (a checkpoint), so both completions claim an existing row.
      await prisma.progress.create({
        data: {
          ...completedRow(sid, ids.activities[1]),
          status: "IN_PROGRESS",
        },
      });
      const lock = holdAvatarLock(sid);
      await lock.acquired;
      const r1 = complete(sid, ids.activities[1]);
      const r2 = complete(sid, ids.activities[1]);
      expect(await stillPending(r1, 400)).toBe(true);
      lock.release();
      await lock.done;
      const [a, b] = await Promise.all([r1, r2]);
      expect([a.status, b.status]).toEqual([200, 200]);
      const deltas = [a.body.reward.xpDelta, b.body.reward.xpDelta].sort();
      expect(deltas).toEqual([0, 50]);
      expect(
        (await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }))
          .xp,
      ).toBe(50);
      expect(
        await prisma.progress.count({
          where: { studentId: sid, status: "COMPLETED" },
        }),
      ).toBe(1);
    });

    it("DB-832-1: two first completions for a learner with no avatar both answer, create one avatar and award both", async () => {
      const sid = student("fresh");
      const [a, b] = await Promise.all([
        complete(sid, ids.activities[1]),
        complete(sid, ids.activities[2]),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(await prisma.avatar.count({ where: { studentId: sid } })).toBe(1);
      const avatar = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: sid },
      });
      // 2 completions → level 2 once → 50 + 50 + 100.
      expect(avatar).toMatchObject({ level: 2, xp: 200 });
      expect(
        await prisma.progress.count({
          where: { studentId: sid, status: "COMPLETED" },
        }),
      ).toBe(2);
    });

    it("DB-REPAIR-1: a delayed avatar repair cannot overwrite a reward committed after its read", async () => {
      const sid = student("repair");
      // xp 0 with two completions: the repair path in GET /avatar/me fires.
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 0,
          energy: 50,
          hp: 50,
        },
      });
      await prisma.progress.createMany({
        data: [
          completedRow(sid, ids.activities[0]),
          completedRow(sid, ids.activities[1]),
        ],
      });
      // The lock holder plays the completion that commits while the repair is
      // between its read (xp 0) and its write.
      const lock = holdAvatarLock(sid, async (tx) => {
        await tx.avatar.update({
          where: { studentId: sid },
          data: { xp: { increment: 50 } },
        });
      });
      await lock.acquired;
      const repair = request(app).get("/api/avatar/me").set(asStudent(sid));
      expect(await stillPending(repair, 400)).toBe(true);
      lock.release();
      await lock.done;
      const res = await repair;
      expect(res.status).toBe(200);
      const avatar = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: sid },
      });
      // Pre-fix: the absolute repair wrote xp 200 / level 2 over the +50 reward.
      expect(avatar.xp).toBe(50);
      expect(res.body.avatar.xp).toBe(50);
    });

    it("DB-850-1: ten racing replays of a completed activity award nothing, all answer, and the personal best is monotone with an exact play count", async () => {
      const sid = student("replay");
      await prisma.avatar.create({
        data: {
          studentId: sid,
          stage: "GENERAL",
          level: 1,
          xp: 50,
          energy: 50,
          hp: 50,
        },
      });
      const activityId = ids.activities[7];
      await prisma.progress.create({ data: completedRow(sid, activityId) });
      const scores = [3, 9, 1, 7, 9, 2, 8, 5, 6, 4];
      const results = await Promise.all(
        scores.map((score) =>
          request(app)
            .post("/api/progress/complete-activity")
            .set(asStudent(sid))
            .send({
              moduleSlug: ids.slug,
              activityId,
              timeSpentS: 20,
              result: {
                gameKey: "move_measure",
                score,
                total: 10,
                streakMax: score,
              },
            }),
        ),
      );
      expect(results.map((r) => r.status)).toEqual(scores.map(() => 200));
      expect(results.every((r) => r.body.reward.xpDelta === 0)).toBe(true);
      const best = await prisma.gamePersonalBest.findUniqueOrThrow({
        where: {
          studentId_gameKey: { studentId: sid, gameKey: "move_measure" },
        },
      });
      expect(best.bestScore).toBe(9);
      expect(best.bestStreak).toBe(9);
      expect(best.playCount).toBe(10);
      expect(scores).toContain(best.lastScore);
      // Exactly the replays that set the record claimed it; the two 9s cannot both.
      expect(
        results.filter((r) => r.body.isNewHighScore).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        results.filter(
          (r) => r.body.isNewHighScore && r.body.personalBest?.bestScore === 9,
        ).length,
      ).toBe(1);
      expect(
        (await prisma.avatar.findUniqueOrThrow({ where: { studentId: sid } }))
          .xp,
      ).toBe(50);
    });
  },
);
