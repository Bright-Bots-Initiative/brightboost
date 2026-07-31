import {
  GREAT_WORK_ENGINE_STUB_ID,
  describeGreatWorkEngine,
} from "../../shared/dist/greatwork-engine";

/** Probe: backend consumes the separately emitted shared engine (S-2 / #730). */
export const sharedEngineProbeLabel = describeGreatWorkEngine({
  id: GREAT_WORK_ENGINE_STUB_ID,
  version: "0.0.0",
});
