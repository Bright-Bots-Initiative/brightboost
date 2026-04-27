import type { ComponentType } from "react";
import type { GameResult } from "./shared/GameShell";

// Lazy-loaded game components
import BoostPathPlannerGame from "./BoostPathPlannerGame";
import RhymeRideGame from "./RhymeRideGame";
import BounceBudsGame from "./BounceBudsGame";
import GotchaGearsGame from "./GotchaGearsGame";
import MazeMapsGame from "./MazeMapsGame";
import MoveMeasureGame from "./MoveMeasureGame";
import SkyShieldGame from "./SkyShieldGame";
import FastLaneGame from "./FastLaneGame";
import QualifyTuneRaceGame from "./QualifyTuneRaceGame";
import TankTrekGame from "./TankTrekGame";
import QuantumQuestGame from "./QuantumQuestGame";
import DataDashSortDiscoverGame from "./DataDashSortDiscoverGame";

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
  buddy_garden_sort: BounceBudsGame,            // "Bounce & Buds" (restored paddle-ball game)
  gotcha_gears_unity: GotchaGearsGame,         // "Gotcha Gears" (now React)
  tank_trek: TankTrekGame,                     // "Tank Trek" (Set 1)
  quantum_quest: QuantumQuestGame,             // "Quantum Quest"
  data_dash_sort_discover: DataDashSortDiscoverGame, // "Data Dash: Sort & Discover" (G3-5)

  // ── Set 2 keys ──
  maze_maps: MazeMapsGame,                      // "Maze Maps & Smart Paths" (Set 2)
  move_measure: MoveMeasureGame,                // "Move, Measure & Improve" (Set 2)
  sky_shield: SkyShieldGame,                    // "Sky Shield Patterns" (Set 2)
  fast_lane: FastLaneGame,                      // "Fast Lane Signals" (Set 2)
  qualify_tune_race: QualifyTuneRaceGame,       // "Qualify, Tune, Race" (Set 2)

  // ── Legacy / alias keys → same implementations ──
  sequence_drag_drop: BoostPathPlannerGame,
  rhyme_ride_unity: RhymeRideGame,
  bounce_buds_unity: BounceBudsGame,
};
