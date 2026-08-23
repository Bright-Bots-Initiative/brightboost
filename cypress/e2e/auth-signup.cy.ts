describe("P-02 teacher signs up", () => {
  it("creates a teacher account and lands on the dashboard with a session", () => {
    const email = `teacher+e1-${Date.now()}@e2e.invalid`;
    // Ephemeral password for this run only — never a committed secret (G-003).
    const password = `E2e!${Date.now().toString(36)}Aa1`;

    cy.visit("/teacher/signup");
    cy.contains("Let's get you set up").should("be.visible");

    cy.get("#name").type("E2E Signup Teacher");
    cy.get("#email").type(email);
    cy.get("#password").type(password, { log: false });
    cy.get("#confirmPassword").type(password, { log: false });
    cy.get("#agreeTerms").should("have.attr", "aria-checked", "false").click();
    cy.get("#agreeTerms").should("have.attr", "aria-checked", "true");

    cy.contains("button", "Create my teacher account")
      .should("not.be.disabled")
      .click();

    cy.url({ timeout: 20000 }).should("include", "/teacher/dashboard");
    cy.contains("Welcome to BrightBoost!").should("be.visible");

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
