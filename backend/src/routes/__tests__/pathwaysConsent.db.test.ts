import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { runTag, bindTestDatabase } from "../../__tests__/helpers/testDb";

/**
 * #874 — a Pathways enrollment grants facilitator visibility only when the
 * learner accepted it. Real PostgreSQL, real routes, real middleware; this is
 * the authoritative evidence for the consent matrix, the history boundary and
 * the concurrency behaviour of invitation acceptance.
 *
 * Skipped unless TEST_DATABASE_URL names a designated test database.
 */

const dbUrl = bindTestDatabase();

describe.skipIf(!dbUrl)(
  "#874 Pathways relationship consent (real PostgreSQL)",
  () => {
    const tag = runTag();
    const PASSWORD = "Learner123";
    const ids = {
      fac: `fac-${tag}`,
      fac2: `fac2-${tag}`,
      learner: `lrn-${tag}`, // has prior history; gets invited
      other: `oth-${tag}`, // a different account; must not be able to accept
      legacy: `leg-${tag}`, // legacy enrollment row (no acceptedAt)
      joiner: `join-${tag}`, // joins by code
      twin: `twin-${tag}`, // joins by code twice at once
      cohort: `coh-${tag}`,
      cohort2: `coh2-${tag}`,
    };
    const emails = {
      learner: `marcus-${tag}@p.test`,
      other: `aisha-${tag}@p.test`,
      ghost: `nobody-${tag}@p.test`,
    };
    const joinCode = `JN${tag}`.toUpperCase().slice(0, 12);

    let app: typeof import("../../server").default;
    let prisma: typeof import("../../utils/prisma").default;
    const tokens: Record<string, string> = {};
    let ip = 0;
    const newIp = () => ({
      "X-Forwarded-For": `10.7.${++ip % 250}.${tag.length}`,
    });
    const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

    const login = async (email: string) => {
      const res = await request(app)
        .post("/api/login")
        .set(newIp())
        .send({ email, password: PASSWORD });
      expect(res.status).toBe(200);
      return res.body.token as string;
    };

    const invite = (email: string, cohort = ids.cohort, who = "fac") =>
      request(app)
        .post(`/api/pathways/facilitator/cohorts/${cohort}/learners`)
        .set(as(who))
        .send({ email });

    const roster = (who = "fac", cohort = ids.cohort) =>
      request(app).get(`/api/pathways/cohorts/${cohort}`).set(as(who));

    const learnerDetail = (userId: string, who = "fac") =>
      request(app)
        .get(`/api/pathways/facilitator/learners/${userId}`)
        .set(as(who));

    const myInvitations = (who: string) =>
      request(app).get("/api/pathways/student/invitations").set(as(who));

    const accept = (who: string, inviteId: string) =>
      request(app)
        .post(`/api/pathways/student/invitations/${inviteId}/accept`)
        .set(as(who));

    /** Every facilitator surface that could show a learner. */
    const facilitatorSurfaces = (cohort = ids.cohort) => [
      `/api/pathways/cohorts/${cohort}`,
      `/api/pathways/facilitator/cohort/${cohort}/progress`,
      `/api/pathways/facilitator/cohorts/${cohort}/export`,
      `/api/pathways/facilitator/cohorts/${cohort}/gamification`,
      `/api/pathways/facilitator/cohorts/${cohort}/challenges`,
      `/api/pathways/facilitator/learners`,
      `/api/pathways/facilitator/tracks`,
      `/api/pathways/facilitator/reports/weekly`,
      `/api/pathways/facilitator/reports/cohort/${cohort}`,
      `/api/pathways/facilitator/reports/outcomes`,
      `/api/pathways/facilitator/reports/engagement`,
    ];

    async function facilitatorSeesNothingOf(userId: string, name: string) {
      for (const path of facilitatorSurfaces()) {
        const res = await request(app).get(path).set(as("fac"));
        expect(res.status, path).toBe(200);
        const text = res.text;
        expect(text, path).not.toContain(userId);
        expect(text, path).not.toContain(name);
      }
      const detail = await learnerDetail(userId);
      expect(detail.status).toBe(404);
      const gam = await request(app)
        .get(`/api/pathways/facilitator/learners/${userId}/gamification`)
        .set(as("fac"));
      expect(gam.status).toBe(404);
    }

    beforeAll(async () => {
      delete process.env.ALLOW_DEV_ROLE_HEADER;
      app = (await import("../../server")).default;
      prisma = (await import("../../utils/prisma")).default;
      expect(process.env.DATABASE_URL).toBe(dbUrl);

      const hash = await bcrypt.hash(PASSWORD, 4);
      await prisma.user.createMany({
        data: [
          {
            id: ids.fac,
            name: "Coach",
            role: "teacher",
            email: `coach-${tag}@p.test`,
            password: hash,
          },
          {
            id: ids.fac2,
            name: "Other Coach",
            role: "teacher",
            email: `coach2-${tag}@p.test`,
            password: hash,
          },
          {
            id: ids.learner,
            name: "Marcus Prior",
            role: "student",
            email: emails.learner,
            password: hash,
            userType: "pathways",
            birthYear: 2009,
            ageBand: "launch",
          },
          {
            id: ids.other,
            name: "Aisha Else",
            role: "student",
            email: emails.other,
            password: hash,
            userType: "pathways",
          },
          {
            id: ids.legacy,
            name: "Legacy Lee",
            role: "student",
            email: `lee-${tag}@p.test`,
            password: hash,
            userType: "pathways",
          },
          {
            id: ids.joiner,
            name: "Jordan Join",
            role: "student",
            email: `jordan-${tag}@p.test`,
            password: hash,
            userType: "pathways",
          },
        ],
      });
      await prisma.user.create({
        data: {
          id: ids.twin,
          name: "Taylor Twin",
          role: "student",
          email: `taylor-${tag}@p.test`,
          password: hash,
          userType: "pathways",
        },
      });
      await prisma.pathwayCohort.createMany({
        data: [
          {
            id: ids.cohort,
            name: `Cohort ${tag}`,
            band: "launch",
            facilitatorId: ids.fac,
            trackIds: ["cyber-launch"],
            joinCode,
            status: "active",
          },
          {
            id: ids.cohort2,
            name: `Other ${tag}`,
            band: "launch",
            facilitatorId: ids.fac2,
            trackIds: ["cyber-launch"],
            joinCode: `X${joinCode}`,
            status: "active",
          },
        ],
      });
      // Legacy row: active, no acceptedAt (as the migration leaves existing rows).
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.legacy,
          cohortId: ids.cohort,
          status: "active",
          source: "legacy",
        },
      });
      // Prior history for the invited learner: a module started and completed
      // before any relationship with this facilitator existed, with homework text.
      await prisma.pathwayMilestone.create({
        data: {
          userId: ids.learner,
          trackSlug: "cyber-launch",
          moduleSlug: "cyber-foundations",
          status: "completed",
          score: 91,
          completedAt: new Date("2026-01-15"),
          createdAt: new Date("2026-01-10"),
          homeworkSubmitted: true,
          homeworkResponse: "PRIVATE-HOMEWORK-TEXT",
          artifacts: { note: "PRIVATE-ARTIFACT" },
        },
      });
      // Pin updatedAt into the past (the DB default is "now"; the boundary must
      // hide work that was not touched since acceptance).
      await prisma.$executeRawUnsafe(
        `UPDATE "PathwayMilestone" SET "updatedAt" = '2026-01-15' WHERE "userId" = $1`,
        ids.learner,
      );
      await prisma.pathwayXpEvent.create({
        data: {
          userId: ids.learner,
          amount: 500,
          source: "module_complete",
          createdAt: new Date("2026-01-15"),
        },
      });

      // Recent but still pre-acceptance: inside the 7-day leaderboard window.
      await prisma.pathwayXpEvent.create({
        data: {
          userId: ids.learner,
          amount: 40,
          source: "section",
          createdAt: new Date(Date.now() - 86400000),
        },
      });

      tokens.fac = await login(`coach-${tag}@p.test`);
      tokens.fac2 = await login(`coach2-${tag}@p.test`);
      tokens.learner = await login(emails.learner);
      tokens.other = await login(emails.other);
      tokens.legacy = await login(`lee-${tag}@p.test`);
      tokens.joiner = await login(`jordan-${tag}@p.test`);
      tokens.twin = await login(`taylor-${tag}@p.test`);
    });

    afterAll(async () => {
      const userIds = [
        ids.fac,
        ids.fac2,
        ids.learner,
        ids.other,
        ids.legacy,
        ids.joiner,
        ids.twin,
      ];
      await prisma.pathwayInvite.deleteMany({
        where: { cohortId: { in: [ids.cohort, ids.cohort2] } },
      });
      await prisma.pathwayXpEvent.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.pathwayGamification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.pathwayMilestone.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.pathwayEnrollment.deleteMany({
        where: { cohortId: { in: [ids.cohort, ids.cohort2] } },
      });
      await prisma.pathwayCohort.deleteMany({
        where: { id: { in: [ids.cohort, ids.cohort2] } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    });

    it("DB-874-1: inviting an existing account creates no accepted relationship and reveals nothing", async () => {
      const res = await invite(emails.learner);
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ invited: true });

      const rows = await prisma.pathwayEnrollment.count({
        where: { userId: ids.learner, cohortId: ids.cohort },
      });
      expect(rows).toBe(0);
      await facilitatorSeesNothingOf(ids.learner, "Marcus Prior");
    });

    it("DB-874-2: the response and roster are identical for an address with no account", async () => {
      const res = await invite(emails.ghost);
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ invited: true });

      const r = await roster();
      expect(r.status).toBe(200);
      const pending = r.body.pendingInvites as Array<{
        email: string;
        status: string;
      }>;
      const forExisting = pending.find((p) => p.email === emails.learner);
      const forGhost = pending.find((p) => p.email === emails.ghost);
      expect(forExisting).toBeDefined();
      expect(forGhost).toBeDefined();
      // Same shape, same status — nothing distinguishes an existing account.
      expect(Object.keys(forExisting!).sort()).toEqual(
        Object.keys(forGhost!).sort(),
      );
      expect(forExisting!.status).toBe(forGhost!.status);
      expect(r.text).not.toContain("Marcus Prior");
      expect(r.text).not.toContain(ids.learner);
    });

    it("DB-874-3: a different account cannot see or accept the invitation", async () => {
      const mine = await myInvitations("learner");
      expect(mine.status).toBe(200);
      expect(mine.body.invitations).toHaveLength(1);
      const inviteId = mine.body.invitations[0].id as string;

      const others = await myInvitations("other");
      expect(others.body.invitations).toHaveLength(0);

      const wrong = await accept("other", inviteId);
      expect(wrong.status).toBe(404);
      const row = await prisma.pathwayInvite.findUnique({
        where: { id: inviteId },
      });
      expect(row?.status).toBe("pending");
      expect(
        await prisma.pathwayEnrollment.count({
          where: { cohortId: ids.cohort, userId: ids.other },
        }),
      ).toBe(0);
    });

    it("DB-874-4: an expired invitation is refused and grants nothing", async () => {
      const inv = await prisma.pathwayInvite.findUniqueOrThrow({
        where: {
          cohortId_email: { cohortId: ids.cohort, email: emails.learner },
        },
      });
      await prisma.pathwayInvite.update({
        where: { id: inv.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      const listed = await myInvitations("learner");
      expect(listed.body.invitations).toHaveLength(0);
      const res = await accept("learner", inv.id);
      expect(res.status).toBe(410);
      expect(
        await prisma.pathwayEnrollment.count({
          where: { cohortId: ids.cohort, userId: ids.learner },
        }),
      ).toBe(0);
      // Re-inviting refreshes the same row.
      expect((await invite(emails.learner)).status).toBe(202);
      const again = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { id: inv.id },
      });
      expect(again.status).toBe("pending");
      expect(again.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("DB-874-5: duplicate concurrent acceptance transitions exactly once; replay is a no-op", async () => {
      const inv = await prisma.pathwayInvite.findUniqueOrThrow({
        where: {
          cohortId_email: { cohortId: ids.cohort, email: emails.learner },
        },
      });
      const [a, b, c] = await Promise.all([
        accept("learner", inv.id),
        accept("learner", inv.id),
        accept("learner", inv.id),
      ]);
      const statuses = [a.status, b.status, c.status];
      // Every request answers success (one real transition, the others are
      // idempotent replays or lost the race cleanly); nothing is duplicated.
      for (const s of statuses) expect([200, 409]).toContain(s);
      expect(statuses.filter((s) => s === 200).length).toBeGreaterThanOrEqual(
        1,
      );

      const rows = await prisma.pathwayEnrollment.findMany({
        where: { cohortId: ids.cohort, userId: ids.learner },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("active");
      expect(rows[0].source).toBe("facilitator_invite");
      expect(rows[0].acceptedAt).not.toBeNull();
      const row = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { id: inv.id },
      });
      expect(row.status).toBe("accepted");
      expect(row.acceptedById).toBe(ids.learner);

      const replay = await accept("learner", inv.id);
      expect(replay.status).toBe(200);
      expect(replay.body.alreadyAccepted).toBe(true);
      const after = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { id: inv.id },
      });
      expect(after.acceptedAt?.getTime()).toBe(row.acceptedAt?.getTime());
    });

    it("DB-874-6: after acceptance the facilitator sees the learner but not pre-acceptance history or birth year", async () => {
      const detail = await learnerDetail(ids.learner);
      expect(detail.status).toBe(200);
      expect(detail.body.user.name).toBe("Marcus Prior");
      expect(detail.body.user).not.toHaveProperty("birthYear");
      // The January milestone was last touched before acceptance: hidden.
      expect(detail.body.milestones).toHaveLength(0);
      expect(detail.text).not.toContain("PRIVATE-HOMEWORK-TEXT");
      expect(detail.text).not.toContain("PRIVATE-ARTIFACT");

      // Gamification counts from acceptance: the 500 pre-acceptance XP is not shown.
      const gam = await request(app)
        .get(`/api/pathways/facilitator/learners/${ids.learner}/gamification`)
        .set(as("fac"));
      expect(gam.status).toBe(200);
      expect(gam.body.state.totalXp).toBe(0);
      expect(gam.body.state.longestStreak).toBeNull();
      expect(gam.body.recentEvents).toHaveLength(0);
      const cohortGam = await request(app)
        .get(`/api/pathways/facilitator/cohorts/${ids.cohort}/gamification`)
        .set(as("fac"));
      expect(cohortGam.status).toBe(200);
      expect(cohortGam.body.totalXp).toBe(0);
      expect(
        (cohortGam.body.topByXpThisWeek as Array<{ userId: string }>).map(
          (r) => r.userId,
        ),
      ).not.toContain(ids.learner);

      // Work touched after acceptance becomes visible, with detail fields
      // withheld because the module was started before consent.
      await prisma.pathwayMilestone.update({
        where: {
          userId_trackSlug_moduleSlug: {
            userId: ids.learner,
            trackSlug: "cyber-launch",
            moduleSlug: "cyber-foundations",
          },
        },
        data: { timeSpentMinutes: 42 },
      });
      const later = await learnerDetail(ids.learner);
      expect(later.body.milestones).toHaveLength(1);
      expect(later.body.milestones[0].score).toBe(91);
      expect(later.body.milestones[0].homeworkResponse).toBeNull();
      expect(later.body.milestones[0].artifacts).toBeNull();

      // A milestone on a track outside this cohort stays invisible.
      await prisma.pathwayMilestone.create({
        data: {
          userId: ids.learner,
          trackSlug: "other-track",
          moduleSlug: "elsewhere",
          status: "completed",
          completedAt: new Date(),
        },
      });
      const scoped = await learnerDetail(ids.learner);
      expect(
        scoped.body.milestones.map((m: { moduleSlug: string }) => m.moduleSlug),
      ).toEqual(["cyber-foundations"]);

      // Another facilitator, whose cohort the learner never joined, sees nothing.
      expect((await learnerDetail(ids.learner, "fac2")).status).toBe(404);
    });

    it("DB-874-7: a legacy enrollment grants no visibility until the learner re-enters the join code", async () => {
      await facilitatorSeesNothingOf(ids.legacy, "Legacy Lee");
      const r = await roster();
      expect(r.body.unconfirmedLegacyCount).toBe(1);
      // The learner still learns and still sees the cohort on their own home.
      const home = await request(app)
        .get("/api/pathways/student/home")
        .set(as("legacy"));
      expect(home.status).toBe(200);
      expect(
        home.body.enrollments.map((e: { cohortId: string }) => e.cohortId),
      ).toContain(ids.cohort);

      const joined = await request(app)
        .post("/api/pathways/enroll")
        .set(as("legacy"))
        .send({ joinCode });
      expect(joined.status).toBe(200);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.legacy, cohortId: ids.cohort },
        },
      });
      expect(row.acceptedAt).not.toBeNull();
      expect(row.source).toBe("join_code");
      expect((await learnerDetail(ids.legacy)).status).toBe(200);
      expect((await roster()).body.unconfirmedLegacyCount).toBe(0);
    });

    it("DB-874-8: joining by code creates a trusted relationship and is idempotent", async () => {
      const first = await request(app)
        .post("/api/pathways/enroll")
        .set(as("joiner"))
        .send({ joinCode });
      expect(first.status).toBe(200);
      const acceptedAt = first.body.enrollment.acceptedAt as string;
      const second = await request(app)
        .post("/api/pathways/enroll")
        .set(as("joiner"))
        .send({ joinCode });
      expect(second.status).toBe(200);
      expect(second.body.enrollment.acceptedAt).toBe(acceptedAt);
      expect((await learnerDetail(ids.joiner)).status).toBe(200);
    });

    it("DB-874-9: revocation removes all visibility, blocks re-joining by the stale code, and blocks code login", async () => {
      const del = await request(app)
        .delete(
          `/api/pathways/facilitator/cohorts/${ids.cohort}/learners/${ids.joiner}`,
        )
        .set(as("fac"));
      expect(del.status).toBe(204);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.joiner, cohortId: ids.cohort },
        },
      });
      expect(row.status).toBe("revoked");
      expect(row.revokedAt).not.toBeNull();
      await facilitatorSeesNothingOf(ids.joiner, "Jordan Join");

      const rejoin = await request(app)
        .post("/api/pathways/enroll")
        .set(as("joiner"))
        .send({ joinCode });
      expect(rejoin.status).toBe(403);
      expect(rejoin.body).toEqual({ error: "enrollment_revoked" });

      const codeLogin = await request(app)
        .post("/api/auth/pathways-code-login")
        .set(newIp())
        .send({ cohortCode: joinCode, userId: ids.joiner, password: PASSWORD });
      expect(codeLogin.status).toBe(404);

      // A fresh invitation is the way back: accepted → active again.
      expect((await invite(`jordan-${tag}@p.test`)).status).toBe(202);
      const inv = await myInvitations("joiner");
      expect(inv.body.invitations).toHaveLength(1);
      expect((await accept("joiner", inv.body.invitations[0].id)).status).toBe(
        200,
      );
      const back = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.joiner, cohortId: ids.cohort },
        },
      });
      expect(back.status).toBe("active");
      expect(back.revokedAt).toBeNull();
    });

    it("DB-874-10: declined and withdrawn invitations grant nothing", async () => {
      expect((await invite(emails.other)).status).toBe(202);
      const mine = await myInvitations("other");
      const inviteId = mine.body.invitations[0].id as string;
      const declined = await request(app)
        .post(`/api/pathways/student/invitations/${inviteId}/decline`)
        .set(as("other"));
      expect(declined.status).toBe(200);
      expect((await accept("other", inviteId)).status).toBe(404);
      await facilitatorSeesNothingOf(ids.other, "Aisha Else");

      // Facilitator withdraws the (declined) invite; the learner cannot revive it.
      const withdraw = await request(app)
        .delete(
          `/api/pathways/facilitator/cohorts/${ids.cohort}/invites/${inviteId}`,
        )
        .set(as("fac"));
      expect(withdraw.status).toBe(204);
      expect((await accept("other", inviteId)).status).toBe(404);
      const r = await roster();
      expect(
        (r.body.pendingInvites as Array<{ email: string }>).map((p) => p.email),
      ).not.toContain(emails.other);
    });

    it("DB-874-11: a facilitator cannot invite into someone else's cohort", async () => {
      const res = await invite(emails.other, ids.cohort2, "fac");
      expect(res.status).toBe(404);
      expect(
        await prisma.pathwayInvite.count({ where: { cohortId: ids.cohort2 } }),
      ).toBe(0);
    });
    it("DB-874-12: two simultaneous first joins by the same learner yield one trusted row and no error", async () => {
      const join = () =>
        request(app)
          .post("/api/pathways/enroll")
          .set(as("twin"))
          .send({ joinCode });
      const [a, b] = await Promise.all([join(), join()]);
      expect([a.status, b.status]).toEqual([200, 200]);
      const rows = await prisma.pathwayEnrollment.findMany({
        where: { cohortId: ids.cohort, userId: ids.twin },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].acceptedAt).not.toBeNull();
      expect(a.body.enrollment.acceptedAt).toBe(b.body.enrollment.acceptedAt);
    });

    it("DB-874-13: the cohort list counts trusted enrollments only", async () => {
      // An unconfirmed legacy row and a revoked row must not be counted.
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.other,
          cohortId: ids.cohort,
          status: "active",
          source: "legacy",
        },
      });
      const expected = await prisma.pathwayEnrollment.count({
        where: {
          cohortId: ids.cohort,
          status: { in: ["active", "completed"] },
          acceptedAt: { not: null },
        },
      });
      const total = await prisma.pathwayEnrollment.count({
        where: { cohortId: ids.cohort },
      });
      expect(total).toBeGreaterThan(expected);

      const list = await request(app)
        .get("/api/pathways/cohorts")
        .set(as("fac"));
      expect(list.status).toBe(200);
      const mine = (
        list.body as Array<{ id: string; _count: { enrollments: number } }>
      ).find((c) => c.id === ids.cohort);
      expect(mine?._count.enrollments).toBe(expected);
    });

    it("DB-874-14: re-inviting an accepted learner neither resets the invite nor moves their consent moment", async () => {
      const before = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.learner, cohortId: ids.cohort },
        },
      });
      expect((await invite(emails.learner)).status).toBe(202);
      const inv = await prisma.pathwayInvite.findUniqueOrThrow({
        where: {
          cohortId_email: { cohortId: ids.cohort, email: emails.learner },
        },
      });
      expect(inv.status).toBe("accepted");
      const r = await roster();
      expect(
        (r.body.pendingInvites as Array<{ email: string }>).map((p) => p.email),
      ).not.toContain(emails.learner);
      // The learner sees nothing to accept, and a replayed accept keeps acceptedAt.
      expect((await myInvitations("learner")).body.invitations).toHaveLength(0);
      expect((await accept("learner", inv.id)).status).toBe(200);
      const after = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.learner, cohortId: ids.cohort },
        },
      });
      expect(after.acceptedAt?.getTime()).toBe(before.acceptedAt?.getTime());
    });
  },
);
