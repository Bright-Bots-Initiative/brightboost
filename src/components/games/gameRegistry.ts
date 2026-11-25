import { lazy, type ComponentType } from "react";
import type { GameResult } from "./shared/GameShell";
const BioTrailActivity = lazy(() => import("./BioTrailActivity"));
const QubitCoveActivity = lazy(() => import("./QubitCoveActivity"));
const SparBotsActivity = lazy(() => import("./SparBotsActivity"));

// Lazy-loaded game components
const BoostPathPlannerGame = lazy(() => import("./BoostPathPlannerGame"));
const RhymeRideGame = lazy(() => import("./RhymeRideGame"));
const BounceBudsGame = lazy(() => import("./BounceBudsGame"));
const GotchaGearsGame = lazy(() => import("./GotchaGearsGame"));
const MazeMapsGame = lazy(() => import("./MazeMapsGame"));
const MoveMeasureGame = lazy(() => import("./MoveMeasureGame"));
const SkyShieldGame = lazy(() => import("./SkyShieldGame"));
const FastLaneGame = lazy(() => import("./FastLaneGame"));
const QualifyTuneRaceGame = lazy(() => import("./QualifyTuneRaceGame"));
const TankTrekGame = lazy(() => import("./TankTrekGame"));
const QuantumQuestGame = lazy(() => import("./QuantumQuestGame"));
const DataDashSortDiscoverGame = lazy(
  () => import("./DataDashSortDiscoverGame"),
);
const GreatWorkActivity = lazy(() => import("./greatWork/GreatWorkActivity"));
const TrackMakerGame = lazy(() => import("./TrackMakerGame"));
const EchoAvenueGame = lazy(() => import("./echoAvenue/EchoAvenueGame"));

export type ActivityFinishResult = void | boolean | Promise<void | boolean>;
export type StudioCompletion = {
  gameKey: "great_work";
  greatWorkSave: { id: string; revision: number };
};

type GameProps = {
  config?: any;
  onComplete?: (result: GameResult | StudioCompletion) => ActivityFinishResult;
};

/**
 * Registry mapping gameKey values to React game components.
 * Old slugs are aliased to new implementations so existing assignments
 * continue to resolve correctly.
 */
export const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  // ── Primary keys (current canonical names) ──
  boost_path_planner: BoostPathPlannerGame, // "Boost's Lost Steps"
  rhymo_rhyme_rocket: RhymeRideGame, // "Rhyme & Ride" (lane-based redesign)
  buddy_garden_sort: BounceBudsGame, // "Bounce & Buds" (restored paddle-ball game)
  gotcha_gears_unity: GotchaGearsGame, // "Gotcha Gears" (now React)
  tank_trek: TankTrekGame, // "Tank Trek" (Set 1)
  quantum_quest: QuantumQuestGame, // "Quantum Quest"
  data_dash_sort_discover: DataDashSortDiscoverGame, // "Data Dash: Sort & Discover" (G3-5)

  // ── Set 2 keys ──
  maze_maps: MazeMapsGame, // "Maze Maps & Smart Paths" (Set 2)
  move_measure: MoveMeasureGame, // "Move, Measure & Improve" (Set 2)
  sky_shield: SkyShieldGame, // "Sky Shield Patterns" (Set 2)
  fast_lane: FastLaneGame, // "Fast Lane Signals" (Set 2)
  qualify_tune_race: QualifyTuneRaceGame, // "Qualify, Tune, Race" (Set 2)

  // Advanced games are independently gated by server specialty state.
  qubit_cove: QubitCoveActivity,
  biotrail: BioTrailActivity,
  sparbots: SparBotsActivity,

  // ── Set 3 keys ──
  great_work: GreatWorkActivity,
  track_maker: TrackMakerGame, // "Boost Track Builder" (Set 3, gated)
  echo_avenue: EchoAvenueGame, // "Echo Avenue" (Set 3, gated)

  // ── Legacy / alias keys → same implementations ──
  sequence_drag_drop: BoostPathPlannerGame,
  rhyme_ride_unity: RhymeRideGame,
  bounce_buds_unity: BounceBudsGame,
};
