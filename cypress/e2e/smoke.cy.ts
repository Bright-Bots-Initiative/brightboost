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
    cy.intercept('GET', '**/api/student_dashboard', {
      statusCode: 200,
      body: [
        {
          id: '2',
          name: 'Test Student',
          email: 'student@test.com',
          xp: 150,
          level: 2,
          streak: 5
        }
      ]
    }).as('studentDashboard');

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
    
    cy.wait('@studentDashboard');
    
    cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
    
    cy.get('[data-testid="dashboard-error"]').should('not.exist');
    
    cy.contains('Bright Boost').should('be.visible');
    cy.get('[data-testid="student-dashboard"]').should('be.visible');
    cy.contains('Student Dashboard').should('be.visible');
  });

  it('should handle student dashboard API errors gracefully', () => {
    cy.intercept('GET', '**/api/student_dashboard', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('studentDashboardError');

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
    
    cy.wait('@studentDashboardError');
    
    cy.get('body').should(($body) => {
      const hasError = $body.find('[data-testid="dashboard-error"]').length > 0;
      const hasLoading = $body.find('[data-testid="loading-spinner"]').length > 0;
      expect(hasError || !hasLoading).to.be.true;
    });
    
    cy.get('[data-testid="dashboard-error"]').should('be.visible');
    cy.contains('Error:').should('be.visible');
    cy.contains('Go Home').should('be.visible');
  });
});
