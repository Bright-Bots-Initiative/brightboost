/**
 * Maze Maps fit-to-width guard (#793).
 *
 * The 7x7 main map is `7 * MAZE_CELL` = 364px of absolutely-positioned cells.
 * Student chrome removes ~80px before the game ever sees the viewport
 * (`StudentLayout` main `p-4` = 32px + the `ActivityPlayer` INTERACT branch's
 * `p-6` = 48px), so a 375px phone hands the board ~295px and a 320px phone
 * ~240px. Without fit-to-width the right-hand columns are clipped by the
 * board's `overflow-hidden` with no scroll fallback, and the goal tile at
 * [0, cols - 1] is the first thing to disappear — the learner cannot see
 * where Byte Bot has to end up.
 *
 * These tests pin the fix as a property: whatever the available width, the
 * goal tile's rendered right edge stays inside the visible board box.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { MazeBoard, MAZE_CELL, mazeBoardScale, MAPS_k2 } from "../MazeMapsGame";
import { MAPS_G3_5 } from "../gradeBandContent";

type StubEntry = { contentRect: { width: number } };
type StubCallback = (entries: StubEntry[]) => void;

let observerCallbacks: StubCallback[] = [];

/**
 * jsdom ships no ResizeObserver and does no layout, so the width the board
 * would measure in a browser is injected by hand here.
 */
