describe("Dashboard API Smoke Tests", () => {
  it("should handle teacher dashboard correctly", () => {
    cy.intercept("GET", "**/api/teacher_dashboard*").as("teacherDashboard");
    
    cy.visit("/teacher/login");
    cy.get('input[type="email"]').type("teacher@example.com");
    cy.get('input[type="password"]').type("testPassword123");
    cy.get('button[type="submit"]').click();
    
    cy.url({ timeout: 10000 }).should("include", "/teacher/dashboard");
    cy.wait("@teacherDashboard").its("response.statusCode").should("eq", 200);
    cy.contains("Welcome, Test Teacher").should("be.visible");
  });

  it("should handle student dashboard correctly", () => {
    cy.intercept("GET", "**/api/student_dashboard*").as("studentDashboard");
    
    cy.visit("/student/login");
    cy.get('input[type="email"]').type("student@example.com");
    cy.get('input[type="password"]').type("testPassword123");
    cy.get('button[type="submit"]').click();
    
    cy.url({ timeout: 10000 }).should("include", "/student/dashboard");
    cy.wait("@studentDashboard").its("response.statusCode").should("eq", 200);
    cy.contains("Loading your dashboard").should("not.exist");
  });
});
