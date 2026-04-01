import type { ComponentType } from "react";
import type { GameResult } from "./shared/GameShell";

// Lazy-loaded game components
import BoostPathPlannerGame from "./BoostPathPlannerGame";
import RhymeRideGame from "./RhymeRideGame";
import BuddyGardenSortGame from "./BuddyGardenSortGame";
import GotchaGearsGame from "./GotchaGearsGame";

type GameProps = {
  config?: any;
  onComplete?: (result: GameResult) => void;
};

/**
 * Registry mapping gameKey values to React game components.
 * Old slugs are aliased to new implementations so existing assignments
 * continue to resolve correctly.
 */
export const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  // ── Primary keys (current canonical names) ──
  boost_path_planner: BoostPathPlannerGame,   // "Boost's Lost Steps"
  rhymo_rhyme_rocket: RhymeRideGame,          // "Rhyme & Ride" (lane-based redesign)
  buddy_garden_sort: BuddyGardenSortGame,     // "Bounce & Buds"
  gotcha_gears_unity: GotchaGearsGame,         // "Gotcha Gears" (now React)

  // ── Legacy / alias keys → same implementations ──
  sequence_drag_drop: BoostPathPlannerGame,
  rhyme_ride_unity: RhymeRideGame,
  bounce_buds_unity: BuddyGardenSortGame,
};
