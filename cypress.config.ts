import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_SWA_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{ts,js}',
    supportFile: false,
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    env: {
      VITE_API_BASE: process.env.VITE_API_BASE,
      ALLOW_DEV_HEADERS: process.env.CYPRESS_ALLOW_DEV_HEADERS,
      STUDENT_ID: process.env.CYPRESS_STUDENT_ID,
      LESSON_ID: process.env.CYPRESS_LESSON_ID,
      CYPRESS_SWA_URL: process.env.CYPRESS_SWA_URL
    }
  },
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'cypress/results/results-[hash].xml',
    toConsole: false
  }
});
