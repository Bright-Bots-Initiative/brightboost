describe("P-03 teacher logs in through the UI", () => {
  it("establishes a session via the login form and lands on the dashboard", () => {
    const email = Cypress.env("E2E_TEACHER_EMAIL") as string;
    const password = Cypress.env("E2E_TEACHER_PASSWORD") as string;

    expect(email, "E2E_TEACHER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_TEACHER_PASSWORD").to.be.a("string").and.not.be.empty;

    cy.visit("/teacher-login");
    cy.contains("Teacher Login").should("be.visible");

    cy.get('input[type="email"]').clear().type(email);
    cy.get('input[type="password"]').clear().type(password, { log: false });
    cy.contains("button", "Log In").click();

    cy.url({ timeout: 20000 }).should("include", "/teacher/dashboard");
    // Seeded teacher already has a class — assert chrome, not the empty-state getStarted card.
    cy.get('button[aria-label^="User menu for"]').should("be.visible");

    cy.window().then((win) => {
      expect(
        win.localStorage.getItem("bb_access_token"),
        "bb_access_token",
      ).to.be.a("string").and.not.be.empty;
      expect(win.localStorage.getItem("user"), "user").to.be.a("string").and.not
        .be.empty;
    });
  });
});
