import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
import { bindTestDatabase, runTag } from "../../__tests__/helpers/testDb";

const dbUrl = bindTestDatabase();
describe.skipIf(!dbUrl)("permanent specialty selection on PostgreSQL", () => {
  const tag = runTag();
  const students: string[] = [];
  let prisma: typeof import("../../utils/prisma").default;
  let app: typeof import("../../server").default;
  beforeAll(async () => {
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    prisma = (await import("../../utils/prisma")).default;
    app = (await import("../../server")).default;
    for (const archetype of ["AI", "BIOTECH"] as const) {
      await prisma.ability.create({
        data: {
          id: tag + archetype,
          name: "Choice test",
          archetype,
          reqLevel: 1,
          config: {},
        },
      });
    }
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: students } } });
    await prisma.ability.deleteMany({
      where: { id: { in: [tag + "AI", tag + "BIOTECH"] } },
    });
    await prisma.$disconnect();
  });
  it.each([true, false])(
    "stores only the winner's track and grants (existing avatar: %s)",
    async (existing) => {
      const id = `choice-${tag}-${existing}`;
      students.push(id);
      await prisma.user.create({
        data: { id, name: "Learner", role: "student" },
      });
      await prisma.progress.createMany({
        data: STEM_SET_3_IDS.map((activityId) => ({
          studentId: id,
          activityId,
          moduleSlug: "choice-test",
          status: "COMPLETED" as const,
        })),
      });
      if (existing)
        await prisma.avatar.create({
          data: { studentId: id, level: 3, xp: 123 },
        });
      const choose = (archetype: string) =>
        request(app)
          .post("/api/avatar/select-archetype")
          .set({ "x-user-id": id, "x-role": "student" })
          .send({ archetype });
      // Hold the existing avatar, or the parent row needed by the first insert.
      // Do not release until *both* requests are blocked, directly or in line
      // behind each other. Two accidentally sequential 200/400s are not proof.
      let unlock!: () => void;
      const release = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      let acquired!: (pid: number) => void;
      const locked = new Promise<number>((resolve) => {
        acquired = resolve;
      });
      const holder = prisma.$transaction(
        async (tx) => {
          const rows = existing
            ? await tx.$queryRaw<
                { pid: number }[]
              >`SELECT pg_backend_pid() AS pid FROM "Avatar" WHERE "studentId"=${id} FOR UPDATE`
            : await tx.$queryRaw<
                { pid: number }[]
              >`SELECT pg_backend_pid() AS pid FROM "User" WHERE id=${id} FOR UPDATE`;
          acquired(rows[0].pid);
          await release;
        },
        { timeout: 10000 },
      );
      const pid = await locked;
      const pending = Promise.all([choose("AI"), choose("BIOTECH")]);
      try {
        await vi.waitFor(
          async () => {
            const [row] = await prisma.$queryRaw<{ n: number }[]>`
          WITH RECURSIVE waiters(pid) AS (
            SELECT ${pid}::integer
            UNION
            SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid = ANY(pg_blocking_pids(a.pid))
          ) SELECT count(*)::integer - 1 AS n FROM waiters`;
            expect(row.n).toBeGreaterThanOrEqual(2);
          },
          { timeout: 3500, interval: 30 },
        );
      } finally {
        unlock();
        await holder;
      }
      const results = await pending;
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
      expect(results.find((r) => r.status === 400)?.body.error).toBe(
        "Avatar already specialized",
      );
      const winner = results.find((r) => r.status === 200)!.body.avatar;
      const stored = await prisma.avatar.findUniqueOrThrow({
        where: { studentId: id },
        include: { unlockedAbilities: { include: { Ability: true } } },
      });
      expect(stored.archetype).toBe(winner.archetype);
      expect(stored.unlockedAbilities.map((a) => a.abilityId)).toContain(
        tag + winner.archetype,
      );
      expect(
        stored.unlockedAbilities.every(
          (a) => a.Ability.archetype === stored.archetype,
        ),
      ).toBe(true);
      expect([stored.level, stored.xp]).toEqual(existing ? [3, 123] : [1, 0]);
      expect((await choose(winner.archetype)).status).toBe(400);
    },
  );
});
