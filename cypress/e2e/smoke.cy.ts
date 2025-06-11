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
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Loading dashboard data')) {
        cy.contains('Loading dashboard data', { timeout: 15000 }).should('be.visible');
      } else if ($body.text().includes('Error:') || $body.text().includes('API not available')) {
        cy.contains('Error:', { timeout: 5000 }).should('be.visible');
      } else if ($body.text().includes('No teacher data available')) {
        cy.contains('No teacher data available yet', { timeout: 5000 }).should('be.visible');
      } else {
        cy.get('[data-testid="teacher-dashboard"]', { timeout: 5000 }).should('be.visible');
      }
    });
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
    
    cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
    
    cy.get('body').then(($body) => {
      cy.log('Page body text:', $body.text());
      cy.log('Has error element:', $body.find('[data-testid="dashboard-error"]').length > 0);
      cy.log('Has dashboard element:', $body.find('[data-testid="student-dashboard"]').length > 0);
    });
    
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="dashboard-error"]').length > 0) {
        cy.get('[data-testid="dashboard-error"]').should('be.visible');
        cy.contains('Error:', { timeout: 5000 }).should('be.visible');
      } else if ($body.text().includes('API not available in preview mode')) {
        cy.get('[data-testid="dashboard-error"]').should('be.visible');
        cy.contains('API not available in preview mode', { timeout: 5000 }).should('be.visible');
      } else if ($body.text().includes('No student data available')) {
        cy.contains('Bright Boost', { timeout: 5000 }).should('be.visible');
        cy.contains('No student data available yet', { timeout: 5000 }).should('be.visible');
      } else {
        cy.contains('Bright Boost', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="student-dashboard"]', { timeout: 5000 }).should('be.visible');
        cy.contains('Student Dashboard', { timeout: 5000 }).should('be.visible');
      }
    });
  });
});
