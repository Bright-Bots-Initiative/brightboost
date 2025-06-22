describe("Student Dashboard", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/student/dashboard*", {
      fixture: "student_dashboard.json",
    }).as("studentDashboard");

    cy.visit("/student/dashboard");
  });

  it("displays loading spinner initially and then loads dashboard content", () => {
    cy.get('[data-testid="loading-spinner"]').should("be.visible");

    cy.wait("@studentDashboard");

    cy.get('[data-testid="loading-spinner"]').should("not.exist");

    cy.get('[data-testid="student-dashboard-nav"]').should("be.visible");
    cy.contains("Hello,").should("be.visible");
    cy.contains("Let's learn and have fun!").should("be.visible");
  });

  it("handles API errors gracefully", () => {
    cy.intercept("GET", "**/api/student/dashboard*", {
      statusCode: 500,
      body: { error: "Server error" },
    }).as("studentDashboardError");

    cy.visit("/student/dashboard");

    cy.wait("@studentDashboardError");

    cy.get('[data-testid="dashboard-error"]').should("be.visible");
    cy.contains("Oops!").should("be.visible");
    cy.contains("Try Again").should("be.visible");

    cy.get('[data-testid="loading-spinner"]').should("not.exist");

    cy.get('[data-testid="student-dashboard-nav"]').should("not.exist");
  });

  it("allows retry after error", () => {
    cy.intercept("GET", "**/api/student/dashboard*", {
      statusCode: 500,
      body: { error: "Server error" },
    }).as("studentDashboardError");

    cy.visit("/student/dashboard");
    cy.wait("@studentDashboardError");

    cy.get('[data-testid="dashboard-error"]').should("be.visible");

    cy.intercept("GET", "**/api/student/dashboard*", {
      fixture: "student_dashboard.json",
    }).as("studentDashboardRetry");

    cy.contains("Try Again").click();

    cy.get('[data-testid="loading-spinner"]').should("be.visible");
    cy.wait("@studentDashboardRetry");
    cy.get('[data-testid="student-dashboard-nav"]').should("be.visible");
  });
});
