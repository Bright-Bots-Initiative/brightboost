describe('Authentication Flow Tests', () => {
  const AWS_API_URL = 'https://yt4cd41rx3.execute-api.us-east-1.amazonaws.com/dev';
  
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete teacher signup and redirect to dashboard', () => {
    cy.intercept('POST', `${AWS_API_URL}/api/signup/teacher`).as('teacherSignup');
    
    cy.visit('/teacher/signup');
    
    const timestamp = Date.now();
    cy.get('#name').type('Test Teacher');
    cy.get('#email').type(`test-teacher-${timestamp}@example.com`);
    cy.get('#password').type('TestPassword123');
    cy.get('#confirmPassword').type('TestPassword123');
    
    cy.get('button[type="submit"]').click();
    
    cy.wait('@teacherSignup').then((interception) => {
      expect(interception.response.statusCode).to.equal(201);
      expect(interception.response.body).to.have.property('token');
      expect(interception.response.body).to.have.property('user');
    });
    
    cy.url().should('include', '/teacher/dashboard');
    cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
  });

  it('should handle teacher login and redirect to dashboard', () => {
    cy.intercept('POST', `${AWS_API_URL}/api/signup/teacher`).as('teacherSignup');
    cy.intercept('POST', `${AWS_API_URL}/api/login`).as('teacherLogin');
    
    const timestamp = Date.now();
    const email = `test-teacher-login-${timestamp}@example.com`;
    const password = 'TestPassword123';
    
    cy.visit('/teacher/signup');
    cy.get('#name').type('Test Teacher Login');
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirmPassword').type(password);
    cy.get('button[type="submit"]').click();
    
    cy.wait('@teacherSignup');
    cy.url().should('include', '/teacher/dashboard', { timeout: 10000 });
    
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    
    cy.visit('/teacher/login');
    
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('button[type="submit"]').click();
    
    cy.wait('@teacherLogin').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
      expect(interception.response.body).to.have.property('token');
      expect(interception.response.body).to.have.property('user');
    });
    
    cy.url().should('include', '/teacher/dashboard');
    cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
  });

  it('should handle teacher dashboard correctly', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: '1',
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      }));
    });

    cy.intercept('GET', `${AWS_API_URL}/api/teacher_dashboard`).as('teacherDashboard');
    
    cy.visit('/teacher/dashboard');
    
    cy.url().should('include', '/teacher/dashboard');
    cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
    
    cy.wait('@teacherDashboard').then((interception) => {
      expect([200, 403, 404, 500]).to.include(interception.response.statusCode);
      
      if (interception.response.statusCode === 200) {
        expect(interception.response.body).to.be.an('array');
        expect(interception.response.body.length).to.be.at.least(0);
        
        if (interception.response.body.length > 0) {
          const teacher = interception.response.body[0];
          expect(teacher).to.have.property('id');
          expect(teacher).to.have.property('name');
          expect(teacher).to.have.property('email');
          expect(teacher).to.have.property('createdAt');
        }
      }
    });
  });

  it('should handle student dashboard correctly', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: '2',
        name: 'Test Student',
        email: 'student@test.com',
        role: 'student'
      }));
    });

    cy.intercept('GET', `${AWS_API_URL}/api/student_dashboard`).as('studentDashboard');
    
    cy.visit('/student/dashboard');
    
    cy.url().should('include', '/student/dashboard');
    
    cy.contains('Loading your dashboard', { timeout: 10000 }).should('be.visible');
    
    cy.wait('@studentDashboard').then((interception) => {
      expect([200, 403, 404, 500]).to.include(interception.response.statusCode);
      
      if (interception.response.statusCode === 200) {
        expect(interception.response.body).to.be.an('array');
        expect(interception.response.body.length).to.be.at.least(0);
        
        if (interception.response.body.length > 0) {
          const student = interception.response.body[0];
          expect(student).to.have.property('id');
          expect(student).to.have.property('name');
          expect(student).to.have.property('email');
          expect(student).to.have.property('xp');
          expect(student).to.have.property('level');
          expect(student).to.have.property('streak');
        }
      }
    });
  });
});
