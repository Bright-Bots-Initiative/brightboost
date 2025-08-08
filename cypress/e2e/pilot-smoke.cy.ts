
const apiBase = Cypress.env('VITE_API_BASE') as string;

const getLessonId = async () => {
  const r = await fetch(`${apiBase}/api/module/stem-1`);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`GET module stem-1 failed: ${r.status} ${text.slice(0, 500)}`);
  }
  const j = await r.json();
  return j?.units?.[0]?.lessons?.[0]?.id as string | undefined;
};

describe('Pilot smoke', () => {
  it('API: GET module stem-1 returns slug', () => {
    cy.request({
      url: `${apiBase}/api/module/stem-1`,
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status !== 200) {
        const tail = typeof resp.body === 'string' ? resp.body.slice(0, 500) : JSON.stringify(resp.body).slice(0, 500);
        throw new Error(`Expected 200 from module endpoint, got ${resp.status}. Body: ${tail}`);
      }
      expect(resp.body).to.have.property('slug', 'stem-1');
    });
  });

  it('App: /student renders', () => {
    cy.visit('/student');
    cy.contains(/student/i, { matchCase: false }).should('exist');
  });

  it('OPTIONAL: checkpoint POST (dev headers) if allowed', () => {
    const allow = Cypress.env('ALLOW_DEV_HEADERS') === '1';
    if (!allow) return;

    cy.wrap(null)
      .then(async () => await getLessonId())
      .then((lessonId) => {
        expect(lessonId, 'lessonId').to.be.a('string').and.not.be.empty;
        const studentId = (Cypress.env('STUDENT_ID') as string) || 'smoke-student';

        cy.request({
          method: 'POST',
          url: `${apiBase}/api/progress/checkpoint`,
          headers: {
            'Content-Type': 'application/json',
            'X-Role': 'student',
            'X-User-Id': studentId,
          },
          body: {
            studentId,
            moduleSlug: 'stem-1',
            lessonId,
            status: 'IN_PROGRESS',
            timeDeltaS: 10,
          },
          failOnStatusCode: false,
        }).then((resp) => {
          if (resp.status !== 200) {
            throw new Error(
              `Checkpoint POST failed with ${resp.status}. If this is expected, unset CYPRESS_ALLOW_DEV_HEADERS or set it to 0.`,
            );
          }
          expect(resp.status).to.eq(200);
        });
      });
  });
});
