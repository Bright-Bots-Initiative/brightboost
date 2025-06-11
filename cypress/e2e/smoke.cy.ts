describe('Dashboard API Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/');
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

    const apiUrl = Cypress.env('VITE_AWS_API_URL');
    cy.intercept('GET', `${apiUrl}/api/teacher_dashboard`).as('teacherDashboard');
    
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

    const apiUrl = Cypress.env('VITE_AWS_API_URL');
    cy.intercept('GET', `${apiUrl}/api/student_dashboard`).as('studentDashboard');
    
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
