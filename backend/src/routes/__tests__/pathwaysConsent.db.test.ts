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
      rev: `rev-${tag}`, // invited, accepted, removed, re-invited
      home: `home-${tag}`, // #872 home-access login: the email is an adult's
      home2: `home2-${tag}`, // home-access login with the learner's own email
      conf: `conf-${tag}`, // joins through preview + confirm
      race1: `rc1-${tag}`, // confirm racing a facilitator track change
      race2: `rc2-${tag}`, // confirm racing an invitation acceptance
      race3: `rc3-${tag}`, // confirm racing a revocation
      race4: `rc4-${tag}`, // legacy row that already carries boundaries
      race5: `rc5-${tag}`, // trusted row written without a snapshot
      cohort: `coh-${tag}`,
      cohort2: `coh2-${tag}`,
    };
    const emails = {
      learner: `marcus-${tag}@p.test`,
      other: `aisha-${tag}@p.test`,
      ghost: `nobody-${tag}@p.test`,
      homeAdult: `parent-${tag}@p.test`,
      homeOwn: `casey2-${tag}@p.test`,
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

    /** The learner's own consent: preview, then confirm exactly what was shown. */
    const joinByCode = async (who: string, code = joinCode) => {
      const preview = await request(app)
        .get(
          `/api/pathways/enroll/preview?joinCode=${encodeURIComponent(code)}`,
        )
        .set(as(who));
      if (preview.status !== 200) return preview;
      return request(app)
        .post("/api/pathways/enroll")
        .set(as(who))
        .send({ joinCode: code, version: preview.body.version });
    };

    /** The learner's own section route (mounted, real middleware). */
    const section = (
      who: string,
      moduleSlug: string,
      key: string,
      completed: boolean,
      extra: { trackSlug?: string; timeSpentMinutes?: number } = {},
    ) =>
      request(app)
        .patch("/api/pathways/student/milestones/section")
        .set(as(who))
        .send({
          trackSlug: extra.trackSlug ?? "cyber-launch",
          moduleSlug,
          section: key,
          completed,
          ...(extra.timeSpentMinutes !== undefined
            ? { timeSpentMinutes: extra.timeSpentMinutes }
            : {}),
        });

    const visibleModule = async (
      userId: string,
      moduleSlug: string,
      who = "fac",
    ) => {
      const detail = await learnerDetail(userId, who);
      expect(detail.status).toBe(200);
      return detail.body.milestones.find(
        (m: { moduleSlug: string }) => m.moduleSlug === moduleSlug,
      );
    };

    /** No facilitator surface may carry a pre-consent value of the learner. */
    async function noHistoryLeaks(userId = ids.learner) {
      const paths = [
        ...facilitatorSurfaces(),
        `/api/pathways/facilitator/learners/${userId}`,
        `/api/pathways/facilitator/learners/${userId}/gamification`,
      ];
      for (const path of paths) {
        const res = await request(app).get(path).set(as("fac"));
        expect(res.status, path).toBe(200);
        expect(res.text, path).not.toContain("PRIVATE-");
        expect(res.text, path).not.toContain("2026-01-1");
        expect(res.text, path).not.toMatch(/"score":91/);
        expect(res.text, path).not.toMatch(/"timeSpentMinutes":42/);
        if (path.endsWith("/export")) {
          // CSV cells are quoted values, not JSON pairs.
          expect(res.text, path).not.toMatch(/"91"/);
          expect(res.text, path).not.toMatch(/"42"/);
        }
      }
    }

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
      await prisma.user.create({
        data: {
          id: ids.rev,
          name: "Riley Return",
          role: "student",
          email: `riley-${tag}@p.test`,
          password: hash,
          userType: "pathways",
        },
      });
      // A classroom student whose home login (#872) was bound by a parent:
      // the account's email belongs to the adult, not to the learner.
      await prisma.user.create({
        data: {
          id: ids.home,
          name: "Casey Kid",
          role: "student",
          email: emails.homeAdult,
          password: hash,
          homeAccessEnabled: true,
          managedByParent: true,
          parentEmail: emails.homeAdult,
        },
      });
      for (const [id, name] of [
        [ids.race1, "Rae One"],
        [ids.race2, "Rae Two"],
        [ids.race3, "Rae Three"],
        [ids.race4, "Rae Four"],
        [ids.race5, "Rae Five"],
      ] as const) {
        await prisma.user.create({
          data: {
            id,
            name,
            role: "student",
            email: `${id}@p.test`,
            password: hash,
            userType: "pathways",
          },
        });
      }
      await prisma.user.create({
        data: {
          id: ids.conf,
          name: "Cody Confirm",
          role: "student",
          email: `cody-${tag}@p.test`,
          password: hash,
          userType: "pathways",
        },
      });
      // A home-access login whose address is the learner's own: the parent
      // relationship names a different address, so invitations still match.
      await prisma.user.create({
        data: {
          id: ids.home2,
          name: "Casey Own",
          role: "student",
          email: emails.homeOwn,
          password: hash,
          homeAccessEnabled: true,
          managedByParent: true,
          parentEmail: `guardian2-${tag}@p.test`,
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
      tokens.rev = await login(`riley-${tag}@p.test`);
      tokens.home = await login(emails.homeAdult);
      tokens.home2 = await login(emails.homeOwn);
      tokens.conf = await login(`cody-${tag}@p.test`);
      for (const id of [
        ids.race1,
        ids.race2,
        ids.race3,
        ids.race4,
        ids.race5,
      ]) {
        tokens[id] = await login(`${id}@p.test`);
      }
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
        ids.rev,
        ids.home,
        ids.home2,
        ids.conf,
        ids.race1,
        ids.race2,
        ids.race3,
        ids.race4,
        ids.race5,
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
      // The learner routes award badges and daily-goal progress as side effects.
      await prisma.pathwayBadge.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.pathwayDailyGoal.deleteMany({
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

      // Work touched after acceptance is admitted, but a module started
      // before consent reveals no historical value. A time-only update
      // through the learner's own route (no section changes hands) proves
      // activity — not the score, the completion date, the flags, the
      // start date or the totals.
      const touch = await section(
        "learner",
        "cyber-foundations",
        "hook",
        false,
        { timeSpentMinutes: 42 },
      );
      expect(touch.status).toBe(200);
      const later = await learnerDetail(ids.learner);
      expect(later.body.milestones).toHaveLength(1);
      expect(later.body.milestones[0]).toMatchObject({
        moduleSlug: "cyber-foundations",
        status: "in_progress",
        score: null,
        completedAt: null,
        artifacts: null,
        createdAt: null,
        hookCompleted: false,
        homeworkSubmitted: false,
        homeworkResponse: null,
        quizCompleted: false,
        quizScore: null,
        timeSpentMinutes: null,
        historyWithheld: true,
      });
      await noHistoryLeaks();

      // The learner's own view is untouched: full history, module continuable.
      const mine = await request(app)
        .get("/api/pathways/student/milestones")
        .set(as("learner"));
      expect(mine.status).toBe(200);
      expect(
        mine.body.find(
          (m: { moduleSlug: string }) => m.moduleSlug === "cyber-foundations",
        ),
      ).toMatchObject({
        status: "completed",
        score: 91,
        homeworkResponse: "PRIVATE-HOMEWORK-TEXT",
        timeSpentMinutes: 42,
      });

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

    it("DB-874-6b: a section completed after acceptance is shown — and only that section", async () => {
      expect(
        (await section("learner", "cyber-foundations", "hook", true)).status,
      ).toBe(200);
      const m = await visibleModule(ids.learner, "cyber-foundations");
      expect(m).toMatchObject({
        hookCompleted: true,
        readingCompleted: false,
        lessonCompleted: false,
        practiceCompleted: false,
        // set on the row since January, but no post-consent act proves it
        homeworkSubmitted: false,
        homeworkResponse: null,
        quizCompleted: false,
        status: "in_progress",
        score: null,
        completedAt: null,
        timeSpentMinutes: null,
        historyWithheld: true,
      });
      await noHistoryLeaks();

      // Last activity is the post-consent touch, never a January date.
      const acceptedAt = (
        await prisma.pathwayEnrollment.findUniqueOrThrow({
          where: {
            userId_cohortId: { userId: ids.learner, cohortId: ids.cohort },
          },
        })
      ).acceptedAt!;
      const progress = await request(app)
        .get(`/api/pathways/facilitator/cohort/${ids.cohort}/progress`)
        .set(as("fac"));
      expect(progress.status).toBe(200);
      const mine = progress.body.learners.find(
        (l: { id: string }) => l.id === ids.learner,
      );
      expect(mine).toBeDefined();
      expect(new Date(mine.lastActive).getTime()).toBeGreaterThanOrEqual(
        acceptedAt.getTime(),
      );

      // A withheld score is not a zero: the export average is blank, not 0.
      const csv = await request(app)
        .get(`/api/pathways/facilitator/cohorts/${ids.cohort}/export`)
        .set(as("fac"));
      expect(csv.status).toBe(200);
      const line = csv.text.split("\n").find((l) => l.includes("Marcus Prior"));
      expect(line).toBeDefined();
      const cells = line!.split(",");
      expect(cells[3]).toBe('"0"');
      expect(cells[4]).toBe('""');
    });

    it("DB-874-6c: finishing a pre-consent module after acceptance shows the completion, never the old score or homework", async () => {
      for (const key of ["reading", "lesson", "practice", "quiz"]) {
        expect(
          (await section("learner", "cyber-foundations", key, true)).status,
          key,
        ).toBe(200);
      }
      const row = await prisma.pathwayMilestone.findUniqueOrThrow({
        where: {
          userId_trackSlug_moduleSlug: {
            userId: ids.learner,
            trackSlug: "cyber-launch",
            moduleSlug: "cyber-foundations",
          },
        },
      });
      expect(row.status).toBe("completed"); // the section route closed it
      expect(row.score).toBe(91); // the learner's own record is intact

      const m = await visibleModule(ids.learner, "cyber-foundations");
      expect(m.status).toBe("completed");
      expect(new Date(m.completedAt).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
      expect(m).toMatchObject({
        score: null,
        artifacts: null,
        hookCompleted: true,
        readingCompleted: true,
        lessonCompleted: true,
        practiceCompleted: true,
        quizCompleted: true,
        quizScore: null,
        homeworkSubmitted: false,
        homeworkResponse: null,
        historyWithheld: true,
      });
      await noHistoryLeaks();

      // Aggregates count the completion but never a withheld score as 0.
      const outcomes = await request(app)
        .get("/api/pathways/facilitator/reports/outcomes")
        .set(as("fac"));
      expect(outcomes.status).toBe(200);
      expect(outcomes.body.modulesCompleted).toBe(1);
      expect(outcomes.body.averageScore).toBeNull();
      expect(outcomes.body.scoredCompletions).toBe(0);
      const cohortReport = await request(app)
        .get(`/api/pathways/facilitator/reports/cohort/${ids.cohort}`)
        .set(as("fac"));
      expect(cohortReport.status).toBe(200);
      expect(cohortReport.body.moduleStats["cyber-foundations"]).toEqual({
        completed: 1,
        avgScore: null,
        count: 0,
      });

      // Re-posting the old module with a score after consent still shows no
      // score: a score on a pre-consent row has no provenance of its own.
      const repost = await request(app)
        .post("/api/pathways/student/milestones")
        .set(as("learner"))
        .send({
          trackSlug: "cyber-launch",
          moduleSlug: "cyber-foundations",
          status: "completed",
          score: 77,
        });
      expect(repost.status).toBe(200);
      expect(
        (await visibleModule(ids.learner, "cyber-foundations")).score,
      ).toBeNull();
    });

    it("DB-874-6d: post-consent homework text is shown; an un-completed section loses its credit", async () => {
      // Withdraw the January submission, then submit again after consent.
      expect(
        (await section("learner", "cyber-foundations", "homework", false))
          .status,
      ).toBe(200);
      const resubmit = await request(app)
        .post("/api/pathways/student/milestones/homework")
        .set(as("learner"))
        .send({
          trackSlug: "cyber-launch",
          moduleSlug: "cyber-foundations",
          response: "POST-CONSENT-HOMEWORK",
        });
      expect(resubmit.status).toBe(200);
      let m = await visibleModule(ids.learner, "cyber-foundations");
      expect(m).toMatchObject({
        homeworkSubmitted: true,
        homeworkResponse: "POST-CONSENT-HOMEWORK",
        status: "in_progress", // the learner reopened the module
        completedAt: null,
        hookCompleted: true,
      });

      // Un-completing a section removes the credit even though the
      // post-consent event that earned it still exists.
      expect(
        (await section("learner", "cyber-foundations", "hook", false)).status,
      ).toBe(200);
      m = await visibleModule(ids.learner, "cyber-foundations");
      expect(m.hookCompleted).toBe(false);
      await noHistoryLeaks();
    });

    it("DB-874-6e: a module started after acceptance is shown whole", async () => {
      expect(
        (
          await section("learner", "phishing-defense", "hook", true, {
            timeSpentMinutes: 5,
          })
        ).status,
      ).toBe(200);
      const m = await visibleModule(ids.learner, "phishing-defense");
      expect(m).toMatchObject({
        status: "in_progress",
        hookCompleted: true,
        timeSpentMinutes: 5,
        historyWithheld: false,
      });
      expect(m.createdAt).not.toBeNull();
    });

    it("DB-874-6f: an act in another track never credits a same-named module in this cohort's track", async () => {
      // A pre-consent row in the cohort's track with the lesson already done.
      await prisma.pathwayMilestone.create({
        data: {
          userId: ids.learner,
          trackSlug: "cyber-launch",
          moduleSlug: "network-basics",
          status: "in_progress",
          lessonCompleted: true,
          createdAt: new Date("2026-01-20"),
        },
      });
      await prisma.$executeRawUnsafe(
        `UPDATE "PathwayMilestone" SET "updatedAt" = '2026-01-20' WHERE "userId" = $1 AND "moduleSlug" = 'network-basics'`,
        ids.learner,
      );
      // The same module slug completed in a different track after consent…
      expect(
        (
          await section("learner", "network-basics", "lesson", true, {
            trackSlug: "other-track",
          })
        ).status,
      ).toBe(200);
      // …and the cohort-track row touched (time only) so it is admitted.
      expect(
        (
          await section("learner", "network-basics", "hook", false, {
            timeSpentMinutes: 3,
          })
        ).status,
      ).toBe(200);
      const m = await visibleModule(ids.learner, "network-basics");
      expect(m).toMatchObject({
        lessonCompleted: false,
        hookCompleted: false,
        historyWithheld: true,
      });
      expect(
        (await learnerDetail(ids.learner)).body.milestones.map(
          (x: { trackSlug: string }) => x.trackSlug,
        ),
      ).not.toContain("other-track");
      // The act in the other track earned XP, but its track is not disclosed.
      const gam = await request(app)
        .get(`/api/pathways/facilitator/learners/${ids.learner}/gamification`)
        .set(as("fac"));
      expect(gam.status).toBe(200);
      expect(gam.text).not.toContain("other-track");
      expect(gam.body.recentEvents.length).toBeGreaterThan(0);
      for (const ev of gam.body.recentEvents) {
        expect(ev).not.toHaveProperty("metadata");
      }
    });

    it("DB-874-6g: adding a track to the cohort never widens an existing relationship; re-entering the code consents from then on", async () => {
      // Work in a track the cohort does not (yet) list, with a score.
      const posted = await request(app)
        .post("/api/pathways/student/milestones")
        .set(as("learner"))
        .send({
          trackSlug: "other-track",
          moduleSlug: "elsewhere-2",
          status: "completed",
          score: 66,
        });
      expect(posted.status).toBe(200);
      const setTracks = (trackIds: string[]) =>
        request(app)
          .put(`/api/pathways/facilitator/cohorts/${ids.cohort}`)
          .set(as("fac"))
          .send({ trackIds });
      expect((await setTracks(["cyber-launch", "other-track"])).status).toBe(
        200,
      );
      const tracksOf = async () =>
        (await learnerDetail(ids.learner)).body.milestones.map(
          (x: { trackSlug: string }) => x.trackSlug,
        );
      // The facilitator flipped a field; the learner consented to nothing new.
      expect(await tracksOf()).not.toContain("other-track");
      await noHistoryLeaks();

      // The home flags the added track; confirming (preview, then confirm)
      // is the learner's consent for it — from now on, so the earlier
      // completion stays history.
      const homeNow = await request(app)
        .get("/api/pathways/student/home")
        .set(as("learner"));
      expect(
        homeNow.body.enrollments.find(
          (e: { cohortId: string }) => e.cohortId === ids.cohort,
        ).consent,
      ).toEqual({ accepted: true, newTracks: ["other-track"] });
      const rejoin = await joinByCode("learner");
      expect(rejoin.status).toBe(200);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.learner, cohortId: ids.cohort },
        },
      });
      const boundaries = row.trackBoundaries as Record<string, string>;
      expect(new Date(boundaries["cyber-launch"]).getTime()).toBe(
        row.acceptedAt!.getTime(),
      );
      expect(new Date(boundaries["other-track"]).getTime()).toBeGreaterThan(
        row.acceptedAt!.getTime(),
      );
      expect(await tracksOf()).not.toContain("other-track"); // untouched since
      expect(
        (
          await section("learner", "elsewhere-2", "hook", true, {
            trackSlug: "other-track",
          })
        ).status,
      ).toBe(200);
      expect(await visibleModule(ids.learner, "elsewhere-2")).toMatchObject({
        trackSlug: "other-track",
        status: "in_progress",
        score: null,
        hookCompleted: true,
        historyWithheld: true,
      });

      // Removing the track from the cohort hides it again.
      expect((await setTracks(["cyber-launch"])).status).toBe(200);
      expect(await tracksOf()).not.toContain("other-track");
    });

    it("DB-874-18: the preview is read-only and shows the cohort, never another learner; confirming needs the preview", async () => {
      const before = {
        rows: await prisma.pathwayEnrollment.count(),
        pending: await prisma.pathwayInvite.count({
          where: { status: "pending" },
        }),
      };
      const p = await request(app)
        .get(`/api/pathways/enroll/preview?joinCode=${joinCode.toLowerCase()}`)
        .set(as("conf"));
      expect(p.status).toBe(200);
      expect(p.body).toMatchObject({
        cohort: {
          id: ids.cohort,
          name: `Cohort ${tag}`,
          band: "launch",
          facilitatorName: "Coach",
        },
        enrollment: { state: "none", acceptedAt: null, source: null },
        newSharing: ["cyber-launch"],
        canConfirm: true,
        reason: null,
      });
      expect(p.body.tracks).toEqual([
        { slug: "cyber-launch", consentedSince: null, requested: true },
      ]);
      expect(typeof p.body.version).toBe("string");
      for (const id of [ids.learner, ids.joiner, ids.legacy, ids.twin]) {
        expect(p.text).not.toContain(id);
      }
      expect(p.text).not.toContain("Marcus");
      expect(await prisma.pathwayEnrollment.count()).toBe(before.rows);
      expect(
        await prisma.pathwayInvite.count({ where: { status: "pending" } }),
      ).toBe(before.pending);
      await facilitatorSeesNothingOf(ids.conf, "Cody Confirm");

      // An unknown code, a cohort the learner has no row in, no reference.
      expect(
        (
          await request(app)
            .get("/api/pathways/enroll/preview?joinCode=NOPE99")
            .set(as("conf"))
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
            .set(as("conf"))
        ).status,
      ).toBe(404);
      expect(
        (await request(app).get("/api/pathways/enroll/preview").set(as("conf")))
          .status,
      ).toBe(400);

      // Confirming needs the preview's version — and the right one.
      const noVersion = await request(app)
        .post("/api/pathways/enroll")
        .set(as("conf"))
        .send({ joinCode });
      expect(noVersion.status).toBe(400);
      expect(noVersion.body).toEqual({ error: "preview_required" });
      const wrong = await request(app)
        .post("/api/pathways/enroll")
        .set(as("conf"))
        .send({ joinCode, version: "not-what-was-shown" });
      expect(wrong.status).toBe(409);
      expect(wrong.body.error).toBe("preview_changed");
      expect(wrong.body.preview.enrollment.state).toBe("none");
      expect(
        await prisma.pathwayEnrollment.count({ where: { userId: ids.conf } }),
      ).toBe(0);
      await facilitatorSeesNothingOf(ids.conf, "Cody Confirm");
    });

    it("DB-874-19: a cohort that changes between preview and confirmation grants nothing unseen; renewed consent covers exactly what is shown", async () => {
      const setTracks = (trackIds: string[]) =>
        request(app)
          .put(`/api/pathways/facilitator/cohorts/${ids.cohort}`)
          .set(as("fac"))
          .send({ trackIds });
      const stale = await request(app)
        .get(`/api/pathways/enroll/preview?joinCode=${joinCode}`)
        .set(as("conf"));
      expect(stale.body.tracks.map((x: { slug: string }) => x.slug)).toEqual([
        "cyber-launch",
      ]);
      expect((await setTracks(["cyber-launch", "other-track"])).status).toBe(
        200,
      );
      try {
        const refused = await request(app)
          .post("/api/pathways/enroll")
          .set(as("conf"))
          .send({ joinCode, version: stale.body.version });
        expect(refused.status).toBe(409);
        expect(refused.body.error).toBe("preview_changed");
        expect(
          refused.body.preview.tracks
            .map((x: { slug: string }) => x.slug)
            .sort(),
        ).toEqual(["cyber-launch", "other-track"]);
        expect([...refused.body.preview.newSharing].sort()).toEqual([
          "cyber-launch",
          "other-track",
        ]);
        expect(
          await prisma.pathwayEnrollment.count({ where: { userId: ids.conf } }),
        ).toBe(0);
        await facilitatorSeesNothingOf(ids.conf, "Cody Confirm");

        const ok = await request(app)
          .post("/api/pathways/enroll")
          .set(as("conf"))
          .send({
            joinCode: joinCode.toLowerCase(),
            version: refused.body.preview.version,
          });
        expect(ok.status).toBe(200);
        expect(ok.body.changed).toBe(true);
        const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
          where: {
            userId_cohortId: { userId: ids.conf, cohortId: ids.cohort },
          },
        });
        expect(Object.keys(row.trackBoundaries as object).sort()).toEqual([
          "cyber-launch",
          "other-track",
        ]);
        expect(row.source).toBe("join_code");
        expect(row.acceptedAt).not.toBeNull();
        expect((await learnerDetail(ids.conf)).status).toBe(200);
      } finally {
        expect((await setTracks(["cyber-launch"])).status).toBe(200);
      }
    });

    it("DB-874-20: a duplicate confirmation is a harmless no-op; a cohort id previews only the learner's own rows", async () => {
      const p = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as("conf"));
      expect(p.status).toBe(200);
      expect(p.body.enrollment.state).toBe("trusted");
      expect(p.body.reason).toBe("nothing_new");
      expect(p.body.canConfirm).toBe(false);
      const before = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.conf, cohortId: ids.cohort } },
      });
      const again = await request(app)
        .post("/api/pathways/enroll")
        .set(as("conf"))
        .send({ cohortId: ids.cohort, version: p.body.version });
      expect(again.status).toBe(200);
      expect(again.body.changed).toBe(false);
      // With nothing pending, even a stale version can grant nothing.
      const stale = await request(app)
        .post("/api/pathways/enroll")
        .set(as("conf"))
        .send({ joinCode, version: "stale" });
      expect(stale.status).toBe(200);
      expect(stale.body.changed).toBe(false);
      const after = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.conf, cohortId: ids.cohort } },
      });
      expect(after.acceptedAt?.getTime()).toBe(before.acceptedAt?.getTime());
      expect(after.trackBoundaries).toEqual(before.trackBoundaries);
      // Another facilitator's cohort id is not a preview target for this learner.
      expect(
        (
          await request(app)
            .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort2}`)
            .set(as("conf"))
        ).status,
      ).toBe(404);
    });

    it("DB-874-21: a facilitator track change racing a confirmation never grants an unseen track", async () => {
      const setTracks = (trackIds: string[]) =>
        request(app)
          .put(`/api/pathways/facilitator/cohorts/${ids.cohort}`)
          .set(as("fac"))
          .send({ trackIds });
      const outcomes: number[] = [];
      try {
        for (let i = 0; i < 6; i++) {
          expect((await setTracks(["cyber-launch"])).status).toBe(200);
          await prisma.pathwayEnrollment.deleteMany({
            where: { userId: ids.race1, cohortId: ids.cohort },
          });
          const seen = await request(app)
            .get(`/api/pathways/enroll/preview?joinCode=${joinCode}`)
            .set(as(ids.race1));
          expect(seen.body.newSharing).toEqual(["cyber-launch"]);
          const [confirm, put] = await Promise.all([
            request(app)
              .post("/api/pathways/enroll")
              .set(as(ids.race1))
              .send({ joinCode, version: seen.body.version }),
            setTracks(["cyber-launch", "other-track"]),
          ]);
          expect(put.status, `round ${i}: put`).toBe(200);
          expect([200, 409], `round ${i}: confirm`).toContain(confirm.status);
          outcomes.push(confirm.status);
          const row = await prisma.pathwayEnrollment.findUnique({
            where: {
              userId_cohortId: { userId: ids.race1, cohortId: ids.cohort },
            },
          });
          if (confirm.status === 200) {
            // Granted exactly what was previewed — never the added track.
            expect(
              Object.keys(row!.trackBoundaries as object),
              `round ${i}`,
            ).toEqual(["cyber-launch"]);
          } else {
            expect(row, `round ${i}: nothing written`).toBeNull();
            expect(confirm.body.error).toBe("preview_changed");
          }
        }
      } finally {
        expect((await setTracks(["cyber-launch"])).status).toBe(200);
      }
      expect(outcomes).toHaveLength(6);
    });

    it("DB-874-22: a confirmation racing an invitation acceptance loses no consent", async () => {
      const email = `${ids.race2}@p.test`;
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.race2,
          cohortId: ids.cohort,
          status: "active",
          source: "legacy",
        },
      });
      expect((await invite(email)).status).toBe(202);
      const inv = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { cohortId_email: { cohortId: ids.cohort, email } },
      });
      const seen = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as(ids.race2));
      expect(seen.body.enrollment.state).toBe("legacy");
      const [confirm, accepted] = await Promise.all([
        request(app)
          .post("/api/pathways/enroll")
          .set(as(ids.race2))
          .send({ cohortId: ids.cohort, version: seen.body.version }),
        accept(ids.race2, inv.id),
      ]);
      // Whichever commits first wins the transition; the other sees the
      // result (a no-op confirmation, or an invitation that is no longer
      // pending) — and no consent is lost either way.
      expect(confirm.status).toBe(200);
      expect([200, 409]).toContain(accepted.status);
      if (accepted.status === 409) {
        expect(accepted.body).toEqual({ error: "invite_not_pending" });
        expect(confirm.body.changed).toBe(true);
      }
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.race2, cohortId: ids.cohort } },
      });
      expect(row.status).toBe("active");
      expect(row.acceptedAt).not.toBeNull();
      expect(Object.keys(row.trackBoundaries as object)).toEqual([
        "cyber-launch",
      ]);
      expect(
        (
          await prisma.pathwayInvite.findUniqueOrThrow({
            where: { id: inv.id },
          })
        ).status,
      ).toBe("accepted");
      expect((await learnerDetail(ids.race2)).status).toBe(200);
    });

    it("DB-874-23: a confirmation racing a revocation ends revoked in every ordering", async () => {
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.race3,
          cohortId: ids.cohort,
          status: "active",
          source: "legacy",
        },
      });
      const seen = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as(ids.race3));
      const [confirm, removed] = await Promise.all([
        request(app)
          .post("/api/pathways/enroll")
          .set(as(ids.race3))
          .send({ cohortId: ids.cohort, version: seen.body.version }),
        request(app)
          .delete(
            `/api/pathways/facilitator/cohorts/${ids.cohort}/learners/${ids.race3}`,
          )
          .set(as("fac")),
      ]);
      expect(removed.status).toBe(204);
      expect([200, 403]).toContain(confirm.status);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.race3, cohortId: ids.cohort } },
      });
      expect(row.status).toBe("revoked");
      if (confirm.status === 403) expect(row.acceptedAt).toBeNull();
      await facilitatorSeesNothingOf(ids.race3, "Rae Three");
    });

    it("DB-874-24: a legacy row keeps the boundaries it already carries; a snapshot-less trusted row asks for nothing", async () => {
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.race4,
          cohortId: ids.cohort,
          status: "active",
          source: "legacy",
          trackBoundaries: { "old-track": "2026-01-01T00:00:00.000Z" },
        },
      });
      const seen = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as(ids.race4));
      expect(seen.body.enrollment.state).toBe("legacy");
      expect(seen.body.newSharing).toEqual(["cyber-launch"]);
      const ok = await request(app)
        .post("/api/pathways/enroll")
        .set(as(ids.race4))
        .send({ cohortId: ids.cohort, version: seen.body.version });
      expect(ok.status).toBe(200);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.race4, cohortId: ids.cohort } },
      });
      const bounds = row.trackBoundaries as Record<string, string>;
      expect(bounds["old-track"]).toBe("2026-01-01T00:00:00.000Z");
      expect(new Date(bounds["cyber-launch"]).getTime()).toBe(
        row.acceptedAt!.getTime(),
      );

      // The operator-backfill shape: trusted, no snapshot → every listed
      // track counts as consented at acceptance; nothing is asked again.
      const acceptedAt = new Date("2026-06-01T00:00:00.000Z");
      await prisma.pathwayEnrollment.create({
        data: {
          userId: ids.race5,
          cohortId: ids.cohort,
          status: "active",
          source: "join_code",
          acceptedAt,
        },
      });
      const home = await request(app)
        .get("/api/pathways/student/home")
        .set(as(ids.race5));
      expect(
        home.body.enrollments.find(
          (e: { cohortId: string }) => e.cohortId === ids.cohort,
        ).consent,
      ).toEqual({ accepted: true, newTracks: [] });
      const quiet = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as(ids.race5));
      expect(quiet.body.reason).toBe("nothing_new");
      expect(quiet.body.tracks).toEqual([
        {
          slug: "cyber-launch",
          consentedSince: acceptedAt.toISOString(),
          requested: false,
        },
      ]);
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

      // …and can still sign in through the cohort code before re-confirming.
      const codeLogin = await request(app)
        .post("/api/auth/pathways-code-login")
        .set(newIp())
        .send({ cohortCode: joinCode, userId: ids.legacy, password: PASSWORD });
      expect(codeLogin.status).toBe(200);

      // The home marks the row as not yet confirmed…
      const homeBefore = await request(app)
        .get("/api/pathways/student/home")
        .set(as("legacy"));
      expect(
        homeBefore.body.enrollments.find(
          (e: { cohortId: string }) => e.cohortId === ids.cohort,
        ).consent,
      ).toEqual({ accepted: false, newTracks: ["cyber-launch"] });
      // …and the learner confirms from there, by cohort id, without the code.
      const preview = await request(app)
        .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
        .set(as("legacy"));
      expect(preview.status).toBe(200);
      expect(preview.body).toMatchObject({
        enrollment: { state: "legacy", acceptedAt: null, source: "legacy" },
        newSharing: ["cyber-launch"],
        canConfirm: true,
      });
      const joined = await request(app)
        .post("/api/pathways/enroll")
        .set(as("legacy"))
        .send({ cohortId: ids.cohort, version: preview.body.version });
      expect(joined.status).toBe(200);
      expect(joined.body.changed).toBe(true);
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: {
          userId_cohortId: { userId: ids.legacy, cohortId: ids.cohort },
        },
      });
      expect(row.acceptedAt).not.toBeNull();
      expect(row.source).toBe("join_code");
      const homeAfter = await request(app)
        .get("/api/pathways/student/home")
        .set(as("legacy"));
      expect(
        homeAfter.body.enrollments.find(
          (e: { cohortId: string }) => e.cohortId === ids.cohort,
        ).consent,
      ).toEqual({ accepted: true, newTracks: [] });
      expect(row.trackBoundaries).toEqual({
        "cyber-launch": row.acceptedAt!.toISOString(),
      });
      expect((await learnerDetail(ids.legacy)).status).toBe(200);
      expect((await roster()).body.unconfirmedLegacyCount).toBe(0);
    });

    it("DB-874-8: joining by code creates a trusted relationship and is idempotent", async () => {
      const first = await joinByCode("joiner");
      expect(first.status).toBe(200);
      const acceptedAt = first.body.enrollment.acceptedAt as string;
      const second = await joinByCode("joiner");
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

      const rejoin = await joinByCode("joiner");
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
      const join = () => joinByCode("twin");
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
    it("DB-874-15: a learner removed after accepting an invitation can be re-invited and returns", async () => {
      const email = `riley-${tag}@p.test`;
      expect((await invite(email)).status).toBe(202);
      const first = await myInvitations("rev");
      expect(first.body.invitations).toHaveLength(1);
      expect((await accept("rev", first.body.invitations[0].id)).status).toBe(
        200,
      );
      expect((await learnerDetail(ids.rev)).status).toBe(200);
      // Work done inside the first relationship is fully visible then.
      const posted = await request(app)
        .post("/api/pathways/student/milestones")
        .set(as("rev"))
        .send({
          trackSlug: "cyber-launch",
          moduleSlug: "cyber-foundations",
          status: "completed",
          score: 88,
        });
      expect(posted.status).toBe(200);
      expect((await visibleModule(ids.rev, "cyber-foundations")).score).toBe(
        88,
      );

      const del = await request(app)
        .delete(
          `/api/pathways/facilitator/cohorts/${ids.cohort}/learners/${ids.rev}`,
        )
        .set(as("fac"));
      expect(del.status).toBe(204);
      const revokedInvite = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { cohortId_email: { cohortId: ids.cohort, email } },
      });
      expect(revokedInvite.status).toBe("revoked");
      await facilitatorSeesNothingOf(ids.rev, "Riley Return");
      // The code is not a way back: the preview says so and confirmation
      // refuses, by code and by cohort id alike.
      const revokedPreview = await request(app)
        .get(`/api/pathways/enroll/preview?joinCode=${joinCode}`)
        .set(as("rev"));
      expect(revokedPreview.status).toBe(200);
      expect(revokedPreview.body).toMatchObject({
        enrollment: { state: "revoked" },
        canConfirm: false,
        reason: "enrollment_revoked",
        newSharing: [],
        tracks: [],
        version: "",
      });
      expect(revokedPreview.body.cohort.facilitatorName).toBeNull();
      expect(
        (
          await request(app)
            .get(`/api/pathways/enroll/preview?cohortId=${ids.cohort}`)
            .set(as("rev"))
        ).body.enrollment.state,
      ).toBe("revoked");
      const refused = await request(app)
        .post("/api/pathways/enroll")
        .set(as("rev"))
        .send({ joinCode, version: "any-version-is-refused" });
      expect(refused.status).toBe(403);
      expect(
        (
          await prisma.pathwayEnrollment.findUniqueOrThrow({
            where: {
              userId_cohortId: { userId: ids.rev, cohortId: ids.cohort },
            },
          })
        ).status,
      ).toBe("revoked");

      // The fresh invitation is the way back.
      expect((await invite(email)).status).toBe(202);
      const again = await myInvitations("rev");
      expect(again.body.invitations).toHaveLength(1);
      expect((await accept("rev", again.body.invitations[0].id)).status).toBe(
        200,
      );
      const row = await prisma.pathwayEnrollment.findUniqueOrThrow({
        where: { userId_cohortId: { userId: ids.rev, cohortId: ids.cohort } },
      });
      expect(row.status).toBe("active");
      expect(row.revokedAt).toBeNull();
      expect(row.acceptedAt).not.toBeNull();
      expect((await learnerDetail(ids.rev)).status).toBe(200);
      // The new acceptance is a new boundary: the earlier completion is
      // untouched since then (hidden), and once touched it is history.
      expect((await learnerDetail(ids.rev)).body.milestones).toHaveLength(0);
      expect(
        (
          await section("rev", "cyber-foundations", "hook", true, {
            timeSpentMinutes: 2,
          })
        ).status,
      ).toBe(200);
      expect(await visibleModule(ids.rev, "cyber-foundations")).toMatchObject({
        status: "in_progress",
        score: null,
        completedAt: null,
        hookCompleted: true,
        timeSpentMinutes: null,
        historyWithheld: true,
      });
    });

    it("DB-874-16: an invitation addressed to a home-access adult is never matched to the child's account", async () => {
      expect((await invite(emails.homeAdult)).status).toBe(202);
      const list = await myInvitations("home");
      expect(list.status).toBe(200);
      expect(list.body.invitations).toHaveLength(0);
      const inv = await prisma.pathwayInvite.findUniqueOrThrow({
        where: {
          cohortId_email: { cohortId: ids.cohort, email: emails.homeAdult },
        },
      });
      expect((await accept("home", inv.id)).status).toBe(404);
      expect(
        (
          await request(app)
            .post(`/api/pathways/student/invitations/${inv.id}/decline`)
            .set(as("home"))
        ).status,
      ).toBe(404);
      // Joining by code is the learner's own act; it must not adopt the
      // adult's invitation as if the learner had been the addressee.
      const join = await joinByCode("home");
      expect(join.status).toBe(200);
      const after = await prisma.pathwayInvite.findUniqueOrThrow({
        where: { id: inv.id },
      });
      expect(after.status).toBe("pending");
      expect(after.acceptedById).toBeNull();
    });

    it("DB-874-17: a home-access login that carries the learner's own address still receives invitations", async () => {
      expect((await invite(emails.homeOwn)).status).toBe(202);
      const list = await myInvitations("home2");
      expect(list.status).toBe(200);
      expect(list.body.invitations).toHaveLength(1);
      expect((await accept("home2", list.body.invitations[0].id)).status).toBe(
        200,
      );
      expect((await learnerDetail(ids.home2)).status).toBe(200);
    });
  },
);
