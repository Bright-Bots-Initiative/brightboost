/**
 * Responsive / large-target smoke (Phase 11). jsdom does no layout, so these
 * pin the CONTRACTS the layout relies on: every interactive control carries
 * the 44px floor class or the primary 56px class, the page never sets a fixed
 * width wider than the narrowest phone, wide content is grid/flex-wrapped,
 * and the phone media queries exist for the widths we ship.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

const WIDTHS = [320, 360, 375, 390, 430, 768, 1280];

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

const css = fs.readFileSync(
  path.resolve(__dirname, "../biomeBuddy.css"),
  "utf8",
);

describe("Biome Buddy responsive contracts", () => {
  beforeEach(() => localStorage.clear());

  it.each(WIDTHS)(
    "at %ipx every screen renders its essential controls",
    (width) => {
      setViewport(width);
      render(<BiomeBuddyGame />);
      expect(
        screen.getByRole("button", { name: /K–2 · Guided/ }),
      ).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: /K–2 · Guided/ }));
      expect(
        screen.getByRole("button", { name: "Previous home" }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Next home" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: /Select Earth/ }),
      ).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: /Select Earth/ }));
      expect(screen.getByRole("button", { name: "Test it! 🔬" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Name & Save" })).toBeVisible();
      expect(screen.getAllByRole("meter")).toHaveLength(4);
      expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(
        4 + 5 + 3,
      );
    },
  );

  it("every interactive control carries a large-target class (44px floor, 56px primary)", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Water/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Water/ }));
    const controls = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("radio"),
    ];
    expect(controls.length).toBeGreaterThan(20);
    for (const el of controls) {
      const cls = el.className;
      expect(
        /min-h-(11|12|14)|bb-primary|min-w-11/.test(cls),
        `${el.textContent?.trim() || el.getAttribute("aria-label")} lacks a large-target class: ${cls}`,
      ).toBe(true);
    }
  });

  it("the stylesheet enforces the target floor globally and ships the phone breakpoints", () => {
    expect(css).toMatch(/\.bb-page button[^{]*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.bb-primary\s*\{[^}]*min-height:\s*56px/s);
    expect(css).toMatch(/@media \(max-width: 639px\)/);
    expect(css).toMatch(/@media \(max-width: 359px\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/overflow-x:\s*clip/);
    // no hard pixel widths that would clip a 320px phone
    const fixedWidths = [
      ...css.matchAll(/(?<!min-|max-)width:\s*(\d+)px/g),
    ].map((m) => Number(m[1]));
    for (const w of fixedWidths) expect(w).toBeLessThanOrEqual(320);
  });

  it("essential state is never encoded only by color: meters carry numbers and word bands", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /Grades 3–5/ }));
    fireEvent.click(screen.getByRole("button", { name: /Select Earth/ }));
    for (const meter of screen.getAllByRole("meter")) {
      expect(meter.getAttribute("aria-label")).toMatch(
        /: \d+ out of 100, (just a little|some|good|great)/,
      );
      expect(meter.getAttribute("aria-valuetext")).toMatch(/^\d+, /);
    }
  });
});
