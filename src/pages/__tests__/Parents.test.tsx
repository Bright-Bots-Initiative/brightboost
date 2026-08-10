/**
 * /parents public page — renders for a fully anonymous visitor with no
 * AuthProvider and no fetch activity, and presents the curriculum honestly:
 * Foundation available, Exploration gated behind Foundation, Mastery in
 * development. Names come from the canonical stemSets constants.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Parents from "../Parents";
import {
  STEM_SET_1_NAMES,
  STEM_SET_2_NAMES,
  SET_LABELS,
} from "@/constants/stemSets";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

describe("Parents (public /parents route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/parents"]}>
        <Parents />
      </MemoryRouter>,
    );
  }

  it("renders without an AuthProvider and without any fetch calls", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /for parents & families/i }),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the three-stage progression with honest availability", () => {
    renderPage();
    for (const label of SET_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("Available now")).toBeInTheDocument();
    expect(screen.getByText("Opens after Foundation")).toBeInTheDocument();
    expect(screen.getByText("In development")).toBeInTheDocument();
  });

  it("lists canonical game names and strands from the constants", () => {
    renderPage();
    expect(screen.getByText(STEM_SET_1_NAMES["tank-trek"])).toBeInTheDocument();
    expect(screen.getByText(STEM_SET_2_NAMES["maze-maps"])).toBeInTheDocument();
    // Placeholder Set 3 ids must never leak into parent-facing copy.
    expect(screen.queryByText(/set3-game/i)).toBeNull();
  });

  it("wires the three CTAs and the guide link to existing routes", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /try a game — no signup/i }),
    ).toHaveAttribute("href", "/try");
    expect(
      screen.getByRole("link", { name: /join with a class code/i }),
    ).toHaveAttribute("href", "/student-login");
    expect(
      screen.getByRole("link", { name: /create a home group/i }),
    ).toHaveAttribute("href", "/teacher/signup?intent=home");
    expect(
      screen.getByRole("link", { name: /open the guide/i }),
    ).toHaveAttribute("href", "/parents/guide");
  });

  it("sets the shareable document title", () => {
    renderPage();
    expect(document.title).toMatch(/Parents & Families/);
  });
});
