import type { ComponentType } from "react";
import type { GameResult } from "./shared/GameShell";

// Lazy-loaded game components
import BoostPathPlannerGame from "./BoostPathPlannerGame";
import RhymoRhymeRocketGame from "./RhymoRhymeRocketGame";
import BuddyGardenSortGame from "./BuddyGardenSortGame";

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
  // New React games (primary keys)
  boost_path_planner: BoostPathPlannerGame,
  rhymo_rhyme_rocket: RhymoRhymeRocketGame,
  buddy_garden_sort: BuddyGardenSortGame,

  // Old slug aliases → new React implementations
  sequence_drag_drop: BoostPathPlannerGame,
  rhyme_ride_unity: RhymoRhymeRocketGame,
  bounce_buds_unity: BuddyGardenSortGame,
};
