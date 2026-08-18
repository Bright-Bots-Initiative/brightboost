/// <reference types="cypress" />

import { assertLoginSuccess, requireE2ECred } from "./loginAsTeacher";

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

Cypress.Commands.add("loginAsTeacher", () => {
  const email = requireE2ECred("E2E_TEACHER_EMAIL", (n) => Cypress.env(n));
  const password = requireE2ECred("E2E_TEACHER_PASSWORD", (n) =>
    Cypress.env(n),
  );

  // Relative to Cypress baseUrl (FE) so /api is proxied to the backend — no port literals.
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { email, password },
    failOnStatusCode: false,
  }).then((resp) => {
    const { token, user } = assertLoginSuccess(resp.status, resp.body);
    // Seed storage before the app boots (cy.window needs a document).
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("bb_access_token", token);
        win.localStorage.setItem("user", JSON.stringify(user));
      },
    });
  });
});

export {};
