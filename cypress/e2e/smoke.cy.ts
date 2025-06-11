describe('Dashboard UI Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display teacher dashboard correctly', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: '1',
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      }));
    });
    
    cy.visit('/teacher/dashboard');
    
    cy.url().should('include', '/teacher/dashboard');
    cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
    cy.contains('Teacher Dashboard', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="teacher-dashboard"]', { timeout: 5000 }).should('be.visible');
  });

  it('should display student dashboard correctly', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: '2',
        name: 'Test Student',
        email: 'student@test.com',
        role: 'student'
      }));
    });
    
    cy.visit('/student/dashboard');
    
    cy.url().should('include', '/student/dashboard');
    cy.contains('Bright Boost', { timeout: 10000 }).should('be.visible');
    cy.contains('Student Dashboard', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="student-dashboard"]', { timeout: 5000 }).should('be.visible');
  });
});
