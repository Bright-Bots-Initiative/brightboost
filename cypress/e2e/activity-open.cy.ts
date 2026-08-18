/**
 * E3-03 / P-08 — student opens seeded quiz; first question matches seed-contract.
 * Session via inline class-login request (no support-command ownership — G-016).
 * No app API stubs (G-103). Assert text / roles / data-testid only (G-105).
 */

const JOIN_CODE = "E2E001";
const MODULE_SLUG = "e2e-quiz-module";
const Q1_PROMPT = "What color is the sky on a clear day?";
const Q1_CHOICES = ["Blue", "Green", "Purple"] as const;

function loginAsSeededStudent(): void {
  cy.request(`/api/classes/by-code/${JOIN_CODE}`).then((classResp) => {
    expect(classResp.status, "class-by-code").to.eq(200);
    const body = classResp.body as {
      courseId: string;
      students: { id: string; name: string }[];
    };
    const one = body.students.find((s) => s.name === "E2E Student One");
    expect(one, "E2E Student One").to.exist;
    Cypress.env("STUDENT_ID", one!.id);

    cy.request({
      method: "POST",
      url: "/api/auth/class-login",
      body: { courseId: body.courseId, studentId: one!.id },
      failOnStatusCode: false,
    }).then((loginResp) => {
      expect(loginResp.status, "class-login status").to.eq(200);
      const { token, user } = loginResp.body as {
        token?: string;
        user?: unknown;
      };
      expect(token, "class-login token").to.be.a("string").and.not.be.empty;
      // Persist across tests — Cypress aliases clear between `it`s.
      Cypress.env("E3_STUDENT_TOKEN", token);
      Cypress.env("E3_STUDENT_USER", user);
    });
  });
}

function resolveActivityUrl(
  lessonId: string,
  activityIdOverride?: string,
): Cypress.Chainable<string> {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem("bb_access_token");
    expect(token, "bb_access_token").to.be.a("string").and.not.be.empty;
    return cy
      .wrap(
        win.fetch(`/api/module/${MODULE_SLUG}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        { timeout: 15000 },
      )
      .then((res) => {
        expect((res as Response).ok, "GET /api/module/e2e-quiz-module").to.eq(
          true,
        );
        return (res as Response).json();
      })
      .then(
        (mod: {
          units?: {
            lessons?: { id: string; activities?: { id: string }[] }[];
          }[];
        }) => {
          // Always take the live module tree (cache/env ids can desync after reseed).
          const matchedLesson = mod.units?.[0]?.lessons?.[0];
          expect(matchedLesson, "seeded lesson on module").to.exist;
          const activityId = matchedLesson!.activities?.[0]?.id;
          expect(
            activityId,
            "activityId for lesson via GET /api/module",
          ).to.be.a("string");
          Cypress.env("LESSON_ID", matchedLesson!.id);
          const aid = activityIdOverride ?? (activityId as string);
          return `/student/modules/${MODULE_SLUG}/lessons/${matchedLesson!.id}/activities/${aid}`;
        },
      );
  });
}

function seedSessionAndVisitHome(): void {
  const token = Cypress.env("E3_STUDENT_TOKEN") as string;
  const user = Cypress.env("E3_STUDENT_USER");
  expect(token, "E3_STUDENT_TOKEN").to.be.a("string").and.not.be.empty;
  cy.visit("/", {
    onBeforeLoad(win) {
      win.localStorage.setItem("bb_access_token", token);
      win.localStorage.setItem("user", JSON.stringify(user));
    },
  });
}

describe("P-08 student opens a quiz activity", () => {
  beforeEach(() => {
    loginAsSeededStudent();
  });

  it("RED: wrong activity id does not show the seeded first question", () => {
    const lessonId = Cypress.env("LESSON_ID") as string;
    expect(lessonId, "CYPRESS_LESSON_ID").to.be.a("string").and.not.be.empty;
    seedSessionAndVisitHome();
    resolveActivityUrl(lessonId, "not-a-real-activity-id").then((url) => {
      cy.visit(url);
    });
    cy.contains(Q1_PROMPT).should("not.exist");
  });

  it("renders question 1 with seed prompt and selectable choices", () => {
    const lessonId = Cypress.env("LESSON_ID") as string;
    expect(lessonId, "CYPRESS_LESSON_ID").to.be.a("string").and.not.be.empty;
    seedSessionAndVisitHome();
    resolveActivityUrl(lessonId).then((url) => {
      cy.visit(url);
    });
    cy.get('[data-testid="instant-quiz"]', { timeout: 15000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="question-screen"]').should("be.visible");
    cy.contains("Question 1 of 3").should("be.visible");
    cy.contains(Q1_PROMPT).should("be.visible");
    for (const choice of Q1_CHOICES) {
      cy.get('[data-testid="question-screen"]')
        .contains("button", choice)
        .should("be.visible")
        .and("not.be.disabled");
    }
  });
});
