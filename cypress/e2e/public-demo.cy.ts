/**
 * The homepage demo, played.
 *
 * The homepage claims that the panel in its hero IS the game, so this spec
 * plays it: the briefing, three real mazes with the solver-verified optimal
 * programs, the game's own result, the panel's completion card, and a replay
 * that lands back on the briefing. A screenshot cannot fail this spec; only a
 * working game can pass it.
 *
 * Two properties ride along, because both are the reason the panel exists in
 * this form:
 *   - the whole visit makes NO request to `/api/` — an anonymous visitor plays
 *     without the page talking to the backend even once;
 *   - `/try` still mounts exactly one game area of its own.
 */

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

describe("the homepage panel is the real Tank Trek", () => {
  it("plays all three mazes, shows the completion card, and replays", () => {
    const apiCalls = watchApiCalls();

    cy.visit("/");

    // The page opens on its own heading, not scrolled down to the game.
    cy.get("#hero-heading").should("be.visible");
    cy.window().its("scrollY").should("eq", 0);

    // Ready state: the game's own briefing, with one primary start.
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

    // The panel's completion card: the stars earned, one prominent replay, the
    // adult paths underneath, and a way to the full-screen demo.
    cy.contains("You finished all three mazes!").should("be.visible");
    cy.get("[data-testid='demo-stars']").should("be.visible");
    cy.get("a[href='/for-teachers']").should("exist");
    cy.get("a[href='/for-families']").should("exist");
    cy.get("a[href='/try']").should("exist");
    // No claim that anything was saved or unlocked.
    cy.contains(/save your stars/i).should("not.exist");
    cy.contains(/unlock/i).should("not.exist");

    cy.contains("button", "Play again").click();
    cy.contains("button", "Start Mission").should("be.visible");
    cy.get(GAME_AREA).should("have.length", 0);

    cy.then(() => {
      expect(
        apiCalls,
        `API requests from the homepage demo: ${apiCalls.join(" | ")}`,
      ).to.have.length(0);
    });
  });

  it("leaves /try with exactly one game area of its own", () => {
    const apiCalls = watchApiCalls();

    cy.visit("/try");
    cy.contains("button", "Start Mission").should("be.visible").click();
    cy.get(GAME_AREA).should("have.length", 1);

    cy.then(() => {
      expect(
        apiCalls,
        `API requests from /try: ${apiCalls.join(" | ")}`,
      ).to.have.length(0);
    });
  });

  /**
   * A token in the visitor's browser must not turn a public page into an
   * authenticated one. `usePersonalBest` fetches whenever `bb_access_token`
   * exists, so the panel states that it is public (`publicDemo`) rather than
   * trusting that no token is there.
   *
   * The one request a token still produces is `AuthProvider`'s session check
   * (`/get-progress`), which is app-wide and predates this panel: it fires the
   * same way on `/privacy`. This spec pins the demo's own contract — no
   * personal-best read, and nothing else from this page — rather than
   * asserting a silence the application as a whole does not keep.
   */
  it("never reads a personal best, even with a stale token in localStorage", () => {
    const apiCalls = watchApiCalls();

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("bb_access_token", "synthetic");
      },
    });
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
