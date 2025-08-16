// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Import cypress-axe for accessibility testing
import "cypress-axe";

// Add custom commands for accessibility testing
Cypress.Commands.add("checkAccessibility", (context = null, options = {}) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    tags: ["wcag2a", "wcag2aa"],
    reporter: "v2",
    ...options,
  });
});

// Performance timing command
Cypress.Commands.add("checkPerformance", (thresholds = {}) => {
  cy.window().then((win) => {
    const performance = win.performance;
    const navigation = performance.getEntriesByType("navigation")[0];

    const metrics = {
      domContentLoaded:
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstContentfulPaint:
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ||
        0,
    };

    // Default thresholds (can be overridden)
    const defaultThresholds = {
      domContentLoaded: 2000,
      loadComplete: 3000,
      firstContentfulPaint: 1500,
      ...thresholds,
    };

    Object.entries(defaultThresholds).forEach(([metric, threshold]) => {
      if (metrics[metric] > threshold) {
        throw new Error(
          `Performance failure: ${metric} (${metrics[metric]}ms) exceeds threshold (${threshold}ms)`,
        );
      }
    });

    cy.log(`Performance metrics: ${JSON.stringify(metrics)}`);
  });
});
