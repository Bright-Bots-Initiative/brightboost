describe('Dashboard API Smoke Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should successfully call teacher dashboard API', () => {
    cy.intercept('GET', '/api/teacher_dashboard').as('teacherDashboard');
    
    cy.visit('/teacher/dashboard');
    
    cy.wait('@teacherDashboard').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
      expect(interception.response.body).to.be.an('array');
      expect(interception.response.body.length).to.be.at.least(0);
      
      if (interception.response.body.length > 0) {
        const teacher = interception.response.body[0];
        expect(teacher).to.have.property('id');
        expect(teacher).to.have.property('name');
        expect(teacher).to.have.property('email');
        expect(teacher).to.have.property('createdAt');
      }
    });
  });

  it('should successfully call student dashboard API', () => {
    cy.intercept('GET', '/api/student_dashboard').as('studentDashboard');
    
    cy.visit('/student/dashboard');
    
    cy.wait('@studentDashboard').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
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
    });
  });
});
