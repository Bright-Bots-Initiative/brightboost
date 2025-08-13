/// <reference types="cypress" />

const apiBase = (Cypress.env('VITE_API_BASE') || (window as any).VITE_API_BASE) as string;

describe('Pilot smoke', () => {
  it('API: GET module stem-1 returns slug', () => {
    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('status')
      .should('eq', 200)
      .then(() =>
        cy.request(`${apiBase}/api/module/stem-1`).its('body').then((body: any) => {
          const slug = body?.slug ?? body?.data?.slug;
          expect(slug).to.eq('stem-1');
        })
      );
  });

  it('App: /student renders', () => {
    return cy.visit('/student').contains(/student/i).should('exist');
  });

  it('OPTIONAL: checkpoint POST (dev headers) if allowed', () => {
    const allow = String(Cypress.env('ALLOW_DEV_HEADERS')) === '1';
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
        cy.wrap(lessonId).should('be.a', 'string').and('not.be.empty');

        return cy.request({
          method: 'POST',
          url: `${apiBase}/api/progress/checkpoint`,
          headers: {
            'x-dev-student-id': studentId,
            'x-dev-lesson-id': String(lessonId)
          },
          body: { checkpoint: 'intro', status: 'complete' },
          failOnStatusCode: false
        });
      })
      .its('status')
      .should('be.oneOf', [200, 201, 204]);
  });
});
