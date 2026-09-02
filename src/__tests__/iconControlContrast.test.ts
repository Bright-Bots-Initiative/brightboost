/* @vitest-environment node */
/**
 * Regression guard for #810 — interactive icon controls must not use
 * `text-gray-400` on light surfaces.
 *
 * Measured in the #795 approval audit on built CSS: with the starter button
 * backplate removed, a bg-less `text-gray-400` control reads at 2.54:1 on
 * white — under the WCAG 1.4.11 (non-text contrast) 3:1 floor for icon-only
 * controls, and under 1.4.3's 4.5:1 for the small text buttons that share the
 * pattern. The dividing line is exactly gray-400 vs gray-500 (4.83:1).
 *
 * Two guards below: the arithmetic that justifies the line (computed from the
 * live Tailwind palette, so a palette drift re-opens the question loudly), and
 * a source sweep that fails when an interactive `text-gray-400` reappears on
 * a light surface. Deliberate exceptions are allowlisted with their reasons.
 *
 * The sweep is a REINTRODUCTION guard for the known interactive signatures
 * (hover text shift, grab cursor, chevron state indicator), not a proof of
 * coverage — JSX spreads interactivity across lines, so a line predicate
 * cannot decide "interactive" in general (a ghost Button's onClick sits lines
 * away from its className). The coverage claim for #810 rests on the
 * adversarial audit recorded on PR #825, which swept every `text-gray-400`
 * occurrence element-by-element.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import colors from "tailwindcss/colors";
import { describe, expect, it } from "vitest";

const SRC_ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * These `text-gray-400` interactive matches are correct as they are:
 *  - Sidebar.tsx — control rests on the dark sidebar root (`bg-gray-800`,
 *    lines 45/113): gray-400 measures 5.78:1 there, and gray-500 would drop
 *    it to 3.04:1 — darkening REDUCES contrast on this surface. #810 is
 *    strictly about light surfaces.
 *  - TeacherDashboard.tsx — the gray icon sits inside a Link that is
 *    identified by an adjacent visible text label; the icon is supplementary,
 *    so 1.4.11 does not hang the control's identification on it.
 */
const ALLOWED = new Set([
  path.join("components", "TeacherDashboard", "Sidebar.tsx"),
  path.join("pages", "TeacherDashboard.tsx"),
]);

function relativeLuminance(hex: string): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

function contrastOnWhite(hex: string): number {
  const l = relativeLuminance(hex);
  return (1 + 0.05) / (l + 0.05);
}

function walkTsx(dir: string, hits: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walkTsx(full, hits);
    } else if (entry.endsWith(".tsx")) {
      hits.push(full);
    }
  }
  return hits;
}

describe("interactive icon-control contrast (#810)", () => {
  it("gray-400 fails and gray-500 passes the floors this fix relies on", () => {
    // 1.4.11 non-text floor (3:1) for icon-only controls; 1.4.3 (4.5:1) for
    // the small text buttons sharing the pattern (PD Hub reply/cancel,
    // tutorial skip). Computed from the live palette: a Tailwind upgrade that
    // moves either gray re-opens the question here instead of silently.
    expect(contrastOnWhite(colors.gray[400])).toBeLessThan(3);
    expect(contrastOnWhite(colors.gray[500])).toBeGreaterThanOrEqual(3);
    expect(contrastOnWhite(colors.gray[500])).toBeGreaterThanOrEqual(4.5);
  });

  it("no interactive text-gray-400 remains outside the allowlisted surfaces", () => {
    // A className carrying text-gray-400 together with a hover text shift, a
    // grab cursor, or a chevron state glyph is an interactive control by
    // construction — the signatures the #795/#825 audits measured at 2.54:1
    // on white (chevrons: the icon is the sole conveyor of expanded state,
    // so 1.4.11 hangs on it even when row text names the topic).
    const offenders: string[] = [];
    for (const file of walkTsx(SRC_ROOT)) {
      const rel = path.relative(SRC_ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (
          line.includes("text-gray-400") &&
          (line.includes("hover:text-") ||
            line.includes("cursor-grab") ||
            line.includes("<Chevron"))
        ) {
          offenders.push(`${rel}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
