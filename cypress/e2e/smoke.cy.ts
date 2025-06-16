describe("Dashboard API Smoke Tests", () => {
  it("should handle teacher dashboard correctly", () => {
    cy.intercept("GET", "**/prod/api/teacher_dashboard*").as(
      "teacherDashboard",
    );

    cy.visit("/teacher/login");
    cy.get('input[type="email"]').type("teacher@example.com");
    cy.get('input[type="password"]').type("testPassword123");
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 10000 }).should("include", "/teacher/dashboard");

    cy.window()
      .its("localStorage")
      .invoke("getItem", "brightboost_token")
      .should("exist");

    cy.contains("Welcome, Test Teacher").should("be.visible");
    cy.contains("Teacher Admin").should("be.visible");

    cy.wait("@teacherDashboard", { timeout: 10000 }).then((interception) => {
      expect(interception.request.url).to.include("/api/teacher_dashboard");
    });
  });

  it("should handle student dashboard correctly", () => {
    cy.intercept("GET", "**/prod/api/student_dashboard*").as(
      "studentDashboard",
    );

    cy.visit("/student/login");
    cy.get('input[type="email"]').type("student@example.com");
    cy.get('input[type="password"]').type("testPassword123");
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 10000 }).should("include", "/student/dashboard");

    cy.window()
      .its("localStorage")
      .invoke("getItem", "brightboost_token")
      .should("exist");

    cy.contains("Loading your dashboard...").should("be.visible");

    cy.wait("@studentDashboard", { timeout: 10000 }).then((interception) => {
      expect(interception.request.url).to.include("/api/student_dashboard");
    });
  });


});
