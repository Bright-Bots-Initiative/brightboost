/// <reference types="cypress" />
/**
 * #874 — Pathways consent confirmation through the UI, against the live stack
 * (real backend, seeded PostgreSQL; see scripts/e2e-seed.mjs `PATHWAYS`).
 *
 * Proves: a legacy learner signs in and confirms through the UI and the
 * facilitator's visibility resumes with prior history protected; an existing
 * learner confirms an added track without moving the earlier boundary;
 * preview + cancel write nothing; duplicate submission is harmless; a revoked
 * relationship cannot be restored by the code; a track change between preview
 * and confirmation grants nothing unseen and requires renewed consent; the
 * flow works from the keyboard; success and error states render in EN and ES.
 * Never stubs the app's own API (G-103).
 */

type Contract = {
  pathways: {
    facilitatorEmail: string;
    learners: { legacy: string; trusted: string; revoked: string };
    cohorts: { joinCode: string; name: string }[];
    privateHomework: string;
    legacyScore: number;
  };
};
type Session = { token: string; user: { id: string } };

const SECOND_TRACK = "build-your-own-lane";
const password = () => Cypress.env("E2E_TEACHER_PASSWORD") as string;

const loginApi = (email: string) =>
  cy
    .request({
      method: "POST",
      url: "/api/login",
      body: { email, password: password() },
    })
    .then((r) => {
      expect(r.status, `login ${email}`).to.eq(200);
      return {
        token: r.body.token as string,
        user: r.body.user as { id: string },
      };
    });

const visitAs = (s: Session, path: string, lang = "en") =>
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("bb_access_token", s.token);
      win.localStorage.setItem("user", JSON.stringify(s.user));
      win.localStorage.setItem("preferredLanguage", lang);
    },
  });

const api = (s: Session, method: string, url: string, body?: unknown) =>
  cy.request({
    method,
    url,
    body,
    headers: { Authorization: `Bearer ${s.token}` },
    failOnStatusCode: false,
  });

const cohortIdByName = (fac: Session, name: string) =>
  api(fac, "GET", "/api/pathways/cohorts").then((r) => {
    expect(r.status).to.eq(200);
    const found = (r.body as Array<{ id: string; name: string }>).find(
      (c) => c.name === name,
    );
    expect(found, `cohort ${name}`).to.exist;
    return found!.id;
  });

