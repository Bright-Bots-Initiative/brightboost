import type {
  GreatWorkEngineMeta,
  LevelSpec,
  MachineSpec,
  RunResult,
  SimState,
  TickResult,
} from "./types";
import { createSimState, solved, step } from "./tick";
import { countInstructions, totalCost } from "./scoring";
import { isMirrorOf } from "./matching";
export * from "./types";
export * from "./board";
export * from "./reactions";
export * from "./matching";
export * from "./scoring";
export * from "./validation";
export { createSimState, step, TICK_PHASES } from "./tick";
export const GREAT_WORK_ENGINE_VERSION = "0.1.0-draft.720";
/** Compatibility with the existing health probe and #730 bundle sentinel. */
export const GREAT_WORK_ENGINE_STUB_ID = "greatwork-engine-stub-730";
export function describeGreatWorkEngine(meta: GreatWorkEngineMeta): string {
  return `${meta.id}@${meta.version}`;
}
/** Both public execution paths consume THIS iterator and the SAME step implementation. */
export function* simulate(
  level: LevelSpec,
  program: MachineSpec,
): IterableIterator<SimState> {
  let state = createSimState(level, program);
  while (!state.error && !solved(state)) {
    state = step(state);
    yield state;
  }
}
export function resultOf(state: SimState): RunResult {
  const didSolve = solved(state);
  const mirrored =
    !didSolve &&
    !!state.level.targetProduct &&
    state.produced.some((p) =>
      isMirrorOf(p.molecule, state.level.targetProduct!),
    );
  return {
    solved: didSolve,
    cycles: state.tick,
    cost: totalCost({
      parts: [...state.level.fixedParts, ...state.program.parts],
      tapes: state.program.tapes,
    }),
    area: state.areaClaimed.size,
    instructions: countInstructions(state.program),
    produced: state.produced,
    ...(mirrored ? { mirrored: true } : {}),
    ...(state.error ? { error: state.error } : {}),
  };
}
export function runMachine(level: LevelSpec, program: MachineSpec): RunResult {
  let last: SimState | undefined;
  for (const state of simulate(level, program)) last = state;
  if (!last) throw new Error("GW_MISSING_INITIAL_TICK");
  return resultOf(last);
}
export function* runMachineTraced(
  level: LevelSpec,
  program: MachineSpec,
): IterableIterator<TickResult> {
  for (const state of simulate(level, program))
    yield {
      tick: state.tick,
      board: state.board,
      arms: [...state.arms.values()],
      atoms: [...state.atoms.values()],
      bonds: state.bonds,
      deliveredThisTick: state.deliveredThisTick,
      areaClaimed: state.areaClaimed,
      ...(state.error ? { error: state.error } : {}),
    };
}
