import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { TestProject } from "vitest/node";
import type {
  runMachine,
  runMachineTraced,
} from "../../shared/greatwork-engine";
import {
  GOLDENS,
  serialize,
} from "../../shared/greatwork-engine/__tests__/fixtures";
import { verifySharedFreshness } from "../verify-shared-freshness.mjs";

export default function setup(project: TestProject) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const verdict = verifySharedFreshness(root, { requireBackend: true });
  if (!verdict.ok)
    throw new Error(`GW_STALE_SHARED: ${verdict.findings.join(", ")}`);
  // Match the real emitted backend's depth and package lookup, not a relative dist import.
  const requireBackend = createRequire(
    path.join(root, "backend/dist/src/greatwork-parity.cjs"),
  );
  const resolved = requireBackend.resolve("@brightboost/greatwork-engine");
  delete requireBackend.cache[resolved];
  const engine = requireBackend("@brightboost/greatwork-engine") as {
    runMachine: typeof runMachine;
    runMachineTraced: typeof runMachineTraced;
  };
  project.provide(
    "greatworkGoldenResults",
    GOLDENS.map((f) => ({
      name: f.name,
      result: JSON.stringify(engine.runMachine(f.level, f.program)),
      trace: JSON.stringify(
        serialize([...engine.runMachineTraced(f.level, f.program)]),
      ),
    })),
  );
}
