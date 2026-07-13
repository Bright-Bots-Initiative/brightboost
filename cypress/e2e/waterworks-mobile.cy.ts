const SEEN_KEY = "waterworks:seen:v1";

const VIEWPORTS = [
  { label: "iPhone SE portrait", width: 320, height: 568 },
  { label: "iPhone 8 portrait", width: 375, height: 667 },
  { label: "modern iPhone portrait", width: 393, height: 659 },
  { label: "large iPhone portrait", width: 430, height: 932 },
  { label: "short iPhone landscape", width: 667, height: 375 },
] as const;

const PAGE_WIDTH_SELECTORS = [
  ".ww-shell-header",
  ".ww-build",
  ".ww-topbar",
  ".ww-build-nav",
  ".ww-palette",
  ".ww-board-scroll",
  ".ww-actions",
].join(",");

function visitWaterworks(options: { skipFirstRunHelp?: boolean } = {}) {
  cy.visit("/waterworks", {
    onBeforeLoad(win) {
      if (options.skipFirstRunHelp) {
        win.localStorage.setItem(
          SEEN_KEY,
          JSON.stringify({
            help: true,
            placedArrow: true,
            flowArrow: true,
            swipeHint: true,
          }),
        );
      }
    },
  });
  cy.contains("h1", "石犀工坊 · Waterworks").should("be.visible");
}

function expectNoDocumentOverflow() {
  cy.document().then((doc) => {
    const root = doc.documentElement;
    const body = doc.body;
    expect(root.scrollWidth, "document width").to.be.at.most(
      root.clientWidth + 1,
    );
    expect(body.scrollWidth, "body width").to.be.at.most(root.clientWidth + 1);
  });
}

function expectPageChromeInsideViewport() {
  cy.get(PAGE_WIDTH_SELECTORS).each(($element) => {
    const element = $element[0];
    const rect = element.getBoundingClientRect();
    const viewportWidth = element.ownerDocument.defaultView?.innerWidth ?? 0;
    expect(rect.left, `${element.className}: left edge`).to.be.at.least(-1);
    expect(rect.right, `${element.className}: right edge`).to.be.at.most(
      viewportWidth + 1,
    );
  });

  cy.get(
    ".ww-language button, .ww-topbar button, .ww-palette button, .ww-actions button",
  ).each(($button) => {
    const rect = $button[0].getBoundingClientRect();
    expect(
      rect.height,
      `${$button.text().trim()}: touch height`,
    ).to.be.at.least(44);
    expect(rect.width, `${$button.text().trim()}: touch width`).to.be.at.least(
      44,
    );
  });

  cy.get(".ww-cell")
    .first()
    .then(($cell) => {
      const rect = $cell[0].getBoundingClientRect();
      expect(rect.width, "board-cell touch width").to.be.at.least(44);
      expect(rect.height, "board-cell touch height").to.be.at.least(44);
    });
}

function expectDialogFitsViewport() {
  cy.get(".ww-dialog")
    .should("be.visible")
    .then(($dialog) => {
      const dialog = $dialog[0];
      const rect = dialog.getBoundingClientRect();
      const view = dialog.ownerDocument.defaultView;
      expect(rect.left, "dialog left edge").to.be.at.least(-1);
      expect(rect.right, "dialog right edge").to.be.at.most(
        (view?.innerWidth ?? 0) + 1,
      );
      expect(rect.top, "dialog top edge").to.be.at.least(-1);
      expect(rect.bottom, "dialog bottom edge").to.be.at.most(
        (view?.innerHeight ?? 0) + 1,
      );
      expect(dialog.scrollWidth, "dialog content width").to.be.at.most(
        dialog.clientWidth + 1,
      );
    });
  expectNoDocumentOverflow();
}

describe("Waterworks mobile layout", () => {
  for (const viewport of VIEWPORTS) {
    it(`keeps the build surface usable at ${viewport.label}`, () => {
      cy.viewport(viewport.width, viewport.height);
      visitWaterworks({ skipFirstRunHelp: true });
      expectNoDocumentOverflow();

      cy.contains("button", "K–2 · Guided").click();
      cy.get('.ww-board[aria-label="River building board"]').should(
        "be.visible",
      );
      expectNoDocumentOverflow();
      expectPageChromeInsideViewport();

      cy.get(".ww-board-scroll").then(($scroller) => {
        const scroller = $scroller[0];
        expect(scroller.scrollLeft, "board starts at its water source").to.eq(
          0,
        );
        expect(
          scroller.scrollWidth,
          "board has an internal horizontal pan",
        ).to.be.greaterThan(scroller.clientWidth);
      });

      cy.get(".ww-board-scroll").scrollTo("right", { duration: 0 });
      cy.get('button[aria-label^="Row 5, column 14:"]')
        .click()
        .should("have.attr", "aria-label")
        .and("match", /channel/i);
      expectNoDocumentOverflow();

      cy.contains("button", "How to play").click();
      expectDialogFitsViewport();
      cy.get(".ww-help-part").each(($row) => {
        expect($row[0].scrollWidth, "help row width").to.be.at.most(
          $row[0].clientWidth + 1,
        );
      });
      cy.contains("button", "Let's build!").click();

      cy.contains("button", "Show me ideas").click();
      expectDialogFitsViewport();
      cy.get(".ww-pattern-row").each(($row) => {
        expect($row[0].scrollWidth, "pattern row width").to.be.at.most(
          $row[0].clientWidth + 1,
        );
      });
      cy.contains("button", "Keep my river").click();
      expectNoDocumentOverflow();
    });
  }
});

