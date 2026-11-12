/**
 * The public chrome header.
 *
 * Three facts are load-bearing and each is asserted directly:
 *  - Sign in exists and Sign up does not;
 *  - the nav landmark keeps the shipped `aria-label="Homepage"` by default, so
 *    the existing smoke test's nav check keeps matching, while a page may pass
 *    its own label;
 *  - the wordmark links home and carries a 44px hit area.
 */
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PublicHeader from "../PublicHeader";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

function renderHeader(props: Parameters<typeof PublicHeader>[0] = {}) {
  return render(
    <MemoryRouter>
      <PublicHeader {...props} />
    </MemoryRouter>,
  );
}

describe("PublicHeader", () => {
  it("defaults to the shipped nav[aria-label='Homepage'] landmark", () => {
    renderHeader();
    expect(
      screen.getByRole("navigation", { name: "Homepage" }),
    ).toBeInTheDocument();
  });

  it("lets a page pass its own landmark label", () => {
    renderHeader({ label: "For teachers" });
    expect(
      screen.getByRole("navigation", { name: "For teachers" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Homepage" })).toBeNull();
  });

  it("carries Sign in to /student-login and no Sign up", () => {
    renderHeader();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/student-login",
    );
    expect(within(nav).queryByRole("link", { name: /sign up/i })).toBeNull();
  });

  it("links the wordmark home with a 44px hit area, and never wraps it", () => {
    renderHeader();
    const wordmark = screen.getByRole("link", { name: "Bright Boost" });
    expect(wordmark).toHaveAttribute("href", "/");
    // The hit area is layout, not a new lockup: a min-height on the link box.
    expect(wordmark.className).toContain("min-h-[var(--bb-control-height)]");
    // At 320px the shipped header broke "Bright Boost" over two lines and
    // pushed "Sign in" onto a second row. Neither label may wrap.
    expect(wordmark.className).toContain("whitespace-nowrap");
    expect(screen.getByRole("link", { name: "Sign in" }).className).toContain(
      "whitespace-nowrap",
    );
  });

  it("pairs the wordmark with the mascot, decoratively and outside the link", () => {
    renderHeader();
    const mascot = document.querySelector("img");
    expect(mascot).not.toBeNull();
    expect(mascot?.getAttribute("src")).toBe(
      "/mascots/bright-bot-character.png",
    );
    // Decorative: the link next to it is already named "Bright Boost", and no
    // combined mark is being claimed — the image is its own element.
    expect(mascot?.getAttribute("alt")).toBe("");
    expect(mascot?.getAttribute("width")).toBe("36");
    expect(mascot?.getAttribute("height")).toBe("36");
    expect(
      screen.getByRole("link", { name: "Bright Boost" }).querySelector("img"),
    ).toBeNull();
  });

  it("renders the language control in the public variant", () => {
    renderHeader();
    const trigger = screen.getByRole("button", { name: /change language/i });
    expect(trigger).toBeInTheDocument();
    // The same control, sized like its navy neighbours instead of the 30px
    // coral chip the shared `light` variant paints.
    expect(trigger.className).toContain("min-h-[var(--bb-control-height)]");
    expect(trigger.className).not.toContain("bg-brightboost-yellow");
    // Two labels, one shown at a time by width (see public-entry.css): the
    // language named in full, and its code for the narrow rows where three
    // full labels do not fit. The accessible name is the same either way.
    expect(trigger.querySelector(".bb-lang-name")?.textContent).toBe("English");
    expect(trigger.querySelector(".bb-lang-code")?.textContent).toBe("EN");
  });
});
