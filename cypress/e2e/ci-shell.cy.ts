describe("CI shell smoke (no backend required)", () => {
  it("S-1/S-2: the SPA mounts at /", () => {
    cy.visit("/");
    // S-1: #root exists and has children (bundle parsed, React mounted)
    cy.get("#root").should("exist").children().its("length").should("be.gt", 0);
    // S-2: document booted
    cy.title().should("not.be.empty");
  });

  it("S-3: /teacher-login renders the login form", () => {
    cy.visit("/teacher-login");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
  });

  it("S-4: unknown routes render the app, not a white screen", () => {
    cy.visit("/__brightboost_no_such_route__");
    cy.get("#root").children().its("length").should("be.gt", 0);
  });

  // S-5 covered-by: Cypress fails on uncaught app exceptions by default when
  // supportFile is false; this spec must not register a suppressor (G-004).
});
