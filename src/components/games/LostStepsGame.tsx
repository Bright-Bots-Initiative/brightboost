/**
 * Boost's Lost Steps — semantic alias for the path-planner game.
 *
 * The underlying gameplay (sequence/plan commands to reach a goal)
 * is the same concept under both names.  This re-export keeps the
 * game registry and import graph clean.
 */
export { default } from "./BoostPathPlannerGame";
