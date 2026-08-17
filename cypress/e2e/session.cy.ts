describe("P-11 session survives reload; logout ends it", () => {
  it("keeps the session across reload, then clears it on logout", () => {
    cy.loginAsTeacher();
    cy.window().then((win) => {
      win.localStorage.setItem("bb_teacher_tutorial_done", "true");
    });
    cy.visit("/teacher/dashboard");

    cy.url().should("include", "/teacher/dashboard");
    cy.get('button[aria-label^="User menu for"]').should("be.visible");
    cy.window().then((win) => {
      expect(
        win.localStorage.getItem("bb_access_token"),
        "token after login",
      ).to.be.a("string").and.not.be.empty;
    });

    cy.reload();
    // Persist tutorial dismiss across reload so the overlay does not cover the menu.
    cy.window().then((win) => {
      win.localStorage.setItem("bb_teacher_tutorial_done", "true");
    });
    cy.url().should("include", "/teacher/dashboard");
    cy.get('button[aria-label^="User menu for"]').should("be.visible");
    cy.window().then((win) => {
      expect(
        win.localStorage.getItem("bb_access_token"),
        "token after reload",
      ).to.be.a("string").and.not.be.empty;
    });

    cy.get('button[aria-label^="User menu for"]').click();
    cy.get('[role="menuitem"]').contains("Logout").click();

    cy.location("pathname").should("eq", "/");
    cy.window().then((win) => {
      expect(
        win.localStorage.getItem("bb_access_token"),
        "token cleared after logout",
      ).to.be.oneOf([null, ""]);
      expect(
        win.localStorage.getItem("user"),
        "user cleared after logout",
      ).to.be.oneOf([null, ""]);
    });

    cy.visit("/teacher/dashboard");
    cy.url().should("include", "/student-login");
  });
});
