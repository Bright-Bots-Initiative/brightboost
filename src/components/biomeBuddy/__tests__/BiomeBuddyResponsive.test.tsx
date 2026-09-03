/**
 * Layout CONTRACTS the responsive design relies on (review finding 16):
 * jsdom does no layout, so nothing here pretends to measure pixels. Real
 * widths are covered by the Playwright evidence recorded with the PR
 * (320/360/375/390/430/768/1280). What CAN be pinned in jsdom, and would
 * fail if removed, is asserted here:
 *   - every control carries the 44px floor class or the 56px primary class;
 *   - the stylesheet keeps the phone breakpoints, the Choose-arrow stacking
 *     rule, the reduced-motion rules (including Tailwind's animate-pop), and
 *     never hides the plain-language stat word;
 *   - no fixed pixel width wider than a 320px phone exists in the stylesheet;
 *   - Guided renders ONE screen of choices: exactly the open pickers plus a
 *     single teaser line, never greyed-out sections;
 *   - meters carry a number and a word band, not just a colour.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import BiomeBuddyGame from "../BiomeBuddyGame";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { defaultValue?: string; [key: string]: unknown },
    ) => {
      let text = options?.defaultValue ?? key;
      for (const [name, value] of Object.entries(options ?? {}))
        if (name !== "defaultValue")
          text = text.replaceAll(`{{${name}}}`, String(value));
      return text;
    },
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

const css = fs.readFileSync(
  path.resolve(__dirname, "../biomeBuddy.css"),
  "utf8",
);

const LARGE_TARGET = /(^|\s)(min-h-(11|12|14)|bb-primary|min-w-11)(\s|$)/;

function assertLargeTargets(label: string) {
  const controls = [
    ...screen.getAllByRole("button"),
    ...screen.queryAllByRole("radio"),
    ...screen.queryAllByRole("link"),
  ];
  expect(controls.length, label).toBeGreaterThanOrEqual(3);
  for (const el of controls)
    expect(
      LARGE_TARGET.test(el.className),
      `${label}: "${el.textContent?.trim() || el.getAttribute("aria-label")}" lacks a large-target class: ${el.className}`,
    ).toBe(true);
}

describe("Biome Buddy layout contracts", () => {
  beforeEach(() => localStorage.clear());

  it("every control on every screen carries a large-target class", () => {
    render(<BiomeBuddyGame />);
    assertLargeTargets("title");
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    assertLargeTargets("choose");
    fireEvent.click(screen.getByRole("radio", { name: /Water/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Water/ }));
    assertLargeTargets("create");
    fireEvent.click(screen.getByRole("button", { name: "Name & Save" }));
    assertLargeTargets("name");
  });

  it("the stylesheet keeps its phone rules and never hides the stat word", () => {
    expect(css).toMatch(/\.bb-page button[^{]*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.bb-primary\s*\{[^}]*min-height:\s*56px/s);
    expect(css).toMatch(/@media \(max-width: 639px\)/);
    expect(css).toMatch(
      /@media \(max-width: 479px\)[^}]*\{[\s\S]*?\.bb-choose-scene\s*\{[^}]*grid-column:\s*1 \/ -1/,
    );
    expect(css).toMatch(/@media \(max-width: 359px\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/\.bb-reduced \.animate-pop(,|\s|\{)/);
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)[^}]*\{[\s\S]*?\.animate-pop(,|\s|\{)[\s\S]*?animation:\s*none/,
    );
    expect(css).toMatch(/overflow-x:\s*clip/);
    expect(css).not.toMatch(/\.bb-stat-band[^{]*\{[^}]*display:\s*none/s);
    // a fixed width wider than the narrowest phone would clip it
    // (media-query headers are not declarations — strip them first)
    const declarationsOnly = css.replace(/@media[^{]*\{/g, "");
    expect(declarationsOnly).not.toMatch(
      /(?<![\w-])(?:min-)?width:\s*(3[3-9]\d|[4-9]\d\d|\d{4,})px/,
    );
    // action rows never float over content: no positioned action bar anywhere
    expect(css).not.toMatch(/\.bb-actions-sticky\s*\{[^}]*position:/s);
    // the dialog frame does not scroll; its inner region does, so the ✕ stays put
    expect(css).toMatch(/\.bb-dialog-scroll\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.bb-dialog-close\s*\{[^}]*position:\s*absolute/s);
    // the sheet and the dialog stay inside the viewport
    expect(css).toMatch(
      /\.bb-dialog\s*\{[^}]*max-height:\s*calc\(100vh - 2rem\)/s,
    );
  });

  it("Guided is one screen of choices: only open pickers render, plus one teaser line", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /K–2 · Guided/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Earth/ }));
    const groups = screen.getAllByRole("radiogroup");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Eyes choices",
      "Movement choices",
    ]);
    expect(screen.getAllByRole("radio")).toHaveLength(4 + 5);
    const note = screen.getByTestId("locked-note");
    expect(note).toHaveTextContent(/open Ears/);
    expect(note).toHaveTextContent("Ears: Hidden ear holes");
    expect(note).toHaveTextContent("Body Covering: Short fur");
    expect(screen.queryByText(/opens after you test/)).not.toBeInTheDocument();
  });

  it("older bands render all six pickers and no teaser", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Earth/ }));
    expect(screen.getAllByRole("radiogroup")).toHaveLength(6);
    expect(screen.queryByTestId("locked-note")).not.toBeInTheDocument();
  });

  it("essential state is never encoded only by colour: meters carry numbers and word bands, in the DOM too", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Earth/ }));
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(4);
    for (const meter of meters) {
      expect(meter.getAttribute("aria-label")).toMatch(
        /: \d+ out of 100, (just a little|some|good|great)/,
      );
      expect(meter.getAttribute("aria-valuetext")).toMatch(/^\d+, /);
      const row = meter.closest("li") as HTMLElement;
      expect(
        within(row).getByText(/^(just a little|some|good|great)$/),
      ).toBeInTheDocument();
      expect(within(row).getByText(/^\d+$/)).toBeInTheDocument();
    }
  });

  it("Choose renders the arrow rail with the stacking hooks the 479px rule targets", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    const prev = screen.getByRole("button", { name: "Previous home" });
    const next = screen.getByRole("button", { name: "Next home" });
    expect(prev.className).toMatch(/bb-choose-arrow/);
    expect(next.className).toMatch(/bb-choose-arrow/);
    const panel = prev.parentElement as HTMLElement;
    expect(panel.className).toMatch(/bb-choose-panel/);
    expect(panel.querySelector(".bb-choose-scene")).not.toBeNull();
  });
});
