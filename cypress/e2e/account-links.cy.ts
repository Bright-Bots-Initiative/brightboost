describe("account links keep proofs out of the address and analytics", () => {
  for (const route of ["/reset-password", "/home-access/accept"]) {
    for (const delimiter of ["?", "#"]) {
      it(`opens ${route} with a ${delimiter} proof and survives reload`, () => {
        const proof = "account-link-test-marker";
        if (route === "/home-access/accept") {
          cy.intercept("POST", "**/auth/home-access/invite", (req) => {
            expect(req.url).not.to.contain(proof);
            expect(req.body.token).to.equal(proof);
            req.reply({
              studentFirstName: "Learner",
              adultEmail: "adult@example.invalid",
            });
          }).as("preview");
        }
        cy.visit(`${route}${delimiter}token=${proof}`);
        cy.location("href").should("not.contain", proof);
        cy.get('meta[name="referrer"]').should(
          "have.attr",
          "content",
          "strict-origin",
        );
        cy.get('form input[type="password"]').first().should("be.visible");
        cy.reload();
        cy.location("href").should("not.contain", proof);
        cy.get('form input[type="password"]').first().should("be.visible");
        if (route === "/home-access/accept") cy.wait("@preview");
        cy.window().then((win) => {
          expect(win.history.state.usr.accountLinkToken).to.equal(proof);
          expect(JSON.stringify(win.localStorage)).not.to.contain(proof);
        });
      });
    }
  }
});
