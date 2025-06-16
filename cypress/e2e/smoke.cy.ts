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

  it('allows new students to create accounts', () => {
    cy.intercept('POST', '**/api/signup/student').as('studentSignup');
    
    cy.visit('/student/signup');
    cy.get('[data-testid="name-input"]').type('Test Student');
    cy.get('[data-testid="email-input"]').type('cypress_test@brightboost.io');
    cy.get('[data-testid="password-input"]').type('Pa$$w0rd!');
    cy.get('[data-testid="signup-button"]').click();
    
    cy.wait('@studentSignup').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(201);
        expect(interception.response.body).to.have.property('token');
        expect(interception.response.body.user).to.have.property('role', 'STUDENT');
      }
    });
    
    cy.url().should('include', '/student');
  });

  it('prevents duplicate student email registration', () => {
    cy.intercept('POST', '**/api/signup/student').as('duplicateSignup');
    
    cy.visit('/student/signup');
    cy.get('[data-testid="email-input"]').type('cypress_test@brightboost.io');
    cy.get('[data-testid="password-input"]').type('Pa$$w0rd!');
    cy.get('[data-testid="signup-button"]').click();
    
    cy.wait('@duplicateSignup').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(409);
      }
    });
  });

  it('rejects login with wrong password', () => {
    cy.intercept('POST', '**/api/login').as('badLogin');
    
    cy.visit('/student/login');
    cy.get('[data-testid="email-input"]').type('cypress_test@brightboost.io');
    cy.get('[data-testid="password-input"]').type('WrongPassword!');
    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@badLogin').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(401);
      }
    });
  });
});
