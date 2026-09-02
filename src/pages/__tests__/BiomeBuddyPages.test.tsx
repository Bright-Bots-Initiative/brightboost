/**
 * /biome-buddy, /biome-buddy/share and /biome-buddy/review page contracts:
 * cold render for a logged-out visitor (no auth provider, no API), language
 * mirroring, share round-trip in another locale, tamper safety, remix copy.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import BiomeBuddy from "../BiomeBuddy";
import BiomeBuddyShare from "../BiomeBuddyShare";
import BiomeBuddyReview, { REVIEW_SAMPLE_RECIPE } from "../BiomeBuddyReview";
import { encodeShare } from "@/components/biomeBuddy/biomeBuddyShare";
import {
  computeStats,
  starterRecipe,
} from "@/components/biomeBuddy/biomeBuddyModel";
import {
  GALLERY_KEY,
  loadGallery,
} from "@/components/biomeBuddy/biomeBuddyStorage";

const listeners: Record<string, Array<() => void>> = {};
const fakeI18n = {
  language: "en",
  resolvedLanguage: "en",
  on: (event: string, fn: () => void) => {
    (listeners[event] ??= []).push(fn);
  },
  off: (event: string, fn: () => void) => {
    listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
  },
  changeLanguage: vi.fn(),
};

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  useTranslation: () => ({
    t: (
      key: string,
      opts?: { defaultValue?: string; [k: string]: unknown },
    ) => {
      let text = opts?.defaultValue || key;
      for (const [name, value] of Object.entries(opts ?? {}))
        if (name !== "defaultValue")
          text = text.replaceAll(`{{${name}}}`, String(value));
      return text;
    },
    i18n: fakeI18n,
  }),
}));

vi.mock("@/i18n", () => ({
  changeLanguage: vi.fn(),
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "vi", label: "Tiếng Việt" },
    { code: "zh-CN", label: "简体中文" },
  ],
}));

/** Exposes the router's current URL so tests can assert the fragment was stripped. */
function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">
      {location.pathname + location.search + location.hash}
    </span>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/biome-buddy" element={<BiomeBuddy />} />
        <Route path="/biome-buddy/share" element={<BiomeBuddyShare />} />
        <Route path="/biome-buddy/review" element={<BiomeBuddyReview />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("/biome-buddy — logged-out cold render", () => {
  beforeEach(() => {
    localStorage.clear();
    fakeI18n.language = "en";
    fakeI18n.resolvedLanguage = "en";
    document.documentElement.lang = "";
  });

  it("renders the full page with NO auth provider and mirrors + restores document.lang", () => {
    document.documentElement.lang = "en-US";
    const { unmount } = renderAt("/biome-buddy");
    expect(screen.getByText("Biome Buddy")).toBeInTheDocument();
    expect(screen.getByText("What will you build?")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    fakeI18n.resolvedLanguage = "es";
    act(() => {
      (listeners["languageChanged"] ?? []).forEach((fn) => fn());
    });
    expect(document.documentElement.lang).toBe("es");
    unmount();
    expect(document.documentElement.lang).toBe("en-US");
  });

  it("an app set to vi renders this page in English and SAYS so: lang=en, trigger reads English, menu offers en/es only", () => {
    fakeI18n.language = "vi";
    fakeI18n.resolvedLanguage = "vi";
    renderAt("/biome-buddy");
    expect(document.documentElement.lang).toBe("en");
    const trigger = screen.getByRole("button", { name: "Change language" });
    expect(trigger).toHaveTextContent("English");
    fireEvent.click(trigger);
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toContain("Español");
    expect(labels).not.toContain("Tiếng Việt");
    expect(labels).not.toContain("简体中文");
    // no Vietnamese anywhere on a page whose content is English
    expect(document.body.textContent).not.toMatch(/Tiếng|Xây/);
  });

  it("makes zero network requests on mount (isolation contract)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAt("/biome-buddy");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("a #r= remix fragment seeds a copy, strips itself from the URL, and never re-seeds on refresh", () => {
    const source = starterRecipe("air");
    source.traits.covering = "feathers";
    localStorage.setItem(
      "biomebuddy:progress:v1",
      JSON.stringify({ guidedTestsCompleted: 0, band: "g35" }),
    );
    renderAt(`/biome-buddy#r=${encodeShare(source)}`);
    expect(
      screen.getByText(/Starting from a shared Buddy/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Body Covering: Feathers" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/biome-buddy$/);
    expect(loadGallery()).toHaveLength(0); // a remix is a draft until the child saves it
  });

  it("a scrambled #r= fragment falls back to a fresh start with a friendly note", () => {
    expect(() => renderAt("/biome-buddy#r=not-a-buddy!!")).not.toThrow();
    expect(screen.getByText(/got scrambled/)).toBeInTheDocument();
    expect(screen.getByText("What will you build?")).toBeInTheDocument();
  });
});

describe("/biome-buddy/share", () => {
  beforeEach(() => {
    localStorage.clear();
    fakeI18n.language = "en";
    fakeI18n.resolvedLanguage = "en";
  });

  it("build → link → open reproduces the same Buddy: name, parts and derived stats", () => {
    const recipe = starterRecipe("water");
    recipe.traits.nose = "gills";
    recipe.traits.movement = "fins";
    recipe.name = { adjective: "swift", noun: "splasher" };
    renderAt(`/biome-buddy/share#r=${encodeShare(recipe)}`);
    const page = screen.getByTestId("share-valid");
    expect(within(page).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Swift Splasher",
    );
    const parts = within(page).getByRole("heading", { name: "Its parts" })
      .parentElement as HTMLElement;
    expect(within(parts).getByText("Gills & water-nose")).toBeInTheDocument();
    expect(within(parts).getByText("Fins")).toBeInTheDocument();
    const stats = computeStats(recipe);
    expect(
      within(page).getByRole("meter", { name: /^Smell:/ }),
    ).toHaveAttribute("aria-valuenow", String(stats.smell));
    expect(
      within(page).getByRole("meter", { name: /^Agility:/ }),
    ).toHaveAttribute("aria-valuenow", String(stats.agility));
    expect(
      within(page).getByText(/Why this Buddy fits in the Water this way/),
    ).toBeInTheDocument();
    expect(within(page).getByText(/gills pull oxygen/)).toBeInTheDocument();
    expect(
      within(page).getByRole("img", { name: /Swift Splasher, a Water Buddy/ }),
    ).toBeInTheDocument();
    // it is a presentation, not an editor
    expect(within(page).queryByRole("radio")).not.toBeInTheDocument();
    expect(within(page).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("the SAME link renders in the recipient's language from ids alone", () => {
    fakeI18n.resolvedLanguage = "es";
    const recipe = starterRecipe("water");
    recipe.traits.nose = "gills";
    recipe.name = { adjective: "swift", noun: "splasher" };
    renderAt(`/biome-buddy/share#r=${encodeShare(recipe)}`);
    const page = screen.getByTestId("share-valid");
    expect(within(page).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Chapoteador Veloz",
    );
    const parts = within(page).getByRole("heading", { name: "Its parts" })
      .parentElement as HTMLElement;
    expect(
      within(parts).getByText("Branquias y nariz de agua"),
    ).toBeInTheDocument();
    expect(within(page).queryByText(/Gills/)).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("Make my own version links to the game with the SAME payload; the source stays intact", () => {
    const recipe = starterRecipe("fire");
    const enc = encodeShare(recipe);
    renderAt(`/biome-buddy/share#r=${enc}`);
    const remix = screen.getByTestId("share-remix");
    expect(remix.getAttribute("href")).toBe(`/biome-buddy#r=${enc}`);
    expect(screen.getByTestId("share-new").getAttribute("href")).toBe(
      "/biome-buddy",
    );
    fireEvent.click(remix);
    // now in the game as a copy; saving creates a NEW record, the link is unchanged
    expect(
      screen.getByText(/Starting from a shared Buddy/),
    ).toBeInTheDocument();
    expect(localStorage.getItem(GALLERY_KEY)).toBeNull();
    expect(encodeShare(recipe)).toBe(enc);
  });

  it.each([
    ["empty", ""],
    ["garbage", "#r=@@@@"],
    ["oversized", `#r=${"A".repeat(2000)}`],
    [
      "tampered stats",
      `#r=${btoa('{"v":1,"b":"air","t":["no_eyes","pinna","gills","wings","feathers"],"p":"spots","n":["bold","glider"],"s":{"sight":100}}').replace(/=+$/, "")}`,
    ],
    [
      "unknown version",
      `#r=${btoa('{"v":9,"b":"air","t":["no_eyes","pinna","gills","wings","feathers"],"p":"spots","n":["bold","glider"]}').replace(/=+$/, "")}`,
    ],
    [
      "free-text name",
      `#r=${btoa('{"v":1,"b":"air","t":["no_eyes","pinna","gills","wings","feathers"],"p":"spots","n":["Catarina","glider"]}').replace(/=+$/, "")}`,
    ],
  ])("invalid link (%s) fails safely with a way back", (_label, hash) => {
    expect(() => renderAt(`/biome-buddy/share${hash}`)).not.toThrow();
    expect(screen.getByTestId("share-invalid")).toBeInTheDocument();
    expect(
      screen.getByText("Hmm, this link got scrambled"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to Biome Buddy" }),
    ).toHaveAttribute("href", "/biome-buddy");
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });
});

describe("/biome-buddy/review", () => {
  it("shows the reviewer intro and enters the real experience; the example link is a valid share", () => {
    renderAt("/biome-buddy/review");
    expect(screen.getByText("Biome Buddy Prototype")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Build an organism for a biome, see how its adaptations change what it can do/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/unlisted, not private/)).toBeInTheDocument();
    const example = screen.getByTestId("review-example");
    expect(example.getAttribute("href")).toBe(
      `/biome-buddy/share#r=${encodeShare(REVIEW_SAMPLE_RECIPE)}`,
    );
    fireEvent.click(screen.getByTestId("review-start"));
    expect(screen.getByText("What will you build?")).toBeInTheDocument();
  });
});
