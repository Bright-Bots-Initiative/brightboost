import { defineConfig } from "cypress";

// A4-01 baseline (pre-change): supportFile false; baseUrl silent fallback to
// http://localhost:5173; retries.runMode 1; JUnit reporter; #677 env keys
// LIVE_STACK, VITE_API_BASE, ALLOW_DEV_HEADERS, STUDENT_ID, LESSON_ID, CYPRESS_SWA_URL.

// Cypress 13 loads this config through a CJS/ESM bridge that cannot reliably
// import sibling TypeScript helpers. Keep the config boundary self-contained.
const rawBaseUrl = process.env.CYPRESS_SWA_URL;
if (rawBaseUrl === undefined || rawBaseUrl.trim() === "") {
  throw new Error(
    '[brightboost-e2e] Required env "CYPRESS_SWA_URL" is not set. Refusing to pass silently.',
  );
}
const baseUrl = rawBaseUrl.trim();

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/*.cy.{ts,js}",
    supportFile: "cypress/support/e2e.ts",
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    env: {
      LIVE_STACK: process.env.CYPRESS_LIVE_STACK ?? "0",
      VITE_API_BASE: process.env.VITE_API_BASE,
      ALLOW_DEV_HEADERS: process.env.CYPRESS_ALLOW_DEV_HEADERS ?? "0",
      STUDENT_ID: process.env.CYPRESS_STUDENT_ID,
      LESSON_ID: process.env.CYPRESS_LESSON_ID,
      CYPRESS_SWA_URL: process.env.CYPRESS_SWA_URL,
      E2E_TEACHER_EMAIL: process.env.E2E_TEACHER_EMAIL,
      E2E_TEACHER_PASSWORD: process.env.E2E_TEACHER_PASSWORD,
    },
  },
  reporter: "junit",
  reporterOptions: {
    mochaFile: "cypress/results/results-[hash].xml",
    toConsole: true,
  },
});
