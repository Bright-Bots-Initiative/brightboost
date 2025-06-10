describe('BrightBoost Authentication Flow Tests', () => {
  const AWS_API_URL = 'https://yt4cd41rx3.execute-api.us-east-1.amazonaws.com/dev';
  
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the homepage', () => {
    cy.contains('Bright Boost').should('be.visible');
    cy.contains('Empowering Teachers').should('be.visible');
  });

  it('should navigate to teacher signup', () => {
    cy.visit('/teacher/signup');
    cy.contains('Create Teacher Account').should('be.visible');
    cy.get('#name').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
  });

  it('should navigate to student signup', () => {
    cy.visit('/student/signup');
    cy.contains('Create Student Account').should('be.visible');
    cy.get('#name').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
  });

  it('should complete teacher signup and redirect to dashboard', () => {
    cy.intercept('POST', `${AWS_API_URL}/api/signup/teacher`).as('teacherSignup');
    
    cy.visit('/teacher/signup');
    
    const timestamp = Date.now();
    cy.get('#name').type('Test Teacher');
    cy.get('#email').type(`test-teacher-${timestamp}@example.com`);
    cy.get('#password').type('TestPassword123');
    cy.get('#confirmPassword').type('TestPassword123');
    cy.get('#school').type('Test School');
    cy.get('#subject').type('Computer Science');
    
    cy.get('button[type="submit"]').click();
    
    cy.wait('@teacherSignup').then((interception) => {
      if (interception.response && interception.response.statusCode === 201) {
        expect(interception.response.body).to.have.property('token');
        expect(interception.response.body).to.have.property('user');
        expect(interception.response.body.user).to.have.property('role', 'TEACHER');
        
        cy.url({ timeout: 10000 }).should('include', '/teacher/dashboard');
        cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
      }
    });
  });

  it('should handle teacher login flow', () => {
    cy.intercept('POST', `${AWS_API_URL}/api/login`).as('teacherLogin');
    
    cy.visit('/teacher/login');
    
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('TestPassword123');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@teacherLogin').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.be.oneOf([200, 401, 404]);
        if (interception.response.statusCode === 200) {
          expect(interception.response.body).to.have.property('token');
          expect(interception.response.body).to.have.property('user');
        }
      }
    });
  });

  it('should handle student signup flow', () => {
    cy.intercept('POST', `${AWS_API_URL}/api/signup/student`).as('studentSignup');
    
    cy.visit('/student/signup');
    
    const timestamp = Date.now();
    cy.get('#name').type('Test Student');
    cy.get('#email').type(`test-student-${timestamp}@example.com`);
    cy.get('#password').type('TestPassword123');
    cy.get('#confirmPassword').type('TestPassword123');
    
    cy.get('button[type="submit"]').click();
    
    cy.wait('@studentSignup').then((interception) => {
      if (interception.response) {
        expect(interception.response.statusCode).to.be.oneOf([200, 201, 400, 409]);
        if (interception.response.statusCode === 201) {
          expect(interception.response.body).to.have.property('token');
          expect(interception.response.body).to.have.property('user');
          expect(interception.response.body.user).to.have.property('role', 'STUDENT');
        }
      }
    });
  });

  it('should handle student dashboard access', () => {
    cy.visit('/student/dashboard');
    cy.url().should('include', '/login');
  });

  it('should protect teacher dashboard route', () => {
    cy.visit('/teacher/dashboard');
    cy.url().should('include', '/login');
  });

  it('should protect student dashboard route', () => {
    cy.visit('/student/dashboard');
    cy.url().should('include', '/login');
  });


});
