import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BiomeBuddyGame from "../BiomeBuddyGame";
import {
  DRAFT_KEY,
  loadDraft,
  loadGallery,
  loadProgress,
  saveDraft,
} from "../biomeBuddyStorage";
import { computeStats, diffBuilds, starterRecipe } from "../biomeBuddyModel";
import WaterExperiment from "../WaterExperiment";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let text = String(options?.defaultValue ?? key);
      for (const [name, value] of Object.entries(options ?? {}))
        if (name !== "defaultValue")
          text = text.replaceAll(`{{${name}}}`, String(value));
      return text;
    },
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

function start(home = "Earth") {
  fireEvent.click(screen.getByRole("button", { name: "Grades 3–5" }));
  fireEvent.click(screen.getByRole("radio", { name: home, exact: true }));
  fireEvent.click(screen.getByRole("button", { name: `Select ${home} ✓` }));
}

function finish() {
  const dialog = screen.getByRole("dialog");
  for (let i = 0; i < 8; i++) {
    const next = within(dialog).queryByRole("button", { name: "Next ▶" });
    if (!next) break;
    fireEvent.click(next);
  }
  fireEvent.click(
    within(dialog).getByRole("button", { name: /Got it!|Keep this version/ }),
  );
}

describe("Biome Buddy experiments", () => {
  beforeEach(() => localStorage.clear());

  it("shows the actual paws-to-fins delta without interrupting selection", () => {
    render(<BiomeBuddyGame />);
    start();
    expect(screen.getByRole("meter", { name: /^Agility:/ })).toHaveAttribute(
      "aria-valuenow",
      "85",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    expect(screen.getByRole("meter", { name: /^Agility:/ })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("trait-feedback")).toHaveTextContent(
      "Agility down 45",
    );
    expect(screen.getByTestId("trait-feedback")).not.toHaveTextContent("up 20");
  });

  it("reopens the tested home and creature after the working home changes", () => {
    render(<BiomeBuddyGame />);
    start();
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    // Compatibility with the old automatic science popup: this regression
    // must reach the incorrect history heading on the original implementation.
    const science = screen.queryByRole("dialog");
    if (science)
      fireEvent.click(within(science).getByRole("button", { name: "Got it!" }));
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    finish();
    const keepBuilding = screen.queryByRole("button", {
      name: "Keep building 🔧",
    });
    if (keepBuilding) fireEvent.click(keepBuilding);
    fireEvent.click(
      screen.getByRole("button", { name: "Home: Earth — tap to change" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Water", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Select Water ✓" }));
    fireEvent.click(screen.getByRole("button", { name: /^Last test/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Here's how Sunny Roamer does in the Earth!",
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("meter", {
        name: /^Agility:/,
      }),
    ).toHaveAttribute("aria-valuenow", "40");
    const versions = within(screen.getByRole("dialog")).getAllByTestId(
      "experiment-version",
    );
    expect(versions[0]).toHaveTextContent("Padded paws");
    expect(versions[1]).toHaveTextContent("Fins");
    expect(versions[1].querySelector(".bb-scene")).toHaveAttribute(
      "data-biome",
      "earth",
    );
  });

  it("undo survives reload, ignores repeated selections, and stops at this build", () => {
    const first = render(<BiomeBuddyGame />);
    start("Water");
    expect(screen.getByRole("button", { name: "Undo change" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    expect(loadDraft()?.undo).toHaveLength(1);
    first.unmount();
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: "Undo change" }));
    expect(loadDraft()?.recipe.traits.movement).toBe("padded_paws");
    expect(loadDraft()?.recipe.biome).toBe("water");
    expect(screen.getByRole("button", { name: "Undo change" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Wings" }));
    fireEvent.click(screen.getByRole("button", { name: "My Buddies" }));
    start("Air");
    expect(screen.getByRole("button", { name: "Undo change" })).toBeDisabled();
  });

  it("restores before without changing the save id or progress, and can undo the restore", () => {
    render(<BiomeBuddyGame />);
    start("Water");
    fireEvent.click(screen.getByRole("button", { name: "Name & Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Save it! 💾" }));
    const id = loadGallery()[0].id;
    fireEvent.click(screen.getByRole("button", { name: "Keep building 🔧" }));
    const before = loadDraft()?.recipe;
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    const progress = loadProgress();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Next ▶",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back to before" }));
    expect(loadDraft()?.recipe).toEqual(before);
    expect(loadDraft()?.id).toBe(id);
    expect(loadProgress()).toEqual(progress);
    fireEvent.click(screen.getByRole("button", { name: "Undo change" }));
    expect(loadDraft()?.recipe.traits.movement).toBe("fins");
  });

  it("gallery reopening uses the last test even when later edits were saved", () => {
    const first = render(<BiomeBuddyGame />);
    start("Water");
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    finish();
    const tested = loadDraft()?.recipe;
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Claws" }));
    fireEvent.click(screen.getByRole("button", { name: "Name & Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Save it! 💾" }));
    first.unmount();
    localStorage.removeItem(DRAFT_KEY);
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /^Open / }));
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    expect(loadDraft()?.lastTest?.snapshot?.before).toEqual(tested);
    expect(loadDraft()?.lastTest?.snapshot?.after.traits.movement).toBe(
      "claws",
    );
  });

  it("keeps the first full recipe across rename, pattern changes, and reload", () => {
    const first = render(<BiomeBuddyGame />);
    start("Water");
    fireEvent.click(
      screen.getByRole("radio", { name: "Color & Pattern: Stripes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Name & Save" }));
    fireEvent.click(screen.getByRole("radio", { name: "Brave" }));
    first.unmount();
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    expect(loadDraft()?.lastTest?.snapshot?.before).toEqual(
      starterRecipe("water"),
    );
    expect(loadDraft()?.lastTest?.snapshot?.after.name.adjective).toBe("brave");
    expect(loadDraft()?.lastTest?.snapshot?.after.pattern).toBe("stripes");
  });

  it("legacy tests show only saved bars until an exact baseline exists", () => {
    const tested = starterRecipe("earth");
    const current = starterRecipe("water");
    saveDraft({
      id: null,
      band: "g35",
      named: false,
      recipe: current,
      lastTested: tested,
      lastTest: diffBuilds(null, tested),
    });
    render(<BiomeBuddyGame />);
    fireEvent.click(screen.getByRole("button", { name: /^Last test/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Your saved test in the Earth");
    expect(within(dialog).getByText(/test saved the bars/)).toBeInTheDocument();
    expect(
      within(dialog).queryByTestId("experiment-version"),
    ).not.toBeInTheDocument();
    finish();
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    expect(loadDraft()?.lastTest?.snapshot).toBeUndefined();
    finish();
    fireEvent.click(screen.getByRole("radio", { name: "Movement: Fins" }));
    fireEvent.click(screen.getByRole("button", { name: "Test it! 🔬" }));
    expect(loadDraft()?.lastTest?.snapshot?.before).toEqual(current);
  });

  it("replays the same Water conditions, with pause and a static reduced-motion result", () => {
    const before = starterRecipe("water");
    const after = starterRecipe("water");
    after.traits.movement = "fins";
    const { container, rerender } = render(
      <WaterExperiment before={before} after={after} reduced={false} />,
    );
    const endpoints = () =>
      [...container.querySelectorAll<HTMLElement>(".bb-water-swimmer")].map(
        (el) => el.style.getPropertyValue("--bb-swim-end"),
      );
    const expected = [
      computeStats(before).agility,
      computeStats(after).agility,
    ].map((n) => `${n}%`);
    expect(endpoints()).toEqual(expected);
    fireEvent.click(screen.getByRole("button", { name: "Watch them move" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause swim" }));
    expect(container.querySelector(".bb-water-lanes")).toHaveAttribute(
      "data-state",
      "paused",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue swim" }));
    fireEvent.animationEnd(container.querySelector(".bb-water-swimmer")!);
    fireEvent.click(screen.getByRole("button", { name: "Watch again" }));
    expect(endpoints()).toEqual(expected);
    rerender(<WaterExperiment before={before} after={after} reduced />);
    expect(container.querySelector(".bb-water-lanes")).toHaveAttribute(
      "data-reduced",
      "true",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Agility: 100/)).toBeInTheDocument();
  });

  it("does not move a previous Earth recipe into a fabricated Water comparison", () => {
    const { container } = render(
      <WaterExperiment
        before={starterRecipe("earth")}
        after={starterRecipe("water")}
        reduced
      />,
    );
    expect(container.querySelectorAll(".bb-water-swimmer")).toHaveLength(1);
    expect(screen.getByText(/new home/)).toBeInTheDocument();
  });
});
