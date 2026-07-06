/**
 * K-2 instant-feedback quiz E2E (Issue #623, Part T3 + expansion).
 *
 * Stub mode (default): API intercepts — no Docker required.
 * Live mode (LIVE_STACK=1): real login + seeded DB — see k2InstantQuiz.helpers.js header.
 */
import {
  G35_STUDENT,
  K2_STUDENT,
  MODULE_SLUG,
  Q1_CORRECT,
  Q1_WRONG,
  Q2_CORRECT,
  Q3_CORRECT,
  QUESTION_COUNT,
  SLIDE_COUNT,
  advanceThroughStory,
  assertCorrectCheer,
  assertIncorrectCheer,
  clickFeedbackNext,
  enterK2QuizFromLogin,
  enterK2QuizFromLoginLive,
  isLiveStack,
  loginStudent,
  resolveStoryQuizUrl,
  runK2QuizToSummary,
  setupStudent,
  tapChoice,
  visitRhymeRideActivity,
} from "./k2InstantQuiz.helpers.js";

const k2StudentRecord = {
  id: "student-123",
  email: K2_STUDENT.email,
  name: "Test Student",
  role: "student",
};

const g35StudentRecord = {
  id: "jordan-g35",
  email: G35_STUDENT.email,
  name: "Jordan",
  role: "student",
};

function assertK2FullJourneyCompletion({ live = false } = {}) {
  cy.get('[data-testid="quiz-summary"]').contains("button", "Finish").click();
  if (!live) {
    cy.wait("@completeActivity");
  }
  cy.contains("Activity Completed!", { timeout: 15000 }).should("be.visible");
  cy.contains("Activity Complete!", { timeout: 15000 }).should("be.visible");
  cy.contains("You earned").should("be.visible");
  cy.contains("+25 points").should("be.visible");
}

function runAc42QuizAssertions() {
  cy.get('[data-testid="instant-quiz"]', { timeout: 15000 }).should(
    "be.visible",
  );
  cy.contains(`Question 1 of ${QUESTION_COUNT}`).should("be.visible");

  tapChoice(Q1_WRONG);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  assertIncorrectCheer();
  cy.get('[data-testid="feedback-panel"]').should(
    "contain.text",
    "The answer is:",
  );
  cy.get('[data-testid="feedback-panel"]').should("contain.text", Q1_CORRECT);
  cy.get('[data-testid="feedback-panel"]').should("contain.text", "💡");
  cy.get('[data-testid="feedback-panel"]').should(
    "contain.text",
    "sounds like cat",
  );
  cy.get('[data-testid="question-screen"]')
    .contains("button", Q1_CORRECT)
    .should("have.class", "border-emerald-500");
  cy.get('[data-testid="question-screen"]')
    .find("button")
    .each(($btn) => {
      cy.wrap($btn).should("be.disabled");
    });

  clickFeedbackNext();
  cy.contains(`Question 2 of ${QUESTION_COUNT}`).should("be.visible");

  tapChoice(Q2_CORRECT);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  assertCorrectCheer();
  cy.get('[data-testid="feedback-panel"]').should(
    "not.contain.text",
    "The answer is:",
  );
  cy.get('[data-testid="feedback-panel"]').should("not.contain.text", "💡");

  clickFeedbackNext();
  cy.contains(`Question 3 of ${QUESTION_COUNT}`).should("be.visible");

  tapChoice(Q3_CORRECT);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  assertCorrectCheer();
  clickFeedbackNext("See how I did!");

  cy.get('[data-testid="quiz-summary"]').should("be.visible");
  cy.contains("Quiz done!").should("be.visible");
  cy.contains("You got 2 of 3 right!").should("be.visible");
}

describe("k2 instant-feedback quiz", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("AC-4.2: K-2 instant-feedback quiz full journey", () => {
    enterK2QuizFromLogin(k2StudentRecord, K2_STUDENT);
    runAc42QuizAssertions();
    assertK2FullJourneyCompletion();
  });

  it("AC-4.1: perfect score shows encouragement line", () => {
    enterK2QuizFromLogin(k2StudentRecord, K2_STUDENT);
    runK2QuizToSummary({
      q1: Q1_CORRECT,
      q2: Q2_CORRECT,
      q3: Q3_CORRECT,
    });
    cy.contains("You got 3 of 3 right!").should("be.visible");
    cy.contains("Perfect! Every single one!").should("be.visible");
  });

  it("AC-4.3: Finish shows error toast and re-enables when completion API fails", () => {
    enterK2QuizFromLogin(k2StudentRecord, K2_STUDENT);
    runK2QuizToSummary({
      q1: Q1_WRONG,
      q2: Q2_CORRECT,
      q3: Q3_CORRECT,
    });
    cy.contains("You got 2 of 3 right!").should("be.visible");

    cy.intercept("POST", "**/api/progress/complete-activity", {
      statusCode: 500,
      body: { error: "fail" },
    }).as("completeActivityFail");

    cy.get('[data-testid="quiz-summary"]')
      .contains("button", "Finish")
      .should("not.be.disabled")
      .click();
    cy.wait("@completeActivityFail");

    cy.contains("Oops!", { timeout: 15000 }).should("be.visible");
    cy.contains("We couldn't save that one. Try again!").should("be.visible");
    cy.get('[data-testid="quiz-summary"]').should("be.visible");
    cy.get('[data-testid="quiz-summary"]')
      .contains("button", "Finish")
      .should("not.be.disabled");
  });

  it("E2-01 proxy: quiz completable at 375px width", () => {
    cy.viewport(375, 667);
    enterK2QuizFromLogin(k2StudentRecord, K2_STUDENT);
    runK2QuizToSummary({
      q1: Q1_WRONG,
      q2: Q2_CORRECT,
      q3: Q3_CORRECT,
    });
    cy.contains("You got 2 of 3 right!").should("be.visible");
  });

  it("AC-5.1: g3_5 student sees legacy Submit quiz on same activity", () => {
    setupStudent("g3_5", g35StudentRecord);
    loginStudent(G35_STUDENT.email, G35_STUDENT.password);

    resolveStoryQuizUrl(MODULE_SLUG).then((activityPath) => {
      cy.visit(activityPath);
    });
    cy.wait("@getModule");
    cy.wait("@studentCourses");

    advanceThroughStory();

    cy.get('[data-testid="instant-quiz"]').should("not.exist");
    cy.contains("button", "Submit").should("be.visible");
    cy.contains("button", "Submit").should("be.disabled");
  });
});

(isLiveStack() ? describe : describe.skip)("live stack smoke", () => {
  before(function liveStackPreflight() {
    cy.request({
      method: "POST",
      url: "/api/login",
      body: { email: K2_STUDENT.email, password: K2_STUDENT.password },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status !== 200) {
        cy.log(
          `Live stack unavailable (POST /api/login → ${resp.status}). ` +
            "Start Docker Postgres (docker-compose-pg.yml), run prisma db push + seed, " +
            "restart backend :3000, then re-run npm run test:ticket-626:e2e:live.",
        );
        this.skip();
      }
    });
  });

  it("AC-4.2 live: K-2 journey against seeded stack", () => {
    enterK2QuizFromLoginLive(K2_STUDENT);
    runAc42QuizAssertions();
    assertK2FullJourneyCompletion({ live: true });
  });
});
