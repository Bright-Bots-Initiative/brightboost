/**
 * E3-02 / P-07 — seeded student class-login → activity surface.
 * Auth subject is the class-login UI (not teacher form). No app API stubs (G-103).
 *
 * Note: /classes/by-code and /auth/class-login share authLimiter (20/15min).
 * Avoid extra cy.request auth hits — the UI already calls by-code once.
 */

const JOIN_CODE = "E2E001";
const MODULE_TITLE = "E2E Quiz Module";
const MODULE_SLUG = "e2e-quiz-module";

describe("P-07 student joins / logs in", () => {
  it("E3-01: CYPRESS_STUDENT_ID and CYPRESS_LESSON_ID resolve into Cypress.env", () => {
    const studentId = Cypress.env("STUDENT_ID") as string | undefined;
    const lessonId = Cypress.env("LESSON_ID") as string | undefined;
    expect(studentId, "CYPRESS_STUDENT_ID → Cypress.env('STUDENT_ID')").to.be.a(
      "string",
    ).and.not.be.empty;
    expect(
      lessonId,
      "CYPRESS_LESSON_ID → Cypress.env('LESSON_ID') (lesson id, not activity)",
    ).to.be.a("string").and.not.be.empty;
  });

  it("fails loudly for an unknown class code (RED property)", () => {
    cy.visit("/class-login", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.contains("What's your class code?").should("be.visible");
    cy.get('input[placeholder="ABC123"]')
      .should("be.visible")
      .focus()
      .type("{selectall}{backspace}ZZZZZZ");
    cy.contains("button", "Next").should("not.be.disabled").click();
    cy.contains(/Class not found/i, { timeout: 15000 }).should("be.visible");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("bb_access_token"), "no session").to.eq(
        null,
      );
    });
  });

  it("establishes a session and reaches the activity surface", () => {
    const studentId = Cypress.env("STUDENT_ID") as string;
    expect(studentId, "seeded CYPRESS_STUDENT_ID").to.be.a("string").and.not.be
      .empty;

    cy.visit(`/class-login?code=${JOIN_CODE}`, {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.contains("Find your icon!", { timeout: 15000 }).should("be.visible");

    // Seed order: 🐱 Student One, 🐶 Two, 🦊 Three — pick by icon text (G-105: no Tailwind class).
    cy.contains("button", "🐱").should("be.visible").click();

    cy.url({ timeout: 15000 }).should("include", "/student/dashboard");
    cy.window()
      .its("localStorage.bb_access_token")
      .should("be.a", "string")
      .and("not.be.empty");
    cy.window().then((win) => {
      const raw = win.localStorage.getItem("user");
      expect(raw, "user in localStorage").to.be.a("string");
      const user = JSON.parse(raw as string) as { id?: string; name?: string };
      expect(user.name, "seeded student name").to.eq("E2E Student One");
      expect(user.id, "session user id").to.be.a("string").and.not.be.empty;
      // Keep Cypress.env in sync with the live roster (parallel reseeds desync shell env).
      Cypress.env("STUDENT_ID", user.id);
    });

    cy.get('[data-testid="nav-learn"]').click();
    cy.url().should("include", "/student/modules");
    cy.visit(`/student/modules/${MODULE_SLUG}`);
    cy.contains(MODULE_TITLE, { timeout: 15000 }).should("be.visible");
    cy.contains("E2E Quiz Activity").should("be.visible");
  });
});
