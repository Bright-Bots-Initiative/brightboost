

describe('Student Dashboard Smoke Test', () => {
  beforeEach(() => {
    cy.visit('/student/login');
    cy.get('input[type="email"]').type('student@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/student/dashboard');
  });

  it('loads dashboard content successfully', () => {
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
  });
});