class StubResizeObserver {
  constructor(cb: StubCallback) {
    observerCallbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  observerCallbacks = [];
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The board layer carrying the fit-to-width transform, if there is one. */
function scaledLayer(container: HTMLElement): HTMLElement | null {
  const all = container.querySelectorAll<HTMLElement>("*");
  return (
    Array.from(all).find((el) => /scale\([\d.]+\)/.test(el.style.transform)) ??
    null
  );
}

/**
 * Scale actually applied to the board layer. The component always writes the
 * transform (scale(1) included), so a missing layer means the fix is gone —
 * throw rather than default to 1, or the anti-over-shrink guards would pass
 * against a board with no transform at all (#793 review N4).
 */
function appliedScale(container: HTMLElement): number {
  const layer = scaledLayer(container);
  const match = layer && /scale\(([\d.]+)\)/.exec(layer.style.transform);
  if (!match) throw new Error("expected a board layer carrying scale(...)");
  return Number(match[1]);
}

function renderBoardAt(availableWidth: number, map = MAPS_k2.main) {
  const view = render(
    <MazeBoard
      map={map}
      playerPos={map.start}
      collectedOrbs={new Set<string>()}
      sweeperPositions={{}}
    />,
  );
  act(() => {
    for (const cb of observerCallbacks) {
      cb([{ contentRect: { width: availableWidth } }]);
    }
  });
  return view;
}

/** Right edge of the goal tile in rendered (post-scale) pixels. */
function goalTileRightEdge(container: HTMLElement): number {
  const cell = screen.getByText("🏁").parentElement;
  if (!cell) throw new Error("goal tile has no cell element");
  const left = Number.parseFloat(cell.style.left);
  const width = Number.parseFloat(cell.style.width);
  return (left + width) * appliedScale(container);
}

// A 320px phone is the narrowest device we target; the ~80px of student chrome
// above leaves the board this much room.
const NARROWEST_AVAILABLE = 240;

describe("Maze Maps board fits the available width (#793)", () => {
  it.each([
    ["320px phone", NARROWEST_AVAILABLE],
    ["375px phone", 295],
    ["360px container", 360],
  ])(
    "keeps the goal tile visible on a %s",
    (_label, availableWidth: number) => {
      const { container } = renderBoardAt(availableWidth);
      expect(goalTileRightEdge(container)).toBeLessThanOrEqual(availableWidth);
    },
  );

  it.each([NARROWEST_AVAILABLE, 295, 360])(
    "keeps the whole board inside %ipx of available width",
    (availableWidth: number) => {
      const { container } = renderBoardAt(availableWidth);
      const map = MAPS_k2.main;
      const scale = appliedScale(container);
      expect(map.cols * MAZE_CELL * scale).toBeLessThanOrEqual(availableWidth);
      // The visible box must be sized to the scaled board, not left at the
      // unscaled width (#793 review N5/N6: assert the BOX's width; height
      // against a width budget was tautological on square maps).
      const box = scaledLayer(container)?.parentElement;
      if (!box) throw new Error("expected a scaled board layer inside a box");
      expect(Number.parseFloat(box.style.width)).toBeCloseTo(
        map.cols * MAZE_CELL * scale,
        5,
      );
    },
  );

  it("clips nothing vertically — the board box matches the scaled height", () => {
    const { container } = renderBoardAt(NARROWEST_AVAILABLE);
    const box = scaledLayer(container)?.parentElement;
    if (!box) throw new Error("expected a scaled board layer inside a box");
    const scale = appliedScale(container);
    expect(Number.parseFloat(box.style.height)).toBeCloseTo(
      MAPS_k2.main.rows * MAZE_CELL * scale,
      5,
    );
  });

  it("does not shrink when there is room for full-size cells", () => {
    const { container } = renderBoardAt(400);
    expect(appliedScale(container)).toBe(1);
    expect(goalTileRightEdge(container)).toBe(MAPS_k2.main.cols * MAZE_CELL);
  });

  it("fits the smaller tutorial map without scaling it on a phone", () => {
    // 4 cols = 208px, already inside 240px — the fix must not shrink it.
    const { container } = renderBoardAt(NARROWEST_AVAILABLE, MAPS_k2.tutorial);
    expect(appliedScale(container)).toBe(1);
  });

  it("re-fits when the map grows mid-game without a remount (#793 review B1)", () => {
    // The child reaches the 7x7 main map from the smaller phases IN PLACE —
    // same JSX position, no remount — so the [w] effect dependency is the
    // only thing that re-measures. This is the exact scenario the issue was
    // filed about, and it survived every other test when [w] was mutated to
    // []: the stale observer closure computed scale from the SMALL map's
    // width (min(240/208, 1) = 1) and the grown board clipped again.
    const view = renderBoardAt(NARROWEST_AVAILABLE, MAPS_k2.tutorial);
    expect(appliedScale(view.container)).toBe(1);

    view.rerender(
      <MazeBoard
        map={MAPS_k2.main}
        playerPos={MAPS_k2.main.start}
        collectedOrbs={new Set<string>()}
        sweeperPositions={{}}
      />,
    );
    act(() => {
      for (const cb of observerCallbacks) {
        cb([{ contentRect: { width: NARROWEST_AVAILABLE } }]);
      }
    });

    const boardW = MAPS_k2.main.cols * MAZE_CELL;
    expect(appliedScale(view.container)).toBeCloseTo(
      NARROWEST_AVAILABLE / boardW,
      5,
    );
    expect(goalTileRightEdge(view.container)).toBeLessThanOrEqual(
      NARROWEST_AVAILABLE,
    );
  });

  it("fits the g3_5 band's 7x7 main map on a phone", () => {
    // The responsive suite otherwise exercised only the k2 maps; the g3_5
    // band grows 6x6 -> 6x6 -> 7x7 and must fit the same 240px.
    const { container } = renderBoardAt(NARROWEST_AVAILABLE, MAPS_G3_5.main);
    const scale = appliedScale(container);
    expect(MAPS_G3_5.main.cols * MAZE_CELL * scale).toBeLessThanOrEqual(
      NARROWEST_AVAILABLE,
    );
    expect(goalTileRightEdge(container)).toBeLessThanOrEqual(
      NARROWEST_AVAILABLE,
    );
  });
});

describe("mazeBoardScale", () => {
  const BOARD = MAPS_k2.main.cols * MAZE_CELL; // 364

  it("never scales up past 1", () => {
    expect(mazeBoardScale(BOARD, BOARD)).toBe(1);
    expect(mazeBoardScale(400, BOARD)).toBe(1);
    expect(mazeBoardScale(1024, BOARD)).toBe(1);
  });

  it.each([360, 320, NARROWEST_AVAILABLE])(
    "fits the board into %ipx",
    (available: number) => {
      const scale = mazeBoardScale(available, BOARD);
      expect(scale).toBeLessThan(1);
      expect(BOARD * scale).toBeLessThanOrEqual(available);
    },
  );

  it("falls back to 1 for an unmeasured or nonsense width", () => {
    expect(mazeBoardScale(0, BOARD)).toBe(1);
    expect(mazeBoardScale(-10, BOARD)).toBe(1);
    expect(mazeBoardScale(Number.NaN, BOARD)).toBe(1);
    expect(mazeBoardScale(240, 0)).toBe(1);
  });

  it("keeps cells legible at the narrowest realistic width", () => {
    // 240 / 364 -> ~34px cells. The board is display-only (movement is the
    // 56px D-pad and the arrow keys), so this costs no tap-target size;
    // guard it anyway so a future MAZE_CELL bump has to re-check the maths.
    const cell = MAZE_CELL * mazeBoardScale(NARROWEST_AVAILABLE, BOARD);
    expect(cell).toBeGreaterThanOrEqual(32);
  });
});
