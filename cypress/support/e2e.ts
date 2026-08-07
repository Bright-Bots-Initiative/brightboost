// Cypress support entry (A4-02). Loaded when supportFile is enabled.
import "./commands";

beforeEach(() => {
  // A4-06: exactly two third-party intercepts — never the app's own API (G-103).
  cy.intercept(
    { method: "POST", url: /posthog\.com/i },
    { statusCode: 200, body: 1 },
  ).as("posthogCapture");

  cy.intercept(
    { url: /smtp\.|sendgrid\.|mailgun\.|ses\.amazonaws\.com/i },
    { statusCode: 200, body: {} },
  ).as("nodemailerOutbound");
});
