/**
 * Public entry — accessibility, legacy compatibility, and the promise that
 * these pages talk to nobody.
 *
 * `cypress-axe` is imported here rather than in `cypress/support/e2e.ts`: that
 * support file is shared by every spec, and this is the only one that needs
 * axe. (`cypress/support/index.js` also imports it, but the Cypress config
 * loads `e2e.ts`, not `index.js`.)
 */
import "cypress-axe";

/**
 * The public entry pages request nothing off this origin except the Google
 * Fonts stylesheet and font files that `src/App.css` has always loaded (F1,
 * unchanged by this slice). Anything else — a donation processor, a tracker,
 * an image CDN — is a failure, and this records it per visit rather than
 * throwing inside an intercept handler where the error would be hard to read.
 */
const ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

function watchForThirdPartyRequests(): string[] {
  const offenders: string[] = [];
  cy.intercept({ url: /.*/ }, (req) => {
    let host = "";
    try {
      host = new URL(req.url).hostname;
    } catch {
      host = req.url;
    }
    if (!ALLOWED_HOSTS.includes(host)) offenders.push(req.url);
  });
  return offenders;
}

const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/for-teachers", name: "teacher landing" },
  { path: "/for-families", name: "family landing" },
  { path: "/donate", name: "support page" },
  { path: "/feedback", name: "feedback page" },
];

/**
 * The game's own reduced-effects preference, read by `useReducedGameEffects`
 * and applied by `GameShell` as `data-reduced-effects="true"`, which sets
 * `animation: none` on every effect class in `game-effects.css`.
 */
const REDUCED_EFFECTS_KEY = "brightboost.reducedGameEffects";

/**
 * Visit a page and wait until axe can sample a settled one.
 *
 * axe computes colour contrast from the colours it finds at the moment it
 * runs, and a card part-way through a fade-in blends its text with whatever is
 * behind it. That is what produced eight "serious" contrast nodes on `/` —
 * every one of them inside GameShell's briefing entrance — while axe run
 * against the same release build after the animation reports none.
 *
 * Two guards, because one of them alone is a race:
 *  - the game's reduced-effects preference is set BEFORE the page loads (the
 *    same `onBeforeLoad` seam the storage cases below use), so the entrance
 *    animation never runs at all;
 *  - on `/` the wait is for the real game — the panel reserves its box before
 *    the lazy chunk arrives, so `main` existing proves nothing — and then for
 *    every finite animation on the page to have finished. Infinite ones are
 *    excluded deliberately: they never finish, and an idle loop is not a
 *    settling state.
 *
 * The assertion itself is untouched: zero violations, all rules.
 */
function visitSettled(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(REDUCED_EFFECTS_KEY, "true");
    },
  });
  cy.get("main").should("exist");
  if (path === "/") {
    cy.contains("button", "Start Mission").should("be.visible");
  }
  cy.document().should((doc) => {
    const unsettled = doc
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === "running" &&
          animation.effect?.getTiming().iterations !== Infinity,
      );
    expect(unsettled, `animations still running on ${path}`).to.have.length(0);
  });
}

describe("public entry — accessibility", () => {
  PAGES.forEach((page) => {
    it(`reports no axe violations on the ${page.name} (${page.path})`, () => {
      const offenders = watchForThirdPartyRequests();
      visitSettled(page.path);
      cy.injectAxe();
      // The default failure message is a bare count. Naming the rule and the
      // offending selectors is the difference between a finding someone can
      // act on and one they have to reproduce first.
      cy.checkA11y(undefined, undefined, (violations) => {
        throw new Error(
          `axe violations on ${page.path}: ` +
            violations
              .map(
                (v) =>
                  `${v.id} [${v.impact}] ${v.nodes.length} node(s) ${v.nodes
                    .map((n) => n.target.join(" "))
                    .join(" | ")}`,
              )
              .join(" ;; "),
        );
      });
      cy.then(() => {
        expect(
          offenders,
          `third-party requests from ${page.path}: ${offenders.join(" | ")}`,
        ).to.have.length(0);
      });
    });
  });
});