// The cases below build on one another (a legacy learner confirms once, a
// cohort gains a track once), so they run in order and are not retried; each
// role signs in once so the spec stays well inside the login rate limit.
describe(
  "#874 Pathways consent confirmation (live stack)",
  { retries: 0 },
  () => {
    let contract: Contract;
    const sessions: Partial<
      Record<"facilitator" | "legacy" | "trusted" | "revoked", Session>
    > = {};
    const session = (role: keyof typeof sessions) => {
      const s = sessions[role];
      expect(s, `session ${role}`).to.exist;
      return s as Session;
    };
    before(() => {
      cy.fixture("seed-contract.json").then((c: Contract) => {
        contract = c;
        loginApi(c.pathways.facilitatorEmail).then((s) => {
          sessions.facilitator = s;
        });
        loginApi(c.pathways.learners.legacy).then((s) => {
          sessions.legacy = s;
        });
        loginApi(c.pathways.learners.trusted).then((s) => {
          sessions.trusted = s;
        });
        loginApi(c.pathways.learners.revoked).then((s) => {
          sessions.revoked = s;
        });
      });
    });
    after(() => {
      // Leave the primary cohort as seeded for whatever runs next.
      if (!contract || !sessions.facilitator) return;
      const [primary] = contract.pathways.cohorts;
      cohortIdByName(session("facilitator"), primary.name).then((id) =>
        api(
          session("facilitator"),
          "PUT",
          `/api/pathways/facilitator/cohorts/${id}`,
          {
            trackIds: ["cyber-launch"],
          },
        ),
      );
    });

    it("R1: a revoked learner cannot restore access with the code — in English and Spanish", () => {
      const [primary] = contract.pathways.cohorts;
      cy.then(() => session("revoked")).then((rev) => {
        visitAs(rev, "/pathways/join");
        cy.get("#join-code").type(`${primary.joinCode}{enter}`);
        cy.get('[data-testid="join-preview"]').should("be.visible");
        cy.get('[data-testid="join-state"]').should("contain", "removed you");
        cy.get('[data-testid="join-confirm"]').should("not.exist");

        // The API refuses too, whatever version is sent.
        api(
          rev,
          "GET",
          `/api/pathways/enroll/preview?joinCode=${primary.joinCode}`,
        ).then((p) => {
          expect(p.status).to.eq(200);
          expect(p.body.enrollment.state).to.eq("revoked");
          expect(p.body.canConfirm).to.eq(false);
          api(rev, "POST", "/api/pathways/enroll", {
            joinCode: primary.joinCode,
            version: p.body.version,
          }).then((c) => expect(c.status).to.eq(403));
        });

        visitAs(rev, "/pathways/join", "es");
        cy.get("#join-code").type(`${primary.joinCode}{enter}`);
        cy.get('[data-testid="join-state"]').should(
          "contain",
          "te quitó de este grupo",
        );
        cy.get('[data-testid="join-confirm"]').should("not.exist");
      });
    });

    it("K1: keyboard operation, an invalid code, and preview + cancel write nothing", () => {
      const [, second] = contract.pathways.cohorts;
      cy.then(() => session("trusted")).then((learner) => {
        visitAs(learner, "/pathways/join");
        cy.get("#join-code").focus().type("ZZZZZZ{enter}");
        cy.get('[data-testid="join-error"]').should(
          "contain",
          "doesn't match a cohort",
        );
        cy.focused().should("have.id", "join-code");

        cy.get("#join-code").clear().type(`${second.joinCode}{enter}`);
        cy.get('[data-testid="join-preview"]').should("be.visible");
        cy.focused().should("have.id", "join-preview-title");
        cy.get('[data-testid="join-state"]').should(
          "contain",
          "not in this cohort yet",
        );
        cy.get('[data-testid="join-track-cyber-launch"]').should(
          "have.attr",
          "data-requested",
          "true",
        );

        // An expired session on Confirm: a clear message, a sign-in link, and
        // the typed code is kept — nothing else changes.
        cy.window().then((win) =>
          win.localStorage.setItem("bb_access_token", "expired-token"),
        );
        cy.get('[data-testid="join-confirm"]').click();
        cy.get('[data-testid="join-error"]').should(
          "contain",
          "session has expired",
        );
        cy.get('[data-testid="join-error"] a').should(
          "have.attr",
          "href",
          "/student-login",
        );
        cy.window().then((win) =>
          win.localStorage.setItem("bb_access_token", learner.token),
        );

        // Real key presses: Tab reaches the Cancel control, Enter activates it.
        cy.get('[data-testid="join-confirm"]').focus();
        cy.realPress("Tab");
        cy.focused().should("have.attr", "data-testid", "join-back");
        cy.realPress("Enter");
        cy.get('[data-testid="join-preview"]').should("not.exist");
        cy.get("#join-code").should("have.value", second.joinCode);

        api(
          learner,
          "GET",
          `/api/pathways/enroll/preview?joinCode=${second.joinCode}`,
        ).then((p) => {
          expect(p.status).to.eq(200);
          expect(
            p.body.enrollment.state,
            "preview + cancel wrote nothing",
          ).to.eq("none");
        });
        api(learner, "GET", "/api/pathways/student/home").then((h) => {
          const names = (
            h.body.enrollments as Array<{ cohortName: string }>
          ).map((e) => e.cohortName);
          expect(names).not.to.include(second.name);
        });
      });
    });

    it("L1: a legacy learner signs in through the UI and confirms; visibility resumes with prior history protected", () => {
      const [primary] = contract.pathways.cohorts;
      const legacyEmail = contract.pathways.learners.legacy;
      cy.then(() => session("facilitator")).then((fac) => {
        cohortIdByName(fac, primary.name).then((cohortId) => {
          // Sign in through the UI; land on the home, not the welcome flow.
          cy.visit("/student-login");
          cy.contains("Log in with Email").should("be.visible");
          cy.get('input[type="email"]').clear().type(legacyEmail);
          cy.get('input[type="password"]')
            .clear()
            .type(password(), { log: false });
          cy.contains("button", "Log In").click();
          cy.url({ timeout: 20000 }).should("include", "/pathways");
          cy.get(`[data-testid="consent-prompt-${cohortId}"]`, {
            timeout: 20000,
          }).should("be.visible");
          cy.url().should("not.include", "/welcome");

          cy.window().then((win) => {
            const token = win.localStorage.getItem("bb_access_token") as string;
            const user = JSON.parse(
              win.localStorage.getItem("user") as string,
            ) as { id: string };
            const legacy: Session = { token, user };

            // Before confirming: the facilitator sees nothing of this learner
            // beyond a count of unconfirmed rows.
            api(
              fac,
              "GET",
              `/api/pathways/facilitator/learners/${user.id}`,
            ).then((d) => expect(d.status, "hidden before consent").to.eq(404));
            api(fac, "GET", `/api/pathways/cohorts/${cohortId}`).then((c) =>
              expect(c.body.unconfirmedLegacyCount, "counted, not named").to.eq(
                1,
              ),
            );

            cy.contains("button", "Review and confirm").click();
            cy.url().should("include", `/pathways/join?cohortId=${cohortId}`);
            cy.get('[data-testid="join-state"]').should(
              "contain",
              "have not confirmed sharing yet",
            );
            cy.get('[data-testid="join-track-cyber-launch"]').should(
              "have.attr",
              "data-requested",
              "true",
            );
            cy.contains("New sharing starts when you confirm").should(
              "be.visible",
            );
            cy.get('[data-testid="join-confirm"]').click();
            cy.get('[data-testid="join-done"]').should(
              "contain",
              "You're all set",
            );
            cy.get('[data-testid="join-home"]').click();
            cy.url().should("match", /\/pathways\/?$/);
            cy.get(`[data-testid="consent-prompt-${cohortId}"]`).should(
              "not.exist",
            );

            // After: visible, but January's completed module is untouched → hidden.
            api(
              fac,
              "GET",
              `/api/pathways/facilitator/learners/${user.id}`,
            ).then((d) => {
              expect(d.status, "visible after consent").to.eq(200);
              expect(d.body.milestones).to.have.length(0);
            });
            api(fac, "GET", `/api/pathways/cohorts/${cohortId}`).then((c) =>
              expect(c.body.unconfirmedLegacyCount).to.eq(0),
            );
            api(
              fac,
              "GET",
              `/api/pathways/facilitator/cohorts/${cohortId}/export`,
            ).then((x) => {
              expect(x.status).to.eq(200);
              expect(x.body).not.to.contain(contract.pathways.privateHomework);
              expect(x.body).not.to.match(/"91"/);
            });
            // The learner keeps working; the facilitator sees the activity, never the history.
            api(legacy, "PATCH", "/api/pathways/student/milestones/section", {
              trackSlug: "cyber-launch",
              moduleSlug: "cyber-foundations",
              section: "hook",
              completed: false,
              timeSpentMinutes: 3,
            }).then((r) => expect(r.status).to.eq(200));
            api(
              fac,
              "GET",
              `/api/pathways/facilitator/learners/${user.id}`,
            ).then((d) => {
              const m = (
                d.body.milestones as Array<Record<string, unknown>>
              ).find((x) => x.moduleSlug === "cyber-foundations");
              expect(m, "touched module is admitted").to.exist;
              expect(m!.status).to.eq("in_progress");
              expect(m!.score).to.eq(null);
              expect(m!.homeworkResponse).to.eq(null);
              expect(m!.historyWithheld).to.eq(true);
            });
          });
        });
      });
    });

    it("T1: a track change between preview and confirmation grants nothing unseen and requires renewed consent", () => {
      const [, second] = contract.pathways.cohorts;
      cy.then(() => session("facilitator")).then((fac) => {
        cohortIdByName(fac, second.name).then((secondId) => {
          cy.then(() => session("legacy")).then((learner) => {
            visitAs(learner, "/pathways/join");
            cy.get("#join-code").type(`${second.joinCode}{enter}`);
            cy.get('[data-testid="join-track-cyber-launch"]').should(
              "have.attr",
              "data-requested",
              "true",
            );
            cy.get(`[data-testid="join-track-${SECOND_TRACK}"]`).should(
              "not.exist",
            );

            // The facilitator adds a track after the learner previewed.
            api(fac, "PUT", `/api/pathways/facilitator/cohorts/${secondId}`, {
              trackIds: ["cyber-launch", SECOND_TRACK],
            }).then((r) => expect(r.status).to.eq(200));

            cy.get('[data-testid="join-confirm"]').click();
            cy.get('[data-testid="join-changed"]').should("be.visible");
            cy.get(`[data-testid="join-track-${SECOND_TRACK}"]`).should(
              "have.attr",
              "data-requested",
              "true",
            );
            cy.get('[data-testid="join-done"]').should("not.exist");
            api(
              learner,
              "GET",
              `/api/pathways/enroll/preview?joinCode=${second.joinCode}`,
            ).then((p) =>
              expect(
                p.body.enrollment.state,
                "nothing granted on the stale version",
              ).to.eq("none"),
            );

            // Renewed consent covers exactly what is shown now.
            cy.get('[data-testid="join-confirm"]').click();
            cy.get('[data-testid="join-done"]').should(
              "contain",
              "You're all set",
            );
            api(
              learner,
              "GET",
              `/api/pathways/enroll/preview?joinCode=${second.joinCode}`,
            ).then((p) => {
              expect(p.body.enrollment.state).to.eq("trusted");
              expect(p.body.reason).to.eq("nothing_new");
              const since = (
                p.body.tracks as Array<{ slug: string; consentedSince: string }>
              ).map((t) => t.consentedSince);
              for (const s of since) {
                expect(Date.now() - new Date(s).getTime()).to.be.lessThan(
                  5 * 60 * 1000,
                );
              }
            });
          });
        });
      });
    });

    it("D1: duplicate submission is harmless and a confirmation needs a preview", () => {
      const [, second] = contract.pathways.cohorts;
      cy.then(() => session("trusted")).then((learner) => {
        api(learner, "POST", "/api/pathways/enroll", {
          joinCode: second.joinCode,
        }).then((r) => {
          expect(r.status).to.eq(400);
          expect(r.body.error).to.eq("preview_required");
        });
        api(
          learner,
          "GET",
          `/api/pathways/enroll/preview?joinCode=${second.joinCode}`,
        ).then((p) => {
          const body = {
            joinCode: second.joinCode,
            version: p.body.version as string,
          };
          api(learner, "POST", "/api/pathways/enroll", body).then((first) => {
            expect(first.status).to.eq(200);
            expect(first.body.changed).to.eq(true);
            api(learner, "POST", "/api/pathways/enroll", body).then((again) => {
              expect(again.status).to.eq(200);
              expect(again.body.changed, "duplicate is a no-op").to.eq(false);
              expect(again.body.enrollment.acceptedAt).to.eq(
                first.body.enrollment.acceptedAt,
              );
              expect(again.body.enrollment.trackBoundaries).to.deep.eq(
                first.body.enrollment.trackBoundaries,
              );
            });
          });
        });
      });
    });

    it("A1: an existing learner confirms an added track without moving the earlier boundary", () => {
      const [primary] = contract.pathways.cohorts;
      cy.then(() => session("facilitator")).then((fac) => {
        cohortIdByName(fac, primary.name).then((cohortId) => {
          api(fac, "PUT", `/api/pathways/facilitator/cohorts/${cohortId}`, {
            trackIds: ["cyber-launch", SECOND_TRACK],
          }).then((r) => expect(r.status).to.eq(200));
          cy.then(() => session("trusted")).then((learner) => {
            visitAs(learner, "/pathways");
            cy.get(`[data-testid="consent-prompt-${cohortId}"]`, {
              timeout: 20000,
            })
              .should("contain", "added new tracks")
              .within(() =>
                cy.contains("button", "Review and confirm").click(),
              );
            cy.get('[data-testid="join-track-cyber-launch"]')
              .should("have.attr", "data-requested", "false")
              .and("contain", "Already sharing since");
            cy.get(`[data-testid="join-track-${SECOND_TRACK}"]`).should(
              "have.attr",
              "data-requested",
              "true",
            );
            cy.get('[data-testid="join-confirm"]').click();
            cy.get('[data-testid="join-done"]').should(
              "contain",
              "You're all set",
            );

            api(
              learner,
              "GET",
              `/api/pathways/enroll/preview?cohortId=${cohortId}`,
            ).then((p) => {
              const tracks = p.body.tracks as Array<{
                slug: string;
                consentedSince: string;
              }>;
              const earlier = tracks.find((t) => t.slug === "cyber-launch")!;
              const added = tracks.find((t) => t.slug === SECOND_TRACK)!;
              expect(
                earlier.consentedSince,
                "earlier boundary unchanged",
              ).to.eq("2026-08-01T12:00:00.000Z");
              expect(
                Date.now() - new Date(added.consentedSince).getTime(),
              ).to.be.lessThan(5 * 60 * 1000);
              expect(p.body.canConfirm).to.eq(false);
            });
          });
        });
      });
    });

    it("E1: success and error states render in Spanish", () => {
      const [primary] = contract.pathways.cohorts;
      cy.then(() => session("facilitator")).then((fac) => {
        cohortIdByName(fac, primary.name).then((cohortId) => {
          cy.then(() => session("legacy")).then((learner) => {
            // The primary cohort lists a track this learner has not confirmed
            // (self-contained: the PUT is idempotent if A1 already did it).
            api(fac, "PUT", `/api/pathways/facilitator/cohorts/${cohortId}`, {
              trackIds: ["cyber-launch", SECOND_TRACK],
            }).then((r) => expect(r.status).to.eq(200));
            visitAs(learner, "/pathways", "es");
            cy.get(`[data-testid="consent-prompt-${cohortId}"]`, {
              timeout: 20000,
            })
              .should("contain", "agregó rutas nuevas")
              .within(() =>
                cy.contains("button", "Revisar y confirmar").click(),
              );
            cy.get('[data-testid="join-state"]').should(
              "contain",
              "Ya compartes con este grupo",
            );
            cy.get('[data-testid="join-cohort"]').should(
              "not.contain",
              "pathways.join.",
            );
            cy.contains("button", "Confirmar y compartir desde hoy").click();
            cy.get('[data-testid="join-done"]').should("contain", "Todo listo");

            visitAs(learner, "/pathways/join", "es");
            cy.get("#join-code").type("ZZZZZZ{enter}");
            cy.get('[data-testid="join-error"]').should(
              "contain",
              "Ese código no corresponde",
            );
          });
        });
      });
    });
  },
);
