/**
 * Compile-time exhaustiveness for DATA_DASH_ATTRS vs DataCard.
 * Lives here (not under src/test) so root `tsc` includes it.
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
