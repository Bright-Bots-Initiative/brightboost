/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Programmatic teacher login via POST /api/login (overview §8.2).
       * Credentials from E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD only (G-003).
       */
      loginAsTeacher(): Chainable<void>;
    }
  }
}

function requireE2ECred(
  name: "E2E_TEACHER_EMAIL" | "E2E_TEACHER_PASSWORD",
): string {
  const raw = Cypress.env(name);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    throw new Error(
      `[brightboost-e2e] Required env "${name}" is not set for loginAsTeacher.`,
    );
  }
  return String(raw).trim();
}

Cypress.Commands.add("loginAsTeacher", () => {
  const email = requireE2ECred("E2E_TEACHER_EMAIL");
  const password = requireE2ECred("E2E_TEACHER_PASSWORD");

  // Relative to Cypress baseUrl (FE) so /api is proxied to the backend — no port literals.
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { email, password },
    failOnStatusCode: false,
  }).then((resp) => {
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(
        `[brightboost-e2e] loginAsTeacher failed with status ${resp.status}`,
      );
    }
    const token = resp.body?.token as string | undefined;
    const user = resp.body?.user as Record<string, unknown> | undefined;
    if (!token || !user) {
      throw new Error(
        `[brightboost-e2e] loginAsTeacher: missing token/user in status ${resp.status}`,
      );
    }
    cy.window().then((win) => {
      win.localStorage.setItem("bb_access_token", token);
      win.localStorage.setItem("user", JSON.stringify(user));
    });
  });
});

export {};
