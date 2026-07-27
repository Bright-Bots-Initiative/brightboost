/**
 * "Prepare Session" availability contract (K-2 adult support):
 * the link renders ONLY for modules that actually have prep data, so a
 * teacher can never be led to the prep page's "not found" dead end.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PrepareSessionLink from "../PrepareSessionLink";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

// Mirrors the live catalog in backend/src/routes/teacherPrep.ts (asserted
// exactly by backend/src/routes/teacherPrep.test.ts).
const AVAILABLE = new Set([
  "k2-stem-rhyme-ride",
  "k2-stem-bounce-buds",
  "k2-stem-gotcha-gears",
]);

function renderLink(slug: string, prepSlugs: Set<string> | null) {
  return render(
    <MemoryRouter>
      <PrepareSessionLink slug={slug} prepSlugs={prepSlugs} />
    </MemoryRouter>,
  );
}

describe("PrepareSessionLink", () => {
  it("renders the prep link for a module with prep data", () => {
    renderLink("k2-stem-rhyme-ride", AVAILABLE);
    const link = screen.getByRole("link", {
      name: /prepare for this session/i,
    });
    expect(link).toHaveAttribute("href", "/teacher/prep/k2-stem-rhyme-ride");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders nothing for an active module without prep data", () => {
    renderLink("k2-stem-tank-trek", AVAILABLE);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders nothing for the archived sequencing module", () => {
    renderLink("k2-stem-sequencing", AVAILABLE);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders nothing while availability is unknown (loading or failed fetch)", () => {
    renderLink("k2-stem-rhyme-ride", null);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders nothing when no module is selected", () => {
    renderLink("", AVAILABLE);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
