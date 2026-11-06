import { describe, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guardCases } from "../greatwork/guard-cases.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
describe("#720 emitted shared-code freshness guard", () => {
  for (const fixture of guardCases(root)) it(fixture.name, fixture.run, 30000);
});
