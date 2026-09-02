/**
 * BiomeBuddyGame — the five-screen loop as a user sees it. react-i18next is
 * mocked to the defaultValue text (Waterworks precedent); content data is
 * read through useBuddyLocale → English.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BiomeBuddyGame from "../BiomeBuddyGame";
import {
  DRAFT_KEY,
  GALLERY_KEY,
  PROGRESS_KEY,
  loadDraft,
  loadGallery,
  loadProgress,
} from "../biomeBuddyStorage";
import {
  starterRecipe,
  computeStats,
  type BuddyRecipe,
} from "../biomeBuddyModel";
import { encodeShare, readShareParam } from "../biomeBuddyShare";

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

function button(name: string | RegExp) {
  return screen.getByRole("button", { name });
}

function startGuided() {
  fireEvent.click(button(/K–2 · Guided/));
}

/** Tap the biome chip, then Select (the Select label names the CURRENT home). */
function chooseBiome(name: "Earth" | "Water" | "Fire" | "Air") {
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(name) }));
  fireEvent.click(button(new RegExp(`Select ${name}`)));
}

function pick(category: string, option: string) {
  fireEvent.click(
    screen.getByRole("radio", { name: `${category}: ${option}` }),
  );
}

function closeScience() {
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Got it!" }),
  );
}

/** Walk the Test & Learn pages to the end and tap Got it. */
function finishWalkthrough() {
  const dialog = screen.getByRole("dialog");
  for (let i = 0; i < 8; i++) {
    const next = within(dialog).queryByRole("button", { name: "Next ▶" });
    if (!next) break;
    fireEvent.click(next);
  }
  fireEvent.click(within(dialog).getByRole("button", { name: "Got it!" }));
}

