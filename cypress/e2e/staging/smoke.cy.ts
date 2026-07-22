import { requireEnv } from "../../support/requireEnv";

describe("Staging smoke", () => {
  it("UI shell: /student renders basic content", () => {
    const swaUrl = requireEnv("CYPRESS_SWA_URL", (n) => Cypress.env(n));
    return cy
      .visit("/student", { timeout: 30000 })
      .get("#root", { timeout: 30000 })
      .children()
      .its("length")
      .should("be.gt", 0);
  });

  it("API: GET module stem-1 returns slug", () => {
    const apiBase = requireEnv("VITE_API_BASE", (n) => Cypress.env(n));
    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its("status")
      .should("eq", 200)
      .then(() =>
        cy
          .request(`${apiBase}/api/module/stem-1`)
          .its("body.slug")
          .should("eq", "stem-1"),
      );
  });

  it("OPTIONAL: checkpoint POST (dev headers) if allowed", function () {
    const apiBase = requireEnv("VITE_API_BASE", (n) => Cypress.env(n));
    const allow =
      Cypress.env("ALLOW_DEV_HEADERS") === 1 ||
      Cypress.env("ALLOW_DEV_HEADERS") === "1";
    if (!allow) {
      this.skip();
    }

    const studentId = (Cypress.env("STUDENT_ID") as string) || "smoke-student";

    return cy
      .request(`${apiBase}/api/module/stem-1`)
      .its("body")
      .then((body: any) => {
        const lessonIdEnv =
          (Cypress.env("LESSON_ID") as string) ||
          (Cypress.env("CYPRESS_LESSON_ID") as string);
        const lessonId = lessonIdEnv || body?.units?.[0]?.lessons?.[0]?.id;
        if (!lessonId) {
          cy.log("No lessonId available; skipping checkpoint POST");
          return;
        }
        return cy.request({
          method: "POST",
          url: `${apiBase}/api/progress/checkpoint`,
          headers: {
            "Content-Type": "application/json",
            "X-Role": "student",
            "X-User-Id": studentId,
          },
          body: {
            studentId,
            moduleSlug: "stem-1",
            lessonId,
            status: "IN_PROGRESS",
            timeDeltaS: 10,
          },
        });
      })
      .its("status")
      .should("eq", 200);
  });
});
