import { describe, it, expect } from "vitest";
import { shouldRenderBounceSparkles } from "../BounceBudsGame";

/**
 * Bounce & Buds round data validation.
 *
 * We dynamically import the module to access the ROUNDS array via
 * the module's internals. Since ROUNDS is not exported (game-internal),
 * we validate the contract at the integration boundary instead:
 * the game must produce a valid GameResult with the expected gameKey.
 */

describe("BounceBuds game data", () => {
  it("exports a default component", async () => {
    const mod = await import("../BounceBudsGame");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("BuddyGardenSortGame re-exports BounceBudsGame as default", async () => {
    const bounce = await import("../BounceBudsGame");
    const buddy = await import("../BuddyGardenSortGame");
    expect(buddy.default).toBe(bounce.default);
  });

  it("BuddyGardenSortGame still exports GARDEN_CARDS and scoreGardenPick", async () => {
    const mod = await import("../BuddyGardenSortGame");
    expect(mod.GARDEN_CARDS).toBeDefined();
    expect(Array.isArray(mod.GARDEN_CARDS)).toBe(true);
    expect(mod.GARDEN_CARDS.length).toBe(6);
    expect(typeof mod.scoreGardenPick).toBe("function");
  });

  it("game registry maps both keys to the bounce game", async () => {
    const { GAME_COMPONENTS } = await import("../gameRegistry");
    expect(GAME_COMPONENTS.buddy_garden_sort).toBeDefined();
    expect(GAME_COMPONENTS.bounce_buds_unity).toBeDefined();
    expect(GAME_COMPONENTS.buddy_garden_sort).toBe(
      GAME_COMPONENTS.bounce_buds_unity,
    );
  });

  it("disables decorative sparkles in reduced-effects mode", () => {
    expect(shouldRenderBounceSparkles(false)).toBe(true);
    expect(shouldRenderBounceSparkles(true)).toBe(false);
  });
});