describe("BiomeBuddyGame loop", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not create a draft just by viewing the title", () => {
    render(<BiomeBuddyGame />);
    expect(screen.getByText("What will you build?")).toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("Choose → Create: biome chips, side arrows and Select advance with the chosen home", () => {
    render(<BiomeBuddyGame />);
    startGuided();
    expect(screen.getByText("Where will your Buddy live?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Water/ }));
    expect(screen.getByRole("radio", { name: /Water/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(button("Next home")); // water → fire
    expect(screen.getByRole("radio", { name: /Fire/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(button("Previous home")); // back to water
    chooseBiome("Water");
    expect(
      screen.getByRole("button", { name: /Home: Water — tap to change/ }),
    ).toBeInTheDocument();
    expect(loadDraft()?.recipe.biome).toBe("water");
  });

  it("Guided opens only Eyes + Movement; picking an option opens a focus-managed science card and moves the bars", () => {
    render(<BiomeBuddyGame />);
    startGuided();
    chooseBiome("Earth");
    // locked pickers show exactly one disabled chip
    const ears = screen.getByRole("radiogroup", { name: "Ears choices" });
    expect(within(ears).getAllByRole("radio")).toHaveLength(1);
    expect(within(ears).getByRole("radio")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    const eyes = screen.getByRole("radiogroup", { name: "Eyes choices" });
    expect(within(eyes).getAllByRole("radio")).toHaveLength(4);

    const before = screen
      .getByRole("meter", { name: /^Sight:/ })
      .getAttribute("aria-valuenow");
    pick("Eyes", "No eyes");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("No eyes")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/also called: eyeless/),
    ).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
    // the part's effect is spelled out in words, not only bars
    expect(within(dialog).getByText(/Hearing up/)).toBeInTheDocument();
    closeScience();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const after = screen
      .getByRole("meter", { name: /^Sight:/ })
      .getAttribute("aria-valuenow");
    expect(Number(after)).toBeLessThan(Number(before));
    // focus returned to the chip that opened the card
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Eyes: No eyes" }),
    );
  });

  it("Test & Learn explains each moved bar, ends on a wondering nudge, then Name & Save; a test unlocks the next Guided picker", () => {
    render(<BiomeBuddyGame />);
    startGuided();
    chooseBiome("Water");
    pick("Movement", "Fins");
    closeScience();
    fireEvent.click(button("Test it! 🔬"));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Here's how .* does in the Water!/),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole("meter")).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Next ▶" }));
    expect(within(dialog).getByText(/Agility went up by/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Fins turn every flick into a glide/),
    ).toBeInTheDocument();
    // deeper science is available but collapsed
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Tell me more 🔬" }),
    );
    expect(
      within(dialog).getByText(/Fins work because water is thick/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wonder").textContent).toMatch(/I wonder/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Got it!" }));

    // unlock announce (scaffolding announces itself), then Name & Save
    expect(screen.getByText("New part to change: Ears!")).toBeInTheDocument();
    fireEvent.click(button("Try it!"));
    expect(loadProgress().guidedTestsCompleted).toBe(1);
    // "Try it!" returns to Create with Ears open
    const ears = screen.getByRole("radiogroup", { name: "Ears choices" });
    expect(within(ears).getAllByRole("radio")).toHaveLength(4);
  });

  it("Name & Save uses only the closed name kit, saves in place, and offers Share; revising keeps the same id", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(button(/Grades 3–5/));
    chooseBiome("Fire");
    fireEvent.click(button("Name & Save"));
    expect(screen.getByText("Name your Buddy!")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); // no free text
    fireEvent.click(screen.getByRole("radio", { name: "Brave" }));
    fireEvent.click(screen.getByRole("radio", { name: "Digger" }));
    expect(screen.getByTestId("name-preview")).toHaveTextContent(
      "Brave Digger",
    );
    fireEvent.click(button("Save it! 💾"));
    expect(screen.getByText("Saved on this device! ✓")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Share my Buddy/ }),
    ).toBeInTheDocument();
    const gallery = loadGallery();
    expect(gallery).toHaveLength(1);
    const id = gallery[0].id;
    expect(gallery[0].recipe.name).toEqual({
      adjective: "brave",
      noun: "digger",
    });

    // Revise: keep building, change a part, save again → same record updated
    fireEvent.click(button("Keep building 🔧"));
    pick("Body Covering", "Hard shell");
    closeScience();
    fireEvent.click(button("Save"));
    const again = loadGallery();
    expect(again).toHaveLength(1);
    expect(again[0].id).toBe(id);
    expect(again[0].recipe.traits.covering).toBe("hard_shell");
  });

  it("Revise: the last Test & Learn stays reachable from a non-intrusive chip and reopening it has no side effects", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(button(/Grades 6–8/));
    chooseBiome("Air");
    pick("Movement", "Wings");
    closeScience();
    fireEvent.click(button("Test it! 🔬"));
    finishWalkthrough();
    // unnamed → Name screen; go back to building
    fireEvent.click(button("Keep building 🔧"));
    const chip = screen.getByRole("button", {
      name: "Reopen the last Test & Learn",
    });
    fireEvent.click(chip);
    expect(
      within(screen.getByRole("dialog")).getByText(/Here's how/),
    ).toBeInTheDocument();
    const galleryBefore = localStorage.getItem(GALLERY_KEY);
    finishWalkthrough();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(GALLERY_KEY)).toBe(galleryBefore); // nothing was written
    expect(screen.getByText("Test it! 🔬")).toBeInTheDocument(); // still on Create
  });

  it("an unchanged re-test says so gently instead of failing the child", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(button(/Grades 3–5/));
    chooseBiome("Earth");
    fireEvent.click(button("Test it! 🔬"));
    finishWalkthrough();
    fireEvent.click(button("Keep building 🔧"));
    fireEvent.click(button("Test it! 🔬"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/the bars stayed put/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next ▶" }));
    expect(
      within(dialog).getByText("Nothing moved this time"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/fail|wrong|incorrect/i),
    ).not.toBeInTheDocument();
  });

  it("gallery: reopen restores the recipe; delete asks first and removes exactly that Buddy", () => {
    render(<BiomeBuddyGame />);
    fireEvent.click(button(/Grades 3–5/));
    chooseBiome("Water");
    pick("Nose & Breathing", "Gills");
    closeScience();
    fireEvent.click(button("Name & Save"));
    fireEvent.click(button("Save it! 💾"));
    fireEvent.click(button("My Buddies"));
    const card = screen.getByRole("button", { name: /^Open / });
    fireEvent.click(card);
    expect(
      screen.getByRole("radio", { name: "Nose & Breathing: Gills" }),
    ).toHaveAttribute("aria-checked", "true");
    fireEvent.click(button("My Buddies"));
    fireEvent.click(screen.getByRole("button", { name: /^Let .* go$/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(button("Keep it"));
    expect(loadGallery()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Let .* go$/ }));
    fireEvent.click(button("Yes, let it go"));
    expect(loadGallery()).toHaveLength(0);
    expect(screen.getByText("No Buddies yet — build one!")).toBeInTheDocument();
  });

  it("survives corrupt storage on mount and keeps working", () => {
    localStorage.setItem(GALLERY_KEY, "{corrupt");
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ band: "k2", recipe: { biome: "lava" } }),
    );
    localStorage.setItem(PROGRESS_KEY, "[1,2,3]");
    expect(() => render(<BiomeBuddyGame />)).not.toThrow();
    expect(screen.getByText("What will you build?")).toBeInTheDocument();
    startGuided();
    expect(screen.getByText("Where will your Buddy live?")).toBeInTheDocument();
  });

  it("resumes an in-progress draft after reload", () => {
    const first = render(<BiomeBuddyGame />);
    fireEvent.click(button(/Grades 3–5/));
    chooseBiome("Air");
    pick("Eyes", "Compound eyes");
    closeScience();
    first.unmount();
    render(<BiomeBuddyGame />);
    expect(
      screen.getByRole("radio", { name: "Eyes: Compound eyes" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("button", { name: /Home: Air/ }),
    ).toBeInTheDocument();
  });

  it("remix seeds a NEW build from a copy: fresh id, name step required, source untouched", () => {
    const source: BuddyRecipe = starterRecipe("fire");
    source.traits.movement = "claws";
    source.name = { adjective: "bold", noun: "digger" };
    const frozen = JSON.stringify(source);
    render(<BiomeBuddyGame remixRecipe={source} />);
    expect(
      screen.getByRole("radio", { name: "Movement: Claws" }),
    ).toHaveAttribute("aria-checked", "true");
    // The game must hold a COPY: mutating the source after mount cannot leak
    // into the build (this fails if the remix effect aliases the prop).
    source.traits.eyes = "no_eyes";
    pick("Movement", "Wings");
    closeScience();
    expect(
      screen.getByRole("radio", { name: "Eyes: Wide-set eyes" }),
    ).toHaveAttribute("aria-checked", "true");
    source.traits.eyes = "wide_set_eyes"; // restore for the frozen comparison below
    fireEvent.click(button("Name & Save"));
    fireEvent.click(button("Save it! 💾"));
    const saved = loadGallery();
    expect(saved).toHaveLength(1);
    expect(saved[0].recipe.traits.movement).toBe("wings");
    expect(JSON.stringify(source)).toBe(frozen); // remix never mutates its source
    expect(encodeShare(saved[0].recipe)).not.toBe(encodeShare(source));
    expect(readShareParam(`#r=${encodeShare(source)}`)).toBe(
      encodeShare(source),
    );
  });

  it("makes zero network requests through a full loop (isolation contract)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<BiomeBuddyGame />);
    startGuided();
    chooseBiome("Earth");
    pick("Eyes", "Compound eyes");
    closeScience();
    fireEvent.click(button("Test it! 🔬"));
    finishWalkthrough();
    fireEvent.click(button("Try it!"));
    fireEvent.click(button("Name & Save"));
    fireEvent.click(button("Save it! 💾"));
    expect(fetchSpy).not.toHaveBeenCalled();
    const recipe = loadGallery()[0].recipe;
    expect(computeStats(recipe)).toEqual(computeStats(recipe)); // pure
    act(() => {
      vi.runAllTimers();
    });
  });
});
