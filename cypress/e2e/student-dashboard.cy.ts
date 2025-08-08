describe("Student Dashboard", () => {
  beforeEach(() => {
    cy.visit("/student/login");
    cy.get('input[type="email"]').type("student@example.com");
    cy.get('input[type="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    cy.url().should("include", "/student/dashboard");
  });

  it("loads dashboard content successfully", () => {
    cy.get(".animate-spin", { timeout: 1000 }).should("be.visible");

    cy.contains("Hello,", { timeout: 10000 }).should("be.visible");
    cy.contains("STEM 1").should("be.visible");
    cy.contains("Letter Game").should("be.visible");
    cy.contains("Leaderboard").should("be.visible");

    cy.contains("Your Courses & Assignments").should("be.visible");
    cy.contains("Enrolled Courses").should("be.visible");
    cy.contains("Recent Assignments").should("be.visible");

    cy.get('[data-cy="course-item"]').should("have.length.at.least", 1);
    cy.get('[data-cy="assignment-item"]').should("have.length.at.least", 1);
  });

  it("handles loading and error states", () => {
    cy.reload();

    cy.contains("Error:", { timeout: 10000 }).should("be.visible");
    cy.contains("Try Again").should("be.visible").click();
  });

  it("displays empty state when no data available", () => {
    cy.reload();

    cy.contains("Let's start your first quest!", { timeout: 10000 }).should(
      "be.visible",
    );
  });
});
