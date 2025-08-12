/// <reference types="cypress" />



const swaUrl = Cypress.env('CYPRESS_SWA_URL') as string | undefined;
const apiBase = Cypress.env('VITE_API_BASE') as string | undefined;

describe('Staging smoke', () => {
  it('UI shell: /student renders basic content', () => {
    if (!swaUrl) {
      return cy.wrap({}).log('CYPRESS_SWA_URL not set; skipping UI shell check in build-only CI');
    }
    return cy
      .visit('/student', { timeout: 30000 })
      .get('[data-cy=app-root]', { timeout: 30000 })
      .should('exist');
  });

  it('API: GET module stem-1 returns slug', () => {
    if (!apiBase) {
      return cy.wrap({}).log('VITE_API_BASE not set; skipping API health check in build-only CI');
    }
    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('status')
      .should('eq', 200)
      .then(() => cy.request(`${apiBase}/api/module/stem-1`).its('body.slug').should('eq', 'stem-1'));
  });

  it('OPTIONAL: checkpoint POST (dev headers) if allowed', () => {
    if (!apiBase) {
      return cy.wrap({}).log('VITE_API_BASE not set; skipping checkpoint POST');
    }
    const allow = Cypress.env('ALLOW_DEV_HEADERS') === 1 || Cypress.env('ALLOW_DEV_HEADERS') === '1';
    if (!allow) {
      return cy.wrap({}).log('Dev headers disabled; skipping checkpoint POST');
    }

    const studentId = (Cypress.env('STUDENT_ID') as string) || 'smoke-student';

    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its('body')
      .then((body: any) => {
        const lessonId = body?.units?.[0]?.lessons?.[0]?.id as string;
        return cy
          .wrap(lessonId)
          .should('be.a', 'string')
          .and('not.be.empty')
          .then(() =>
            cy.request({
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
            })
          );
      })
      .its('status')
      .should('eq', 200);
  });
});
