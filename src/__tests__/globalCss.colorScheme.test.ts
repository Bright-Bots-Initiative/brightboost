/* @vitest-environment node */
/**
 * Regression guard for #681 — leftover Vite starter CSS in `src/index.css`.
 *
 * The starter block set `color-scheme: light dark` + `background-color: #242424`
 * on `:root`, and `background-color: #1a1a1a` on every `button` (the starter's
 * light-mode counterpart, `button { background-color: #f9f9f9 }`, was never
 * carried over). Under an OS dark preference the canvas went near-black, and in
 * BOTH schemes every button without its own background utility rendered as a
 * near-black box — measured at 1.15:1 text contrast on `/parents/guide`.
 *
 * This asserts the *rendered* property, not the CSS text: the real stylesheet is
 * compiled through the app's PostCSS/Tailwind pipeline and read back with
 * `getComputedStyle` inside a Chromium context that emulates
 * `prefers-color-scheme`. Reverting either half of the fix turns this red.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const INDEX_CSS = path.join(REPO_ROOT, "src", "index.css");
const TAILWIND_CONFIG = path.join(REPO_ROOT, "tailwind.config.ts");

/** Values the Vite starter used — these are the regression, never the target. */
const STARTER_ROOT_BG = "rgb(36, 36, 36)"; // #242424
const STARTER_BUTTON_BG = "rgb(26, 26, 26)"; // #1a1a1a

const EXPECTED_ROOT_BG = "rgb(255, 255, 255)";
const EXPECTED_ROOT_COLOR = "rgb(33, 53, 71)"; // #213547
const TRANSPARENT = "rgba(0, 0, 0, 0)";
/** Tailwind `gray-500` — BottomNav's inactive label colour (src/components/BottomNav.tsx). */
const GRAY_500 = "#6b7280";

/**
 * Two real shapes that carry no background utility of their own:
 * a BottomNav item sitting on the `bg-white` bar, and a Data Dash sort card
 * (src/components/games/DataDashSortDiscoverGame.tsx) sitting on a white card.
 * Backgrounds are inline so the fixture does not depend on which Tailwind
 * utilities happen to be emitted for this file.
 */
const FIXTURE = `
  <div id="bar" style="background-color: #ffffff">
    <button id="nav-probe" style="color: ${GRAY_500}">Learn</button>
  </div>
  <div id="card-host" style="background-color: #ffffff">
    <button id="card-probe">Bean</button>
  </div>
`;

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function parseRgb(value: string): [number, number, number] {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Not an rgb() colour: ${value}`);
  const parts = match[1].split(/[,/]/).map((p) => Number.parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2]];
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(parseRgb(foreground));
  const b = relativeLuminance(parseRgb(background));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

type Probe = {
  rootBackground: string;
  rootColor: string;
  rootColorScheme: string;
  navButtonBackground: string;
  /** First opaque background up the ancestor chain — what the label is read against. */
  navEffectiveBackground: string;
  navButtonColor: string;
  cardButtonBackground: string;
};

// Chromium is installed in CI (`npx playwright install --with-deps chromium`
// runs before `npm test`). Locally, `npm run test:unit` is documented as the
// browser-free option, so skip loudly by name rather than failing on a missing
// browser — never skip silently.
const chromiumExecutable = (() => {
  try {
    return chromium.executablePath();
  } catch {
    return "";
  }
})();
const hasChromium = chromiumExecutable !== "" && existsSync(chromiumExecutable);
if (!hasChromium) {
  console.warn(
    "[#681] Skipping prefers-color-scheme regression guard. Reason: Playwright Chromium is not installed. Run `npx playwright install chromium`.",
  );
}

describe.skipIf(!hasChromium)(
  "global stylesheet under prefers-color-scheme (#681)",
  () => {
    let browser: Browser;
    let css: string;

    beforeAll(async () => {
      const source = readFileSync(INDEX_CSS, "utf8");
      const result = await postcss([
        tailwindcss({ config: TAILWIND_CONFIG }),
        autoprefixer,
      ]).process(source, { from: INDEX_CSS });
      css = result.css;
      browser = await chromium.launch();
    }, 180_000);

    afterAll(async () => {
      await browser?.close();
    });

    async function probe(colorScheme: "dark" | "light"): Promise<Probe> {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await page.setContent(`<style>${css}</style>${FIXTURE}`);
      const result = await page.evaluate(() => {
        const opaqueBackgroundBehind = (start: Element): string => {
          let node: Element | null = start;
          while (node) {
            const value = getComputedStyle(node).backgroundColor;
            const alpha = value.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
            if (!/^rgba\(/.test(value) || Number(alpha?.[1] ?? 1) > 0.99) {
              return value;
            }
            node = node.parentElement;
          }
          return "rgb(255, 255, 255)";
        };
        const navEl = document.getElementById("nav-probe") as Element;
        const root = getComputedStyle(document.documentElement);
        const nav = getComputedStyle(navEl);
        const card = getComputedStyle(
          document.getElementById("card-probe") as Element,
        );
        return {
          rootBackground: root.backgroundColor,
          rootColor: root.color,
          rootColorScheme: root.colorScheme,
          navButtonBackground: nav.backgroundColor,
          navEffectiveBackground: opaqueBackgroundBehind(navEl),
          navButtonColor: nav.color,
          cardButtonBackground: card.backgroundColor,
        };
      });
      await context.close();
      return result;
    }

    describe.each(["dark", "light"] as const)(
      "with %s OS preference",
      (scheme) => {
        let styles: Probe;

        beforeAll(async () => {
          styles = await probe(scheme);
        }, 60_000);

        it("paints the document canvas light instead of the starter near-black", () => {
          expect(styles.rootBackground).not.toBe(STARTER_ROOT_BG);
          expect(styles.rootBackground).toBe(EXPECTED_ROOT_BG);
          expect(styles.rootColor).toBe(EXPECTED_ROOT_COLOR);
        });

        it("pins color-scheme to light so the OS preference cannot repaint it", () => {
          expect(styles.rootColorScheme).toBe("light");
        });

        it("leaves buttons without a background utility transparent", () => {
          expect(styles.navButtonBackground).not.toBe(STARTER_BUTTON_BG);
          expect(styles.cardButtonBackground).not.toBe(STARTER_BUTTON_BG);
          expect(styles.navButtonBackground).toBe(TRANSPARENT);
          expect(styles.cardButtonBackground).toBe(TRANSPARENT);
        });

        it("keeps a BottomNav-style label at WCAG AA over the surface behind it", () => {
          // Pre-fix the button painted itself #1a1a1a, so gray-500 read at 3.6:1.
          expect(styles.navEffectiveBackground).toBe(EXPECTED_ROOT_BG);
          const ratio = contrastRatio(
            styles.navButtonColor,
            styles.navEffectiveBackground,
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      },
    );
  },
);
