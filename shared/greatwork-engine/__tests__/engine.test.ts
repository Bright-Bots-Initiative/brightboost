import { describe, it, expect, inject } from "vitest";
import { runMachine, runMachineTraced } from "@shared/greatwork-engine";
import { cases } from "./contract-cases";
import { GOLDENS, serialize } from "./fixtures";
declare module "vitest" {
  export interface ProvidedContext {
    greatworkGoldenResults: Array<{
      name: string;
      result: string;
      trace: string;
    }>;
  }
}
describe("#720 deterministic engine", () => {
  for (const fixture of cases) it(fixture.name, fixture.run);
});
describe("#720 frontend-source / backend-package parity", () => {
  const expected = inject("greatworkGoldenResults");
  for (const fixture of GOLDENS) {
    it(`${fixture.name}: results and every trace tick match backend emit`, () => {
      const baseline = expected.find((e) => e.name === fixture.name);
      expect(baseline).toBeDefined();
      expect(JSON.stringify(runMachine(fixture.level, fixture.program))).toBe(
        baseline!.result,
      );
      expect(
        JSON.stringify(
          serialize([...runMachineTraced(fixture.level, fixture.program)]),
        ),
      ).toBe(baseline!.trace);
    });
  }
});
