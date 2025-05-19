describe('LessonTable Component', () => {
  beforeEach(() => {
    cy.visit('/teacher-dashboard');
    
    cy.contains('Lessons').click();
  });

  it('displays the lesson table with correct columns', () => {
    cy.contains('th', 'Title').should('be.visible');
    cy.contains('th', 'Category').should('be.visible');
    cy.contains('th', 'Date').should('be.visible');
    cy.contains('th', 'Status').should('be.visible');
    
    cy.screenshot('lesson-table-full');
  });

  it('shows status badges with correct styling', () => {
    cy.contains('Published')
      .should('have.class', 'bg-green-100')
      .should('have.class', 'text-green-800');
    
    cy.contains('Draft')
      .should('have.class', 'bg-yellow-100')
      .should('have.class', 'text-yellow-800');
    
    cy.screenshot('lesson-table-status-badges');
  });

  it('can drag and drop rows to reorder lessons', () => {
    cy.get('tbody tr').first().as('firstRow');
    
    cy.get('tbody tr').eq(1).as('secondRow');
    
    cy.get('@firstRow').find('[title="Drag to reorder"]').trigger('mousedown', { button: 0 });
    cy.get('@secondRow').trigger('mousemove');
    cy.get('@secondRow').trigger('mouseup', { force: true });
    
    cy.screenshot('lesson-table-after-reorder');
  });
});
