/**
 * Compile-time exhaustiveness for DATA_DASH_ATTRS vs DataCard.
 *
 * This assertion MUST live under src/ and outside src/test.
 * Root tsconfig sets include: ["src"] but excludes src/test and **/*.test.ts,
 * so an assertion placed in the test file is never seen by `tsc --noEmit`
 * and silently does nothing. See PR #719 review.
 *
 * When typecheck fails naming a field (e.g. Type '"weight"' does not satisfy
 * 'never'):
 * - Shared across FE cards and BE DATA_DASH_POOL → add it to DATA_DASH_ATTRS
 *   (and both pools).
 * - Frontend-only display/asset → add it to the Omit list below AND to
 *   FE_SIDE_ONLY_KEYS in src/test/dataDashPoolSync.test.ts.
 * The Omit list is itself hand-maintained — choose deliberately; don't just
 * silence the red.
 *
 * Keep the Omit list identical to FE_SIDE_ONLY_KEYS in dataDashPoolSync.test.ts.
 */
import type { DataCard } from "./DataDashSortDiscoverGame";
import { DATA_DASH_ATTRS } from "../../../backend/src/services/dataDashChallenge";

type ComparableCardAttr = keyof Omit<DataCard, "id" | "name" | "plantBed">;

type AssertNever<T extends never> = T;
export type AllComparableAttrsCovered = AssertNever<
  Exclude<ComparableCardAttr, (typeof DATA_DASH_ATTRS)[number]>
>;
export type NoExtraAttrsListed = AssertNever<
  Exclude<(typeof DATA_DASH_ATTRS)[number], ComparableCardAttr>
>;
