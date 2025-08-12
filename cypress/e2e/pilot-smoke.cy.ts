/// <reference types="cypress" />


const apiBase = (Cypress.env('VITE_API_BASE') || (window as any).VITE_API_BASE) as string;

describe('Pilot smoke', () => {
  it('API: GET module stem-1 returns slug', () => {
    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('status')
      .should('eq', 200)
      .then(() =>
        cy.request(`${apiBase}/api/module/stem-1`).its('body.slug').should('eq', 'stem-1')
      );
  });

  it('App: /student renders', () => {
    return cy.visit('/student').contains(/student/i, { matchCase: false }).should('exist');
  });

  it('OPTIONAL: checkpoint POST (dev headers) if allowed', () => {
    const allow =
      Cypress.env('ALLOW_DEV_HEADERS') === 1 || Cypress.env('ALLOW_DEV_HEADERS') === '1';
    if (!allow) {
      cy.log('Dev headers disabled; skipping checkpoint POST');
      return;
    }

    const studentId = (Cypress.env('STUDENT_ID') as string) || 'smoke-student';

    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('body')
      .then((body: any) => {
        const lessonId = body?.units?.[0]?.lessons?.[0]?.id as string;
        expect(lessonId, 'lessonId').to.be.a('string').and.not.be.empty;

        return cy.request({
          method: 'POST',
          url: `${apiBase}/api/progress/checkpoint`,
          headers: {
            'Content-Type': 'application/json',
            'X-Role': 'student',
            'X-User-Id': studentId
          },
          body: {
            studentId,
            moduleSlug: 'stem-1',
            lessonId,
            status: 'IN_PROGRESS',
            timeDeltaS: 10
          }
        });
      })
      .its('status')
      .should('eq', 200);
  });
});
