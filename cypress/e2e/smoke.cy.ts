describe("P-01 unauthenticated visitor loads the app shell", () => {
  it("renders a real homepage shell with no console errors", () => {
    const consoleErrors: string[] = [];

    cy.on("window:before:load", (win) => {
      const originalError = win.console.error.bind(win.console);
      win.console.error = (...args: unknown[]) => {
        consoleErrors.push(args.map(String).join(" "));
        originalError(...args);
      };
    });

    cy.visit("/");

    cy.get("#root").children().its("length").should("be.gt", 0);
    cy.get('nav[aria-label="Homepage"]').should("be.visible");
    cy.contains("a", "Bright Boost").should("be.visible");
    cy.get("#hero-heading")
      .should("be.visible")
      .and("contain.text", "Build STEM confidence through playful learning");

    cy.then(() => {
      expect(
        consoleErrors,
        `console.error calls during shell load: ${consoleErrors.join(" | ")}`,
      ).to.have.length(0);
    });
  });
});
