import type { GreatWorkEngineMeta } from "./types";

/** Exported constant — must survive frontend and backend emit. */
export const GREAT_WORK_ENGINE_STUB_ID = "greatwork-engine-stub-730";

/**
 * Pure, deterministic, ES2019-compatible — no I/O, no DOM, no import.meta.
 */
export function describeGreatWorkEngine(meta: GreatWorkEngineMeta): string {
  return `${meta.id}@${meta.version}`;
}

export type { GreatWorkEngineMeta } from "./types";
