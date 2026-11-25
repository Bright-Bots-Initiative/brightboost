/** Exercise the public games through their embedded and full-screen entry points. */

/** The optimal programs from each demo level's own hint. */
const LEVELS = [
  ["Forward", "Forward"],
  [
    "Turn Right",
    "Forward",
    "Turn Left",
    "Forward",
    "Forward",
    "Turn Right",
    "Forward",
  ],
  [
    "Turn Left",
    "Forward",
    "Turn Right",
    "Forward",
    "Forward",
    "Turn Left",
    "Forward",
  ],
];

const GAME_AREA = '[role="region"][aria-label*="game area"]';

function watchApiCalls(): string[] {
  const calls: string[] = [];
  cy.intercept("**/api/**", (req) => {
    calls.push(req.url);
    req.continue();
  });
  return calls;
}

const COVE_CANVAS = 'canvas[aria-label="Qubit Cove island playground"]';

describe("the public Bright Boost games", () => {
  it("lights every beacon in the homepage game, finishes and replays anonymously", () => {
    const apiCalls = watchApiCalls();
    cy.visit("/");

    cy.get("#hero-heading").should("be.visible");
    cy.window().its("scrollY").should("eq", 0);
    cy.get(COVE_CANVAS).should("have.length", 1).and("be.visible");

    for (const mission of [
      { name: "Zero Garden", samples: 1, answer: "Only 0" },
      { name: "One Peak", samples: 1, answer: "Only 1" },
      { name: "Chance Harbor", samples: 3, answer: "0 or 1" },
    ]) {
      cy.contains("button", "Island map").click();
      cy.contains('[role="dialog"] button', mission.name).click();
      cy.contains("button", "Use beacon").click();
      cy.get('[role="dialog"]').within(() => {
        for (let i = 0; i < mission.samples; i++) {
          cy.contains(
            "button",
            i === 0 ? "Prepare qubit" : "Prepare a fresh qubit",
          ).click();
          cy.contains("button", "Measure").click();
        }
        cy.contains("button", mission.answer).click();
        cy.contains("button", "Back to the cove").click();
      });
    }

    cy.contains("button", "Finish adventure").click();
    cy.contains("h3", "The lighthouse is shining!").should("be.visible");
    cy.contains("Beacons lit: 3 of 3").should("be.visible");
    cy.get("a[href='/for-teachers']").should("exist");
    cy.get("a[href='/for-families']").should("exist");
    cy.contains(/save your stars/i).should("not.exist");

    cy.contains("button", "Play again").click();
    cy.get(COVE_CANVAS).should("have.length", 1);
    cy.get('[aria-label="Beacons lit: 0 of 3"]').should("be.visible");
    cy.contains("button", "Finish adventure").should("not.exist");
    cy.then(() => expect(apiCalls).to.have.length(0));
  });

  it("plays the original three Tank Trek mazes at /try", () => {
    const apiCalls = watchApiCalls();
    cy.visit("/try");
    cy.contains("button", "Start Mission").should("be.visible").click();
    cy.get(GAME_AREA).should("have.length", 1);

    LEVELS.forEach((program, index) => {
      cy.contains("h3", `Level ${index + 1}`).should("be.visible");
      program.forEach((command) => {
        cy.contains("button", command).click();
      });
      cy.contains("button", "Run!").click();

      if (index < LEVELS.length - 1) {
        // Cleared: the game offers the next level.
        cy.contains("button", "Next Level", { timeout: 15000 })
          .should("be.visible")
          .click();
      } else {
        // The last level ends the run, and the game's own results screen is
        // what reports it.
        cy.contains("button", "Finish", { timeout: 15000 })
          .should("be.visible")
          .click();
        cy.contains("Score").should("be.visible");
        cy.contains("button", "Finish").click();
      }
    });

    cy.contains("h1", "You did it!").should("be.visible");
    cy.contains("button", "Play again").click();
    cy.contains("button", "Start Mission").should("be.visible");
    cy.get(GAME_AREA).should("have.length", 0);
    cy.then(() => expect(apiCalls).to.have.length(0));
  });

  it("opens the featured game on its own playable page", () => {
    const apiCalls = watchApiCalls();
    cy.visit("/");
    cy.get(COVE_CANVAS).should("be.visible");
    cy.contains("a", "Open in full screen").click();
    cy.location("pathname").should("eq", "/try");
    cy.location("search").should("eq", "?game=qubit_cove");
    cy.get(COVE_CANVAS).should("have.length", 1).and("be.visible");
    cy.contains("button", "Island map").click();
    cy.contains('[role="dialog"] button', "Zero Garden").should("be.visible");
    cy.then(() => expect(apiCalls).to.have.length(0));
  });

  it("keeps the selected grade band when opening the full-screen demo", () => {
    const apiCalls = watchApiCalls();
    cy.visit("/");
    cy.contains("button", "Grades 3–5").click();
    cy.contains("a", "Open in full screen").click();
    cy.location("search").should("eq", "?band=g3_5");
    cy.contains("button", "Start Mission").click();
    cy.contains("h3", "Level 1: Sequence Challenge").should("be.visible");
    cy.get(GAME_AREA).should("have.length", 1);
    cy.then(() => expect(apiCalls).to.have.length(0));
  });

  // An old login token triggers the app-wide session check on public pages.
  // Neither of the two featured games should request any learner records.
  it("never reads a personal best, even with a stale token in localStorage", () => {
    const apiCalls = watchApiCalls();

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("bb_access_token", "synthetic");
      },
    });
    cy.get(COVE_CANVAS).should("be.visible");
    cy.contains("button", "Grades 3–5").click();
    cy.contains("button", "Start Mission").should("be.visible");
    cy.contains("Best").should("not.exist");

    cy.then(() => {
      const bests = apiCalls.filter((url) => url.includes("personal-bests"));
      expect(bests, `personal-best reads: ${bests.join(" | ")}`).to.have.length(
        0,
      );
      const others = apiCalls.filter((url) => !url.includes("/get-progress"));
      expect(
        others,
        `requests beyond the app session check: ${others.join(" | ")}`,
      ).to.have.length(0);
    });
  });
});
