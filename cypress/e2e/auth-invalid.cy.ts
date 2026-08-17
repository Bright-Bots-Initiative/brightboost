describe("P-04 teacher logs in with wrong credentials", () => {
  it("shows an error, establishes no session, and stays on the login surface", () => {
    const email = Cypress.env("E2E_TEACHER_EMAIL") as string;
    expect(email, "E2E_TEACHER_EMAIL").to.be.a("string").and.not.be.empty;

    cy.visit("/teacher-login");
    cy.contains("Teacher Login").should("be.visible");

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type("definitely-not-the-password", {
      log: false,
    });
    cy.contains("button", "Log In").click();

    cy.contains("Invalid email or password").should("be.visible");
    cy.url().should("include", "/teacher-login");

    cy.window().then((win) => {
      expect(
        win.localStorage.getItem("bb_access_token"),
        "bb_access_token must remain unset",
      ).to.be.oneOf([null, ""]);
    });
  });
});