describe("Waterworks mobile game flow", () => {
  beforeEach(() => {
    cy.viewport(320, 568);
  });

  it("builds, runs, reflects, saves, and restores on the narrowest phone", () => {
    let apiRequests = 0;
    cy.intercept({ pathname: "/api/**" }, (request) => {
      apiRequests += 1;
      request.continue();
    });

    visitWaterworks({ skipFirstRunHelp: true });
    cy.contains("button", "K–2 · Guided").click();

    cy.get(".ww-palette").contains("button", "Field").click();
    cy.get('button[aria-label^="Row 5, column 5:"]')
      .click()
      .should("have.attr", "aria-label")
      .and("match", /field/i);

    cy.contains("button", "Let it flow!").click();
    cy.get('.ww-board[aria-busy="true"]').should("exist");
    cy.contains("button", "Rain").should("be.disabled");
    cy.contains("button", "Save").should("be.disabled");

    cy.contains("[role=status]", "You earned the Fish Mouth", {
      timeout: 8_000,
    }).should("be.visible");
    cy.contains("button", "Keep building").should("not.exist");
    expectDialogFitsViewport();

    cy.contains("button", "Tap to try it!").click();
    cy.contains("button", "Keep building").should("be.visible").click();

    cy.contains("button", "Save").click();
    expectDialogFitsViewport();
    cy.get('input[aria-label="Name your river!"]')
      .should("be.visible")
      .type("Mobile River");
    cy.contains("button", "Save it!").click();

    cy.contains("button", "My Waterworks").click();
    cy.get('button[aria-label="Open Mobile River"]')
      .should("be.visible")
      .click();
    cy.get('button[aria-label^="Row 5, column 5:"]')
      .should("have.attr", "aria-label")
      .and("match", /field/i);

    cy.reload();
    cy.get('button[aria-label="River name — tap to change"]')
      .should("contain.text", "Mobile River")
      .and("be.visible");
    cy.get('button[aria-label^="Row 5, column 5:"]')
      .should("have.attr", "aria-label")
      .and("match", /field/i);

    expectNoDocumentOverflow();
    cy.then(() => {
      expect(apiRequests, "Waterworks API requests").to.eq(0);
    });
  });

  it("keeps the first-run help reachable in short landscape", () => {
    cy.viewport(667, 375);
    visitWaterworks();
    cy.contains("button", "K–2 · Guided").click();

    cy.contains('[role="dialog"]', "How to play").should("be.visible");
    expectDialogFitsViewport();
    cy.contains("button", "Let's build!").scrollIntoView().click();

    cy.get('.ww-board[aria-label="River building board"]').should("be.visible");
    expectNoDocumentOverflow();
    expectPageChromeInsideViewport();
  });
});

describe("Waterworks landscape tool reachability", () => {
  for (const viewport of [
    { width: 667, height: 375 },
    { width: 736, height: 414 },
    { width: 844, height: 390 },
  ]) {
    it(`keeps every Open-band tool reachable at ${viewport.width}x${viewport.height}`, () => {
      cy.viewport(viewport.width, viewport.height);
      visitWaterworks({ skipFirstRunHelp: true });
      cy.contains("button", "Grades 6–8 · Open").click();

      cy.get(".ww-palette").then(($palette) => {
        expect(
          $palette[0].scrollWidth,
          "advanced palette has an internal pan",
        ).to.be.greaterThan($palette[0].clientWidth);
      });
      cy.get(".ww-palette").scrollTo("right", { duration: 0 });
      cy.get(".ww-palette")
        .contains("button", "Bottle-Neck")
        .should("be.visible")
        .click()
        .should("have.attr", "aria-pressed", "true");
      cy.get(".ww-palette")
        .contains("button", "Erase")
        .should("be.visible")
        .click()
        .should("have.attr", "aria-pressed", "true");

      if (viewport.width >= 768) {
        cy.get(".ww-actions").should(($actions) => {
          const style = getComputedStyle($actions[0]);
          expect(style.order, "actions precede the tall board").to.eq("-1");
          expect(
            style.position,
            "actions stay reachable while scrolling",
          ).to.eq("sticky");
        });
      }
      expectNoDocumentOverflow();
    });
  }

  it("contains the longer Spanish controls on a portrait iPhone", () => {
    cy.viewport(375, 667);
    visitWaterworks({ skipFirstRunHelp: true });
    cy.get('button[aria-label="Change language"]').click();
    cy.contains("button", "Español").click();
    cy.contains("button", "Grados 6–8 · Libre").click();

    expectNoDocumentOverflow();
    expectPageChromeInsideViewport();
    cy.get(".ww-palette").scrollTo("right", { duration: 0 });
    cy.get(".ww-palette")
      .contains("button", "Cuello de Botella")
      .should("be.visible")
      .click()
      .should("have.attr", "aria-pressed", "true");
  });
});
