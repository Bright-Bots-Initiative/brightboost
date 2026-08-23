/**
 * E2-04 — P-10 teacher sees student completion via class-detail assignment completedCount.
 * Setup uses real APIs from the seed (not a cross-spec dependency on E3-04).
 *
 * RED evidence (2026-07-31): asserting "0/3" after setup failed with
 * `Timed out retrying after 10000ms: Expected to find content: '0/3' but never did.`
 */

function parseSeedIds(stdout: string, stderr: string) {
  const text = `${stdout}\n${stderr}`;
  const pick = (key: string): string => {
    const m = text.match(new RegExp(`${key}=(\\S+)`));
    if (!m) {
      throw new Error(`[P-10] e2e seed output missing ${key}`);
    }
    return m[1];
  };
  return {
    courseId: pick("courseId"),
    activityId: pick("activityId"),
    lessonId: pick("lessonId"),
    studentId: pick("CYPRESS_STUDENT_ID"),
  };
}

describe("P-10 teacher sees the student's completion", () => {
  it("shows assignment completedCount 1/3 on class detail", () => {
    cy.exec("npm run e2e:reset", { failOnNonZeroExit: true }).then((result) => {
      const ids = parseSeedIds(result.stdout, result.stderr);
      const email = Cypress.env("E2E_TEACHER_EMAIL") as string;
      const password = Cypress.env("E2E_TEACHER_PASSWORD") as string;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      cy.request({
        method: "POST",
        url: "/api/login",
        body: { email, password },
      }).then((teacherLogin) => {
        expect(teacherLogin.status, "teacher login").to.eq(200);
        const teacherHeaders = {
          Authorization: `Bearer ${teacherLogin.body.token as string}`,
        };

        cy.request({
          method: "POST",
          url: `/api/teacher/courses/${ids.courseId}/assignments`,
          headers: teacherHeaders,
          body: {
            title: "E2E Progress Session",
            activityId: ids.activityId,
            dueDate,
          },
        })
          .then((created) => {
            expect(created.status, "create assignment").to.be.oneOf([200, 201]);
          })
          .then(() =>
            cy.request({
              method: "POST",
              url: "/api/auth/class-login",
              body: {
                courseId: ids.courseId,
                studentId: ids.studentId,
              },
            }),
          )
          .then((studentLogin) => {
            expect(studentLogin.status, "class-login").to.eq(200);
            return cy.request({
              method: "POST",
              url: "/api/progress/complete-activity",
              headers: {
                Authorization: `Bearer ${studentLogin.body.token as string}`,
              },
              body: {
                moduleSlug: "e2e-quiz-module",
                lessonId: ids.lessonId,
                activityId: ids.activityId,
                timeSpentS: 12,
              },
            });
          })
          .then((complete) => {
            expect(complete.status, "complete-activity").to.eq(200);
            return cy.request({
              method: "GET",
              url: `/api/teacher/courses/${ids.courseId}/assignments`,
              headers: teacherHeaders,
            });
          })
          .then((list) => {
            expect(list.status, "list assignments").to.eq(200);
            expect(list.body, "assignment list")
              .to.be.an("array")
              .and.have.length(1);
            expect(list.body[0].completedCount, "API completedCount").to.eq(1);
            expect(list.body[0].enrolledCount, "API enrolledCount").to.eq(3);

            cy.loginAsTeacher();
            cy.visit(`/teacher/classes/${ids.courseId}`);
            cy.contains("E2E Progress Session").should("be.visible");
            cy.contains("1/3").should("be.visible");
          });
      });
    });
  });
});
