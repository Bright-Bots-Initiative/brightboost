
describe('Azure SWA Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete full authentication flow', () => {
    cy.request({
      url: '/api/teacher_dashboard',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Unauthorized');
    });

    cy.visit('/login-test');
    
    cy.contains('Sign In with GitHub').click();
    
    cy.url().should('not.include', '/.auth/login');
    
    cy.request('/.auth/me').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.clientPrincipal).to.not.be.null;
      expect(response.body.clientPrincipal.userRoles).to.include('authenticated');
    });
    
    cy.request('/api/teacher_dashboard').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
    
    cy.contains('Sign Out').click();
    
    cy.request('/.auth/me').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.clientPrincipal).to.be.null;
    });
    
    cy.request({
      url: '/api/teacher_dashboard',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.equal(401);
    });
  });
});
