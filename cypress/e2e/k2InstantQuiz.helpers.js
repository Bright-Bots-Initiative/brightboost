/**
 * Shared helpers for k2 instant-feedback quiz e2e (Issue #623, Part T3).
 *
 * Pinned module: k2-stem-rhyme-ride (visible in student UI — NOT k2-stem-sequencing,
 * which is in HIDDEN_MODULE_SLUGS).
 *
 * Answer keys from brightboost/prisma/seed.cjs (content.rhymo q1–q3) and
 * brightboost/src/locales/en/common.json content.rhymo.q* (answerIndex fields).
 *
 * Live stack (Cypress.env LIVE_STACK=1): docker compose -f brightboost/docker-compose-pg.yml up -d;
 * prisma db push + seed; backend :3000 + frontend :5173.
 */
export const MODULE_SLUG = "k2-stem-rhyme-ride";
export const QUESTION_COUNT = 3;
export const SLIDE_COUNT = 4;

// Q1 answerIndex 0 → c1 (Hat); tap wrong c2 (Dog)
export const Q1_WRONG = "Dog";
export const Q1_CORRECT = "Hat";
// Q2 answerIndex 1 → c2 (Run)
export const Q2_CORRECT = "Run";
// Q3 answerIndex 1 → c2 (End)
export const Q3_CORRECT = "End";

export const K2_STUDENT = { email: "student@test.com", password: "password" };
export const G35_STUDENT = { email: "jordan@test.com", password: "jordan123" };

export const INCORRECT_CHEERS = [
  "Good try!",
  "Nice thinking!",
  "So close!",
  "Keep going, you've got this!",
];

export const CORRECT_CHEERS = [
  "You got it!",
  "Great job!",
  "Amazing!",
  "Super smart!",
  "Way to go!",
];

/** Module payload mirroring seed.cjs rhymeStoryContent for k2-stem-rhyme-ride. */
export const rhymeRideModuleFixture = {
  slug: MODULE_SLUG,
  title: "Rhyme & Ride",
  units: [
    {
      id: "e2e-unit-rhyme",
      lessons: [
        {
          id: "e2e-lesson-rhyme-ride",
          title: "Rhyme & Ride",
          activities: [
            {
              id: "e2e-activity-rhyme-story",
              kind: "INFO",
              title: "Story: Meet Rhymo",
              content: JSON.stringify({
                type: "story_quiz",
                slides: [
                  { id: "s1", text: { i18nKey: "content.rhymo.s1" }, icon: "🚲" },
                  { id: "s2", text: { i18nKey: "content.rhymo.s2" }, icon: "🎵" },
                  { id: "s3", text: { i18nKey: "content.rhymo.s3" }, icon: "🐱" },
                  { id: "s4", text: { i18nKey: "content.rhymo.s4" }, icon: "🏁" },
                ],
                questions: [
                  {
                    id: "q1",
                    prompt: { i18nKey: "content.rhymo.q1.prompt" },
                    choices: [
                      { i18nKey: "content.rhymo.q1.c1" },
                      { i18nKey: "content.rhymo.q1.c2" },
                      { i18nKey: "content.rhymo.q1.c3" },
                      { i18nKey: "content.rhymo.q1.c4" },
                    ],
                    answerIndex: 0,
                    hint: { i18nKey: "content.rhymo.q1.hint" },
                  },
                  {
                    id: "q2",
                    prompt: { i18nKey: "content.rhymo.q2.prompt" },
                    choices: [
                      { i18nKey: "content.rhymo.q2.c1" },
                      { i18nKey: "content.rhymo.q2.c2" },
                      { i18nKey: "content.rhymo.q2.c3" },
                      { i18nKey: "content.rhymo.q2.c4" },
                    ],
                    answerIndex: 1,
                    hint: { i18nKey: "content.rhymo.q2.hint" },
                  },
                  {
                    id: "q3",
                    prompt: { i18nKey: "content.rhymo.q3.prompt" },
                    choices: [
                      { i18nKey: "content.rhymo.q3.c1" },
                      { i18nKey: "content.rhymo.q3.c2" },
                      { i18nKey: "content.rhymo.q3.c3" },
                      { i18nKey: "content.rhymo.q3.c4" },
                    ],
                    answerIndex: 1,
                    hint: { i18nKey: "content.rhymo.q3.hint" },
                  },
                ],
              }),
            },
          ],
        },
      ],
    },
  ],
};

export function isLiveStack() {
  const flag = Cypress.env("LIVE_STACK");
  return flag === 1 || flag === "1" || flag === true;
}

export function stubSharedStudentApis(gradeBand, student) {
  const courses =
    gradeBand === "g3_5" ? [{ id: "g35-class", gradeBand: "g3_5" }] : [];

  cy.intercept("GET", "**/api/get-progress*", {
    user: {
      id: student.id,
      email: student.email,
      name: student.name,
      role: student.role,
    },
    progress: [],
  }).as("getProgress");
  cy.intercept("GET", "**/api/modules*", []).as("getModules");
  cy.intercept("GET", "**/api/student/courses", courses).as("studentCourses");
  cy.intercept("GET", "**/api/avatar/me", {
    avatar: { archetype: null, stage: "GENERAL" },
  }).as("avatarMe");
  cy.intercept(
    "GET",
    `**/api/module/${MODULE_SLUG}*`,
    rhymeRideModuleFixture,
  ).as("getModule");
  cy.intercept("POST", "**/api/progress/complete-activity", {
    reward: { xpDelta: 25, levelDelta: 0 },
  }).as("completeActivity");
}

export function stubLogin(student) {
  cy.intercept("POST", "**/api/login", {
    token: `e2e-token-${student.role}`,
    user: {
      id: student.id,
      email: student.email,
      name: student.name,
      role: student.role,
    },
  }).as("login");
}

