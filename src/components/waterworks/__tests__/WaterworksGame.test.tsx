import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WaterworksGame from "../WaterworksGame";
import { DRAFT_KEY, GALLERY_KEY, SEEN_KEY } from "../waterworksStorage";
import { TICK_MS } from "../waterworksSim";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { defaultValue?: string; [key: string]: unknown },
    ) => {
      let text = options?.defaultValue ?? key;
      for (const [name, value] of Object.entries(options ?? {})) {
        if (name !== "defaultValue")
          text = text.replaceAll(`{{${name}}}`, String(value));
      }
      return text;
    },
  }),
}));

const seenEverything = {
  help: true,
  placedArrow: true,
  flowArrow: true,
  swipeHint: true,
};

function renderGame() {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seenEverything));
  return render(<WaterworksGame />);
}

function startBand(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function finishAnimation() {
  act(() => {
    vi.runAllTimers();
  });
}

describe("WaterworksGame flow", () => {
  let frameTime = 0;

  beforeEach(() => {
    localStorage.clear();
    frameTime = 0;
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => {
        frameTime += TICK_MS;
        callback(frameTime);
      }, 1),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) =>
      window.clearTimeout(id),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not create an empty draft just by viewing the title", () => {
    render(<WaterworksGame />);
    expect(screen.getByText("Pick your level")).toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("returns Gallery to its origin and keeps a live Resume path", () => {
    renderGame();

    fireEvent.click(screen.getByRole("button", { name: "My Waterworks" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Pick your level")).toBeInTheDocument();

    startBand(/K–2 · Guided/);
    fireEvent.click(screen.getByRole("button", { name: /Field 农田/ }));
    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 5/ }));
    fireEvent.click(screen.getByRole("button", { name: /Levels/ }));

    const resume = screen.getByRole("button", {
      name: "Keep building my river",
    });
    expect(resume).toBeInTheDocument();
    fireEvent.click(resume);
    expect(
      screen.getByRole("group", { name: "River building board" }),
    ).toBeInTheDocument();
  });

  it("autosaves the latest board without publishing it to Gallery", () => {
    renderGame();
    startBand(/K–2 · Guided/);
    fireEvent.click(screen.getByRole("button", { name: /Field 农田/ }));
    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 5/ }));

    fireEvent.click(screen.getByRole("button", { name: "My Waterworks" }));

    const gallery = JSON.parse(
      localStorage.getItem(GALLERY_KEY) ?? "[]",
    ) as unknown[];
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as {
      id: string | null;
      cells: Array<Array<{ t: string }>>;
    };
    expect(gallery).toHaveLength(0);
    expect(draft.cells[4][4].t).toBe("field");
    expect(draft.id).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("button", { name: /Row 5, column 5: field/i }),
    ).toBeInTheDocument();
  });

  it("keeps unsaved edits in the live draft when its saved card is reopened", () => {
    renderGame();
    startBand(/K–2 · Guided/);
    fireEvent.click(screen.getByRole("button", { name: /Field 农田/ }));
    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Name your river!" }),
      {
        target: { value: "Saved River" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save it!" }));

    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 6/ }));
    fireEvent.click(screen.getByRole("button", { name: "My Waterworks" }));

    const gallery = JSON.parse(
      localStorage.getItem(GALLERY_KEY) ?? "[]",
    ) as Array<{
      cells: Array<Array<{ t: string }>>;
    }>;
    expect(gallery[0].cells[4][5].t).toBe("land");

    fireEvent.click(screen.getByRole("button", { name: "Open Saved River" }));
    expect(
      screen.getByRole("button", { name: /Row 5, column 6: field/i }),
    ).toBeInTheDocument();
  });

  it("shows an earned-part announcement before Reflect", () => {
    renderGame();
    startBand(/K–2 · Guided/);
    fireEvent.click(screen.getByRole("button", { name: /Field 农田/ }));
    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 5/ }));
    fireEvent.click(screen.getByRole("button", { name: /Let it flow/ }));

    finishAnimation();

    expect(
      screen.getByText(/You earned a new part: Fish Mouth/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Keep building" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tap to try it!" }));
    expect(
      screen.getByRole("button", { name: "Keep building" }),
    ).toBeInTheDocument();
  });

  it("locks state-changing controls for the duration of a run", () => {
    renderGame();
    startBand(/Grades 3–5/);
    fireEvent.click(screen.getByRole("button", { name: /Let it flow/ }));

    expect(screen.getByRole("button", { name: "Rain" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Show me ideas/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "My Waterworks" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Dismiss suggestion" }),
    ).toBeDisabled();

    finishAnimation();
    expect(screen.getByRole("button", { name: "Rain" })).toBeEnabled();
  });

  it("does not snap the first board swipe back to the source", () => {
    localStorage.setItem(
      SEEN_KEY,
      JSON.stringify({ ...seenEverything, swipeHint: false }),
    );
    render(<WaterworksGame />);
    startBand(/K–2 · Guided/);

    const scroller = document.querySelector<HTMLElement>(".ww-board-scroll");
    expect(scroller).not.toBeNull();
    Object.defineProperties(scroller!, {
      scrollWidth: { configurable: true, value: 667 },
      clientWidth: { configurable: true, value: 320 },
    });
    fireEvent(window, new Event("resize"));
    expect(
      screen.getByRole("button", { name: "Dismiss swipe hint" }),
    ).toBeInTheDocument();

    scroller!.scrollLeft = 120;
    fireEvent.scroll(scroller!);
    expect(scroller!.scrollLeft).toBe(120);
  });

  it("warns when the working draft cannot be autosaved", () => {
    renderGame();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    startBand(/K–2 · Guided/);

    expect(screen.getByText(/Autosave is unavailable/)).toBeInTheDocument();
  });

  it("does not let an Open-band run pre-unlock Guided parts", () => {
    renderGame();
    startBand(/Grades 6–8 · Open/);

    fireEvent.click(screen.getByRole("button", { name: /Show me ideas/ }));
    const usePattern = screen.getAllByRole("button", {
      name: "Build from this",
    })[0];
    fireEvent.click(usePattern);
    fireEvent.click(screen.getByRole("button", { name: "Replace my river?" }));
    fireEvent.click(screen.getByRole("button", { name: /Let it flow/ }));
    finishAnimation();
    fireEvent.click(screen.getByRole("button", { name: "Keep building" }));

    fireEvent.click(screen.getByRole("button", { name: /Levels/ }));
    startBand(/K–2 · Guided/);

    expect(
      screen.queryByRole("button", { name: /Fish Mouth 鱼嘴/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Bottle-Neck 宝瓶口/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps a quota-mode save in the in-memory Gallery", () => {
    renderGame();
    startBand(/K–2 · Guided/);
    fireEvent.click(screen.getByRole("button", { name: /Field 农田/ }));
    fireEvent.click(screen.getByRole("button", { name: /Row 5, column 5/ }));

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Name your river!" }),
      {
        target: { value: "Overflow River" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save it!" }));
    fireEvent.click(screen.getByRole("button", { name: "My Waterworks" }));

    expect(
      screen.getByRole("button", { name: "Open Overflow River" }),
    ).toBeInTheDocument();
  });
});
