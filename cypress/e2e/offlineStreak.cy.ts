describe('StudentDashboard Streak Offline and Sync', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.visit('/student/login');

    // Login
    cy.get('input[type="email"]').type('student@test.com');
    cy.get('input[type="password"]').type('12345678');
    cy.get('button[type="submit"]').click();

    // Wait until redirected to dashboard
    cy.url({ timeout: 15000 }).should('include', '/student/dashboard');

    // Wait for streak element to appear to ensure dashboard fully loaded
    cy.get('[data-cy=current-streak]', { timeout: 15000 }).should('exist');
  });

  it("completes module offline and syncs streak on reconnect", () => {
    // Step 1: Wait for completeModule function to appear on window
    cy.window({ timeout: 15000 })
      .should((win) => {
        expect(typeof win.completeModule).to.equal("function");
      })
      .then((win) => {
        // Call completeModule while online to initialize
        return win.completeModule("test-module-1");
      });

    // Step 2: Simulate offline by intercepting the POST endpoint to fail
    cy.log("Simulating offline");
    cy.intercept("POST", "/api/gamification/streak", { forceNetworkError: true }).as("postStreakFail");

    // Step 3: Call completeModule while "offline"
    cy.window({ timeout: 15000 }).then((win) => {
      return win.completeModule("test-module-2");
    });

    // Step 4: Optimistic UI should show updated streak
    cy.get('[data-cy="current-streak"]').invoke("text").then((text1) => {
      const streakBefore = Number(text1) || 0;
      cy.log("Current streak after offline complete:", streakBefore);
      expect(streakBefore).to.be.greaterThan(0);

      // Step 5: Simulate going back online by removing forceNetworkError
      cy.log("Simulating reconnect");
      cy.intercept("POST", "/api/gamification/streak").as("postStreakSuccess");

      // Trigger reconnect logic
      cy.reload();

      // Wait for the sync POST
      cy.wait("@postStreakSuccess");

      // Step 6: Confirm streak is still up to date
      cy.get('[data-cy="current-streak"]').invoke("text").then((text2) => {
        const streakAfter = Number(text2);
        cy.log("Current streak after reconnect sync:", streakAfter);
        expect(streakAfter).to.be.at.least(streakBefore);
      });
    });
  });
});



