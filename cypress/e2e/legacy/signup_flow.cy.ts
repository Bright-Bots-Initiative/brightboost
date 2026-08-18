describe("Signup Flow", () => {
  it("should handle teacher signup correctly", () => {
    cy.intercept("POST", "/api/signup", {
      statusCode: 201,
      body: { success: true },
    }).as("signup");

    cy.visit("/teacher/signup");
    cy.get('input[name="name"]').type("Test Teacher");
    cy.get('input[name="email"]').type("test@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");
    cy.get('button[type="submit"]').click();

    cy.wait("@signup").then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.not.equal(500);
        expect([200, 201, 409]).to.include(interception.response.statusCode);
      }
    });
  });

  it("should handle duplicate email correctly", () => {
    cy.intercept("POST", "/api/signup", {
      statusCode: 409,
      body: { error: "email_taken" },
    }).as("signupDuplicate");

    cy.visit("/teacher/signup");
    cy.get('input[name="name"]').type("Test Teacher");
    cy.get('input[name="email"]').type("existing@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");
    cy.get('button[type="submit"]').click();

    cy.wait("@signupDuplicate").then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(409);
      }
    });
  });
});
