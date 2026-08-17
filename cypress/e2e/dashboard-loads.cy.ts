/**
 * E2-02 — P-05 teacher dashboard loads seeded data.
 * Exact seeded counts (G-015). No CSS-class assertions (G-105).
 *
 * RED evidence (2026-07-31): asserting "4 students" failed with
 * `Timed out retrying after 10000ms: Expected to find content: '4 students' but never did.`
 */
describe("P-05 teacher dashboard loads seeded data", () => {
  before(() => {
    // Per-file reset (overview §6.1) — not per-test.
    cy.exec("npm run e2e:reset", { failOnNonZeroExit: true });
  });

  it("renders E2E Class with exactly 3 students and no stuck loading state", () => {
    cy.loginAsTeacher();
    cy.visit("/teacher/dashboard");

    // Loading skeleton uses aria-busy; must clear before assertions.
    cy.get("[aria-busy='true']").should("not.exist");

    cy.contains("E2E Class").should("be.visible");
    // i18n teacher.classDetail.students → "{{count}} students"
    cy.contains("3 students").should("be.visible");
  });
});
