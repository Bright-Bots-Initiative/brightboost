import { describe, expect, it } from "vitest";
import {
  GREAT_WORK_ENGINE_STUB_ID,
  describeGreatWorkEngine,
} from "@shared/greatwork-engine";

describe("shared/greatwork-engine contract", () => {
  it("exports the stub id constant", () => {
    expect(GREAT_WORK_ENGINE_STUB_ID).toBe("greatwork-engine-stub-730");
  });

  it("describeGreatWorkEngine joins id and version with @", () => {
    expect(
      describeGreatWorkEngine({
        id: GREAT_WORK_ENGINE_STUB_ID,
        version: "0.0.0",
      }),
    ).toBe("greatwork-engine-stub-730@0.0.0");
  });
});
