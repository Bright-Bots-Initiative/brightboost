describe("Student Dashboard", () => {
  beforeEach(() => {
    const mockUser = {
      id: "test-student-id",
      name: "Test Student",
      email: "test.student@example.com",
      role: "STUDENT",
      xp: 100,
      level: "Beginner",
      streak: 5
    };
    
    const mockToken = "mock-jwt-token-student";
    
    cy.window().then((win) => {
      win.localStorage.setItem("brightboost_token", mockToken);
      win.localStorage.setItem("user", JSON.stringify(mockUser));
    });

    cy.intercept("GET", "**/api/student_dashboard*", {
      fixture: "student_dashboard.json",
    }).as("studentDashboard");
  });

  it("displays loading spinner initially and then loads dashboard content", () => {
    cy.visit("/student/dashboard");
    
    cy.get('[data-testid="loading-spinner"]').should("be.visible");

    cy.wait("@studentDashboard");

    cy.get('[data-testid="loading-spinner"]').should("not.exist");

    cy.get('[data-testid="student-dashboard-nav"]').should("be.visible");
    cy.contains("Hello,").should("be.visible");
    cy.contains("Let's learn and have fun!").should("be.visible");
  });

  it("handles API errors gracefully", () => {
    cy.intercept("GET", "**/api/student_dashboard*", {
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
    cy.intercept("GET", "**/api/student_dashboard*", {
      statusCode: 500,
      body: { error: "Server error" },
    }).as("studentDashboardError");

    cy.visit("/student/dashboard");
    cy.wait("@studentDashboardError");

    cy.get('[data-testid="dashboard-error"]').should("be.visible");

    cy.intercept("GET", "**/api/student_dashboard*", {
      fixture: "student_dashboard.json",
    }).as("studentDashboardRetry");

    cy.contains("Try Again").click();

    cy.get('[data-testid="loading-spinner"]').should("be.visible");
    
    cy.wait("@studentDashboardRetry");
    
    cy.get('[data-testid="student-dashboard-nav"]').should("be.visible");
    cy.get('[data-testid="loading-spinner"]').should("not.exist");
  });
});
