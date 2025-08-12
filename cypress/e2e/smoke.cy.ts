/// <reference types="cypress" />

const apiBase = (Cypress.env('VITE_API_BASE') || (window as any).VITE_API_BASE) as string;

describe('Staging smoke', () => {
  it('UI shell: /student renders basic content', () => {
    return cy
      .visit('/student', { timeout: 30000 })
      .contains(/student/i, { matchCase: false, timeout: 20000 })
      .should('exist');
  });

  it('API: GET module stem-1 returns slug', () => {
    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('status')
      .should('eq', 200)
      .then(() =>
        cy.request(`${apiBase}/api/module/stem-1`).its('body.slug').should('eq', 'stem-1')
      );
  });

  it('OPTIONAL: checkpoint POST (dev headers) if allowed', () => {
    const allow =
      Cypress.env('ALLOW_DEV_HEADERS') === 1 || Cypress.env('ALLOW_DEV_HEADERS') === '1';
    if (!allow) {
      cy.log('Dev headers disabled; skipping checkpoint POST');
      return cy.wrap(null);
    }

    const studentId = (Cypress.env('STUDENT_ID') as string) || 'smoke-student';

    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('body')
      .then((body: any) => {
        const lessonId = body?.units?.[0]?.lessons?.[0]?.id as string;
        return cy.wrap(lessonId).should('be.a', 'string').and('not.be.empty').then(() => {
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
        });
      })
      .its('status')
      .should('eq', 200);
  });
});
