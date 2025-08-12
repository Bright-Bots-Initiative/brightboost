import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_SWA_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{ts,js}',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 0,
      openMode: 0,
    },
    env: {
      VITE_API_BASE: process.env.VITE_API_BASE,
      ALLOW_DEV_HEADERS: process.env.CYPRESS_ALLOW_DEV_HEADERS,
      STUDENT_ID: process.env.CYPRESS_STUDENT_ID,
      LESSON_ID: process.env.CYPRESS_LESSON_ID
    }
  },
});
