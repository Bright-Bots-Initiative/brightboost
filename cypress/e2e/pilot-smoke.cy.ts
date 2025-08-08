
describe('Pilot Smoke (staging)', () => {
  const apiBase = Cypress.env('API_BASE');
  it('module endpoint returns 200 and slug stem-1', () => {
    expect(apiBase, 'CYPRESS_API_BASE env').to.be.a('string').and.not.be.empty;
    cy.request(`${apiBase}/api/module/stem-1`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('slug', 'stem-1');
    });
  });

  it('progress endpoint returns 200 JSON', () => {
    const student = Cypress.env('STUDENT_ID') || 'demo-student-1';
    cy.request(`${apiBase}/api/progress/${student}?module=stem-1`).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('moduleSlug', 'stem-1');
    });
  });

  it('can post a checkpoint', () => {
    const student = Cypress.env('STUDENT_ID') || 'demo-student-1';
    const lessonId = Cypress.env('LESSON_ID'); // provide via secret; otherwise skip
    if (!lessonId) {
      cy.log('No LESSON_ID provided; skipping checkpoint post');
      return;
    }
    cy.request('POST', `${apiBase}/api/progress/checkpoint`, {
      studentId: student,
      moduleSlug: 'stem-1',
      lessonId,
      status: 'COMPLETED',
      timeDeltaS: 0,
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});