export function setupStudent(gradeBand, student) {
  stubSharedStudentApis(gradeBand, student);
  stubLogin(student);
}

export function loginStudent(email, password) {
  cy.visit("/student/login");
  cy.url({ timeout: 15000 }).should("include", "/student-login");
  cy.get('input[placeholder="Email address"]').type(email);
  cy.get('input[placeholder="Password"]').type(password);
  cy.contains("button", "Log In").click();
  cy.wait("@login");
  cy.url({ timeout: 15000 }).should("include", "/student/dashboard");
}

/** Live stack: real login (cy.session caches one login per spec run). */
export function loginStudentLive(email, password) {
  cy.session(
    ["k2-e2e-live", email],
    () => {
      cy.visit("/student/login");
      cy.url({ timeout: 15000 }).should("include", "/student-login");
      cy.get('input[placeholder="Email address"]').type(email);
      cy.get('input[placeholder="Password"]').type(password);
      cy.contains("button", "Log In").click();
      cy.url({ timeout: 15000 }).should("include", "/student/dashboard");
      cy.window()
        .its("localStorage.bb_access_token")
        .should("be.a", "string")
        .and("not.be.empty");
    },
    {
      validate() {
        cy.window()
          .its("localStorage.bb_access_token")
          .should("exist")
          .and("not.be.empty");
      },
    },
  );
}

export function resolveStoryQuizUrl(moduleSlug) {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem("bb_access_token");
    expect(token, "bb_access_token after login").to.be.a("string").and.not.be
      .empty;

    return cy
      .wrap(
        win.fetch(`/api/module/${moduleSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        { timeout: 15000 },
      )
      .then((res) => {
        expect(res.ok, "GET /api/module/{slug}").to.be.true;
        return res.json();
      })
      .then((body) => {
        const lesson = body.units?.[0]?.lessons?.[0];
        expect(lesson, "seeded lesson").to.exist;
        const storyActivity = lesson.activities?.find(
          (a) => a.kind === "INFO",
        );
        expect(storyActivity, "INFO story_quiz activity").to.exist;
        return `/student/modules/${moduleSlug}/lessons/${lesson.id}/activities/${storyActivity.id}`;
      });
  });
}

export function visitRhymeRideActivity() {
  resolveStoryQuizUrl(MODULE_SLUG).then((activityPath) => {
    cy.visit(activityPath);
  });
  cy.wait("@getModule");
}

export function visitRhymeRideActivityLive() {
  resolveStoryQuizUrl(MODULE_SLUG).then((activityPath) => {
    cy.visit(activityPath);
  });
}

export function advanceThroughStory(slideCount) {
  if (slideCount === undefined) {
    const clickUntilQuiz = (attemptsLeft) => {
      if (attemptsLeft <= 0) {
        throw new Error("Story never reached Start Quiz");
      }
      cy.get("body").then(($body) => {
        if ($body.text().includes("Start Quiz")) {
          cy.contains("button", "Start Quiz").click();
        } else {
          cy.contains("button", "Next").click();
          clickUntilQuiz(attemptsLeft - 1);
        }
      });
    };
    clickUntilQuiz(8);
    return;
  }

  for (let i = 0; i < slideCount - 1; i += 1) {
    cy.contains("button", "Next").click();
  }
  cy.contains("button", "Start Quiz").click();
}

export function enterK2QuizFromLogin(student, credentials) {
  setupStudent("k2", student);
  loginStudent(credentials.email, credentials.password);
  visitRhymeRideActivity();
  advanceThroughStory(SLIDE_COUNT);
}

export function enterK2QuizFromLoginLive(credentials) {
  loginStudentLive(credentials.email, credentials.password);
  cy.visit("/student/dashboard");
  visitRhymeRideActivityLive();
  advanceThroughStory(SLIDE_COUNT);
}

export function tapChoice(partialText) {
  cy.get('[data-testid="question-screen"]')
    .contains("button", partialText)
    .click();
}

export function clickFeedbackNext(label = "Next") {
  cy.get('[data-testid="feedback-panel"]')
    .contains("button", label)
    .click();
}

export function assertIncorrectCheer() {
  cy.get('[data-testid="feedback-panel"]')
    .find('[role="status"]')
    .invoke("text")
    .then((text) => {
      const matched = INCORRECT_CHEERS.some((cheer) => text.includes(cheer));
      expect(matched, `encouragement in live region: "${text}"`).to.be.true;
    });
}

export function assertCorrectCheer() {
  cy.get('[data-testid="feedback-panel"]')
    .find('[role="status"]')
    .invoke("text")
    .then((text) => {
      const matched = CORRECT_CHEERS.some((cheer) => text.includes(cheer));
      expect(matched, `cheer in live region: "${text}"`).to.be.true;
    });
}

/** Answer Q1–Q3 and land on quiz summary (instant-quiz must already be visible). */
export function runK2QuizToSummary({ q1, q2, q3 }) {
  cy.get('[data-testid="instant-quiz"]', { timeout: 15000 }).should(
    "be.visible",
  );
  cy.contains(`Question 1 of ${QUESTION_COUNT}`).should("be.visible");

  tapChoice(q1);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  clickFeedbackNext();

  cy.contains(`Question 2 of ${QUESTION_COUNT}`).should("be.visible");
  tapChoice(q2);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  clickFeedbackNext();

  cy.contains(`Question 3 of ${QUESTION_COUNT}`).should("be.visible");
  tapChoice(q3);
  cy.get('[data-testid="feedback-panel"]').should("be.visible");
  clickFeedbackNext("See how I did!");

  cy.get('[data-testid="quiz-summary"]').should("be.visible");
}
