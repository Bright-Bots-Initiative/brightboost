// Cypress support entry (A4-02). Loaded when supportFile is enabled.
import "./commands";

// Bug B / SF-02 (PR #750): no third-party cy.intercept claimed here.
// - Nodemailer runs server-side (password-reset only); no covered flow sends mail.
// - Browser PostHog only initializes when VITE_POSTHOG_KEY is present; E2E does
//   not set that key, so a host-pattern intercept would never fire (decorative).
// Never stub the app's own API (G-103).
