import { describe, it, expect } from "vitest";

describe("MazeMaps game", () => {
  it("exports a default component", async () => {
    const mod = await import("../MazeMapsGame");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("is registered in the game registry under maze_maps", async () => {
    const { GAME_COMPONENTS } = await import("../gameRegistry");
    expect(GAME_COMPONENTS.maze_maps).toBeDefined();
  });

  it("does not expose trademarked names in the component module", async () => {
    // Read the source as a string to verify no Pac-Man references leak
    const mod = await import("../MazeMapsGame");
    const src = mod.default.toString();
    expect(src).not.toContain("Pac-Man");
    expect(src).not.toContain("pac-man");
    expect(src).not.toContain("pacman");
  });
});