describe("public entry — legacy compatibility", () => {
  it("sends /teachers to the teacher landing", () => {
    cy.visit("/teachers");
    cy.location("pathname").should("eq", "/for-teachers");
    cy.contains("h1", "Set up a class, then watch what they build.").should(
      "be.visible",
    );
  });

  it("keeps ?source=nonprofit across the /teachers redirect", () => {
    cy.visit("/teachers?source=nonprofit");
    cy.location("pathname").should("eq", "/for-teachers");
    cy.location("search").should("eq", "?source=nonprofit");
    cy.contains("From Bright Bots Initiative").should("be.visible");
  });

  it("sends the legacy /#donation fragment to the support page", () => {
    cy.visit("/#donation");
    cy.location("pathname").should("eq", "/donate");
    cy.contains("h1", "Support Bright Boost").should("be.visible");
  });

  it("sends the legacy /#feedback fragment to the feedback page", () => {
    cy.visit("/#feedback");
    cy.location("pathname").should("eq", "/feedback");
    cy.contains("h1", "Feedback").should("be.visible");
  });

  /**
   * Review note N3: "should be visible" passed while `#plans` sat about 280px
   * down the page, because a heading two thirds of the way down the viewport
   * IS visible — it is just not where a visitor who followed an anchor is
   * looking. So the landing offset itself is the assertion now, and it has two
   * halves, because both halves failed before this slice:
   *
   *  - the target must be BELOW the sticky header, not tucked under it.
   *    `#for-adults` used to land at exactly 0, which put its heading behind
   *    57px of translucent chrome;
   *  - the target must be at most 80px from the top — the 68px
   *    `scroll-margin-top` plus a rounding allowance — UNLESS the document
   *    simply ends too soon after it for that to be possible, in which case
   *    the page has to be scrolled to its very end. `#plans` is the last
   *    content block on `/` and sits about 618px above the document end, so on
   *    a 720px-tall viewport the browser can bring it no higher than ~102px:
   *    there is nothing left underneath to scroll. The escape is narrow on
   *    purpose — a landing that is short because the layout moved under the
   *    scroll leaves `scrollY` below the maximum and still fails.
   */
  const FRAGMENT_TOP_LIMIT = 80;

  /** The landing rule, applied wherever the page has just settled. */
  function expectFragmentLanded(hash: string) {
    cy.location("pathname").should("eq", "/");
    cy.window().its("scrollY").should("be.greaterThan", 0);

    cy.get(hash).should("be.visible");
    cy.window().then((win) => {
      cy.get("nav")
        .first()
        .then(($nav) => {
          const headerBottom = $nav[0].getBoundingClientRect().bottom;
          cy.get(hash).should(($el) => {
            const top = $el[0].getBoundingClientRect().top;
            const maxScrollY =
              win.document.documentElement.scrollHeight - win.innerHeight;

            expect(
              top,
              `${hash} top edge is below the sticky header`,
            ).to.be.at.least(headerBottom - 1);

            if (top > FRAGMENT_TOP_LIMIT) {
              expect(
                Math.round(win.scrollY),
                `${hash} is ${Math.round(top)}px down, so the page must be scrolled to its end`,
              ).to.be.at.least(Math.round(maxScrollY) - 1);
            }
          });
        });
    });
  }

  ["#plans", "#for-adults"].forEach((hash) => {
    it(`lands the legacy /${hash} fragment at the top of the viewport, clear of the header`, () => {
      cy.visit(`/${hash}`);
      expectFragmentLanded(hash);
    });
  });

  /**
   * The reload is its own case because it is the one that failed. On a fresh
   * visit the hero image is uncached and its bytes arrive late enough that the
   * settle follow-ups still catch the growth; on a reload it is cached, the
   * figure resized ~50ms in, and the smooth scroll finished 104px short of
   * `#for-adults` and stayed there. `#for-adults` has 959px of page beneath it,
   * so the document-end escape cannot apply here — the [0, 80] bound is
   * asserted outright on top of the shared rule.
   */
  it("lands /#for-adults at the top after a reload, not only on a first visit", () => {
    cy.visit("/#for-adults");
    expectFragmentLanded("#for-adults");

    cy.reload();
    expectFragmentLanded("#for-adults");
    cy.get("#for-adults").should(($el) => {
      const top = $el[0].getBoundingClientRect().top;
      expect(top, "#for-adults top edge after a reload").to.be.within(
        0,
        FRAGMENT_TOP_LIMIT,
      );
    });
  });

  it("scrolls the plans entry into view for the legacy /#plans fragment", () => {
    cy.visit("/#plans");
    cy.location("pathname").should("eq", "/");
    cy.get("#plans").should("be.visible");
    cy.window().its("scrollY").should("be.greaterThan", 0);
    cy.get('#plans a[href="/plans/learner"]').should("be.visible");
  });

  it("clears the one-shot storage handoff and redirects once", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem("bb-home-scroll", "donation");
      },
    });
    cy.location("pathname").should("eq", "/donate");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem("bb-home-scroll")).to.equal(null);
    });
  });

  it("ignores an unrecognised stored value and stays on the homepage", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem("bb-home-scroll", "../evil");
      },
    });
    cy.location("pathname").should("eq", "/");
    cy.get("#hero-heading").should("be.visible");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem("bb-home-scroll")).to.equal(null);
    });
  });
});

describe("public entry — honest states", () => {
  it("tells a visitor the feedback form is browser-local before they submit", () => {
    cy.visit("/feedback");
    cy.contains(
      "This form is stored only in this browser session. It does not send a message to Bright Bots Initiative.",
    ).should("be.visible");
    // The confirmation appears only after a submission.
    cy.contains("captured in this browser session").should("not.exist");
  });

  it("never renders a dead link on the support page", () => {
    // VITE_DONATION_URL is deliberately not set for this run, so the page must
    // be in its unavailable state — with no placeholder href and no cadence
    // action that nothing can honour.
    cy.visit("/donate");
    cy.contains(
      "Donating is optional and never required to use Bright Boost.",
    ).should("be.visible");
    cy.get('a[href="#"]').should("not.exist");
    cy.contains("Give monthly").should("not.exist");
  });

  it("carries the giving link on the homepage and never on the family landing", () => {
    cy.visit("/");
    cy.get('footer a[href="/donate"]').should("have.length", 1);
    cy.visit("/for-families");
    cy.get('a[href="/donate"]').should("not.exist");
  });
});
