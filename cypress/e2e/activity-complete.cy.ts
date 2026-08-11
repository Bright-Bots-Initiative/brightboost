/**
 * E3-04 / P-09 — complete seeded quiz; ModuleDetail shows Done after reload.
 * Persistence is on ModuleDetail, not the in-player completion card (React state).
 */

const JOIN_CODE = "E2E001";
const MODULE_SLUG = "e2e-quiz-module";
const ACTIVITY_TITLE = "E2E Quiz Activity";

const ANSWERS = ["Blue", "Four", "Water and light"] as const;

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
      Cypress.env("E3_STUDENT_TOKEN", token);
      Cypress.env("E3_STUDENT_USER", user);
    });
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

function resolveActivityUrl(lessonId: string): Cypress.Chainable<string> {
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
        expect((res as Response).ok, "GET /api/module").to.eq(true);
        return (res as Response).json();
      })
      .then(
        (mod: {
          units?: {
            lessons?: { id: string; activities?: { id: string }[] }[];
          }[];
        }) => {
          const matchedLesson = mod.units?.[0]?.lessons?.[0];
          expect(matchedLesson, "seeded lesson on module").to.exist;
          const activityId = matchedLesson!.activities?.[0]?.id;
          expect(activityId, "activityId via module API").to.be.a("string");
          Cypress.env("LESSON_ID", matchedLesson!.id);
          return `/student/modules/${MODULE_SLUG}/lessons/${matchedLesson!.id}/activities/${activityId}`;
        },
      );
  });
}

function answerInstantQuiz(): void {
  cy.get('[data-testid="instant-quiz"]', { timeout: 15000 }).should(
    "be.visible",
  );
  ANSWERS.forEach((answer, index) => {
    cy.contains(`Question ${index + 1} of 3`).should("be.visible");
    cy.get('[data-testid="question-screen"]')
      .contains("button", answer)
      .click();
    cy.get('[data-testid="feedback-panel"]').should("be.visible");
    const nextLabel = index < ANSWERS.length - 1 ? "Next" : "See how I did!";
    cy.get('[data-testid="feedback-panel"]')
      .contains("button", nextLabel)
      .click();
  });
  cy.get('[data-testid="quiz-summary"]').should("be.visible");
  cy.contains(/Quiz done/i).should("be.visible");
  cy.get('[data-testid="quiz-summary"]').contains("button", "Finish").click();
}

describe("P-09 student completes a quiz activity", () => {
  beforeEach(() => {
    loginAsSeededStudent();
    // Clear prior completions so RED/GREEN assertions are independent of suite order.
    cy.then(() => {
      const studentId = Cypress.env("STUDENT_ID") as string;
      expect(studentId, "STUDENT_ID for progress reset").to.be.a("string");
      // Avoid a literal "$disconnect" in the shell command — bash expands $vars
      // inside double quotes on Linux CI (G-011 / runner shell).
      return cy.exec(
        `node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.progress.deleteMany({where:{studentId:process.env.SID}}).then(async (r)=>{console.log('progressDeleted='+r.count); await p[String.fromCharCode(36)+'disconnect']();})"`,
        {
          env: { SID: studentId },
          failOnNonZeroExit: true,
        },
      );
    });
  });

  it("RED: leaving mid-quiz does not mark the activity Done on ModuleDetail", () => {
    const lessonId = Cypress.env("LESSON_ID") as string;
    expect(lessonId, "CYPRESS_LESSON_ID").to.be.a("string").and.not.be.empty;
    seedSessionAndVisitHome();
    resolveActivityUrl(lessonId).then((url) => {
      cy.visit(url);
    });
    cy.get('[data-testid="instant-quiz"]', { timeout: 15000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="question-screen"]')
      .contains("button", ANSWERS[0])
      .click();
    // Abandon without Finish — progress must not show Done.
    cy.visit(`/student/modules/${MODULE_SLUG}`);
    cy.contains("button", ACTIVITY_TITLE, { timeout: 15000 }).should(
      "be.visible",
    );
    cy.contains("button", ACTIVITY_TITLE).within(() => {
      cy.contains("Done").should("not.exist");
    });
  });

  it("completing the quiz persists Done on ModuleDetail after reload", () => {
    const lessonId = Cypress.env("LESSON_ID") as string;
    expect(lessonId, "CYPRESS_LESSON_ID").to.be.a("string").and.not.be.empty;
    seedSessionAndVisitHome();
    resolveActivityUrl(lessonId).then((url) => {
      cy.visit(url);
    });
    answerInstantQuiz();
    cy.contains(/Activity Complete!/i, { timeout: 15000 }).should("be.visible");

    cy.visit(`/student/modules/${MODULE_SLUG}`);
    cy.contains("button", ACTIVITY_TITLE, { timeout: 15000 }).should(
      "be.visible",
    );
    cy.reload();
    cy.contains("button", ACTIVITY_TITLE, { timeout: 15000 })
      .should("be.visible")
      .within(() => {
        cy.contains("Done").should("be.visible");
      });
  });
});
