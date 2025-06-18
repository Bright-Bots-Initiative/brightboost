describe("Dashboard API Smoke Tests", () => {
  it("should handle teacher dashboard correctly", () => {
    cy.intercept("GET", "**/api/teacher_dashboard*").as(
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
    cy.intercept("GET", "**/api/student/dashboard*").as(
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

    cy.get('.animate-spin').should('be.visible');
    
    cy.contains('Hello,', { timeout: 10000 }).should('be.visible');
    cy.contains('STEM 1').should('be.visible');
    cy.contains('Letter Game').should('be.visible');
    cy.contains('Leaderboard').should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Your Courses & Assignments')) {
        cy.contains('Your Courses & Assignments').should('be.visible');
        cy.contains('Enrolled Courses').should('be.visible');
        cy.contains('Recent Assignments').should('be.visible');
      } else {
        cy.contains("Let's start your first quest!", { timeout: 5000 }).should('be.visible');
      }
    });

    cy.wait("@studentDashboard", { timeout: 10000 }).then((interception) => {
      expect(interception.request.url).to.include("/api/student/dashboard");
    });
  });

  it('allows new students to create accounts', () => {
    cy.intercept('POST', '**/api/signup/student').as('studentSignup');
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const uniqueEmail = `cypress_test_${timestamp}_${randomId}@brightboost.io`;
    
    cy.visit('/student/signup');
    cy.get('#name').type('Test Student');
    cy.get('#email').type(uniqueEmail);
    cy.get('#password').type('Pa$$w0rd!');
    cy.get('#confirmPassword').type('Pa$$w0rd!');
    cy.get('button[type="submit"]').click();
    
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
    cy.get('#name').type('Duplicate Test');
    cy.get('#email').type('cypress_test@brightboost.io');
    cy.get('#password').type('Pa$$w0rd!');
    cy.get('#confirmPassword').type('Pa$$w0rd!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@duplicateSignup').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(409);
      }
    });
  });

  it('rejects login with wrong password', () => {
    cy.intercept('POST', '**/api/login').as('badLogin');
    
    cy.visit('/student/login');
    cy.get('#email').type('cypress_test@brightboost.io');
    cy.get('#password').type('WrongPassword!');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@badLogin').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.equal(401);
      }
    });
  });
});
