import en from "../../src/locales/en/common.json";
import es from "../../src/locales/es/common.json";

const measurements: Record<string, number | string>[] = [];
const desktopWidths = [1024, 1100, 1280, 1366, 1440, 1920];

describe("public hero — rendered text stays inside its column", () => {
  after(() => {
    cy.writeFile("cypress/results/public-hero-layout.json", measurements);
  });

  for (const [language, copy] of Object.entries({ en, es })) {
    for (const width of [...desktopWidths, 320, 375]) {
      it(`${language} at ${width}px`, () => {
        cy.viewport(width, 900);
        cy.visit("/", {
          onBeforeLoad(win) {
            win.localStorage.setItem("preferredLanguage", language);
            win.localStorage.setItem("brightboost.reducedGameEffects", "true");
          },
        });
        cy.contains("button", copy.games.shared.startMission).should("exist");
        cy.get("#hero-heading").should("contain", copy.home.h1First);
        cy.document()
          .should((doc) => {
            // The external @import can finish after the page's load event.
            // fonts.load() returns [] before its @font-face is registered.
            expect(
              Array.from(doc.fonts).some((font) =>
                font.family.includes("Montserrat"),
              ),
              "Montserrat stylesheet registered",
            ).to.equal(true);
          })
          .then(async (doc) => {
            const fonts = await doc.fonts.load("800 54px Montserrat");
            await doc.fonts.ready;
            expect(
              fonts.length,
              "real Montserrat font loaded",
            ).to.be.greaterThan(0);
          });
        cy.document().should((doc) => {
          const heading = doc.querySelector<HTMLElement>("#hero-heading")!;
          const columnRight =
            heading.parentElement!.getBoundingClientRect().right;
          const range = doc.createRange();
          const textRects = Array.from(heading.children).flatMap((line) => {
            range.selectNodeContents(line);
            return Array.from(range.getClientRects());
          });
          const textRight = Math.max(...textRects.map((rect) => rect.right));
          const win = doc.defaultView!;
          const headingPx = parseFloat(win.getComputedStyle(heading).fontSize);
          const displayPx = parseFloat(
            win.getComputedStyle(heading.previousElementSibling!).fontSize,
          );
          const scrollWidth = Math.max(
            doc.documentElement.scrollWidth,
            doc.body.scrollWidth,
          );
          expect(textRects.length, "rendered text fragments").to.be.greaterThan(
            0,
          );
          expect(
            textRight,
            "text right edge <= grid column right edge",
          ).to.be.at.most(columnRight);
          expect(
            headingPx,
            "heading remains at least as large as display line",
          ).to.be.at.least(displayPx);
          expect(scrollWidth, "no horizontal page scroll").to.be.at.most(
            win.innerWidth,
          );
          if (desktopWidths.includes(width)) {
            expect(textRects.length, "two desktop headline lines").to.equal(2);
          }
        });
        cy.document().then((doc) => {
          const heading = doc.querySelector<HTMLElement>("#hero-heading")!;
          const range = doc.createRange();
          const textRight = Math.max(
            ...Array.from(heading.children).flatMap((line) => {
              range.selectNodeContents(line);
              return Array.from(range.getClientRects(), (rect) => rect.right);
            }),
          );
          const win = doc.defaultView!;
          measurements.push({
            language,
            width,
            columnRight: heading.parentElement!.getBoundingClientRect().right,
            textRight,
            headingPx: parseFloat(win.getComputedStyle(heading).fontSize),
            displayPx: parseFloat(
              win.getComputedStyle(heading.previousElementSibling!).fontSize,
            ),
            scrollWidth: Math.max(
              doc.documentElement.scrollWidth,
              doc.body.scrollWidth,
            ),
          });
        });
      });
    }
  }
});
